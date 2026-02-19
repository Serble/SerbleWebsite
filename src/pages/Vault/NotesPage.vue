<script>
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import {
  getNotes, getNoteContent, updateNoteContent, createNote, deleteNote
} from '@/assets/js/serble.js';
import {
  encrypt, decrypt, loadPasswords, savePasswords
} from '@/assets/js/vaultCrypto.js';

const ENCRYPTION_HEADER = '------BEGIN ENCRYPTED NOTE-----\n';

export default {
  setup() {
    ensureLoggedIn();
    const route = useRoute();
    const router = useRouter();

    // ── State ──
    const noteIds       = ref([]);        // ordered list of note IDs
    const noteTitles    = ref({});        // { id: title }
    const noteSummaries = ref({});        // { id: summary }
    const loadedContent = ref({});        // { id: rawContent }
    const passwords     = ref(loadPasswords());

    const currentId         = ref(null);
    const currentRaw        = ref('');    // raw content from server
    const decryptedContent  = ref(null);  // non-null when decrypted or plain
    const isEncrypted       = ref(false);
    const isEmptyEncrypted  = ref(false); // encrypted but no ciphertext yet
    const passwordInput     = ref('');
    const wrongAttempts     = ref(0);

    const saveState = ref('idle'); // 'idle' | 'dirty' | 'saving' | 'saved'
    const loading   = ref(true);
    const sidebarOpen = ref(false);

    // ── Helpers ──
    function titleFromContent(content) {
      const plain = content.startsWith(ENCRYPTION_HEADER)
        ? content.slice(ENCRYPTION_HEADER.length)
        : content;
      const line = plain.split('\n')[0].trim();
      return line || null;
    }

    function summaryFromContent(content) {
      if (!content) return 'Empty note';
      const plain = content.startsWith(ENCRYPTION_HEADER)
        ? content.slice(ENCRYPTION_HEADER.length)
        : content;
      const flat = plain.replace(/\n/g, ' ').trim();
      return flat.length > 80 ? flat.slice(0, 80) + '…' : (flat || 'Empty note');
    }

    function setMeta(id, rawOrDecrypted) {
      const title = titleFromContent(rawOrDecrypted);
      noteTitles.value  = { ...noteTitles.value,  [id]: title || id };
      noteSummaries.value = { ...noteSummaries.value, [id]: summaryFromContent(rawOrDecrypted) };
    }

    // ── Load all notes ──
    async function loadAll(activateId = null) {
      const res = await getNotes();
      if (!res.success) return;
      noteIds.value = res.notes ?? [];
      loading.value = false;

      const target = activateId ?? route.query.note ?? null;
      if (target && noteIds.value.includes(target)) {
        await openNote(target);
      } else if (noteIds.value.length > 0 && !currentId.value) {
        await openNote(noteIds.value[0]);
      }

      // Background-load metadata for sidebar
      noteIds.value.forEach(id => {
        if (!loadedContent.value[id]) loadNoteBackground(id);
      });
    }

    async function loadNoteBackground(id) {
      const res = await getNoteContent(id);
      if (!res.success) return;
      const raw = res.content ?? '';
      loadedContent.value = { ...loadedContent.value, [id]: raw };

      // Try auto-decrypt for sidebar summary
      if (raw.startsWith(ENCRYPTION_HEADER) && passwords.value[id]) {
        try {
          const dec = await decrypt(raw.slice(ENCRYPTION_HEADER.length), passwords.value[id]);
          setMeta(id, dec);
          return;
        } catch { /* wrong cached password */ }
      }
      setMeta(id, raw);
    }

    // ── Open a note ──
    async function openNote(id) {
      saveState.value = 'idle';
      decryptedContent.value = null;
      wrongAttempts.value = 0;
      passwordInput.value = '';
      currentId.value = id;
      sidebarOpen.value = false;

      // Update URL
      router.replace({ query: { note: id } });

      let raw = loadedContent.value[id];
      if (raw === undefined) {
        const res = await getNoteContent(id);
        if (!res.success) return;
        raw = res.content ?? '';
        loadedContent.value = { ...loadedContent.value, [id]: raw };
      }

      currentRaw.value = raw;
      isEncrypted.value = raw.startsWith(ENCRYPTION_HEADER);
      isEmptyEncrypted.value = raw === ENCRYPTION_HEADER;

      if (isEncrypted.value && passwords.value[id]) {
        // Auto-decrypt with cached password
        await tryDecrypt(passwords.value[id], false);
      } else if (!isEncrypted.value) {
        decryptedContent.value = raw;
      }

      setMeta(id, decryptedContent.value ?? raw);
    }

    // ── Decrypt ──
    async function tryDecrypt(password, fromInput = true) {
      try {
        const cipher = currentRaw.value.slice(ENCRYPTION_HEADER.length);
        const plain = await decrypt(cipher, password);
        decryptedContent.value = plain;
        passwords.value = { ...passwords.value, [currentId.value]: password };
        savePasswords(passwords.value);
        passwordInput.value = '';
        wrongAttempts.value = 0;
        setMeta(currentId.value, plain);
      } catch {
        if (fromInput) wrongAttempts.value++;
      }
    }

    async function submitDecrypt() {
      await tryDecrypt(passwordInput.value, true);
    }

    // ── Set password (new encrypted note) ──
    async function setPassword() {
      const pw = passwordInput.value;
      if (!pw) return;
      passwords.value = { ...passwords.value, [currentId.value]: pw };
      savePasswords(passwords.value);
      passwordInput.value = '';
      await doSave('Welcome to your encrypted note!');
      await loadNoteBackground(currentId.value);
      await openNote(currentId.value);
    }

    // ── Save ──
    function markDirty() {
      if (saveState.value === 'idle' || saveState.value === 'saved') {
        saveState.value = 'dirty';
      }
    }

    async function doSave(overrideContent = null) {
      if (!currentId.value) return;
      saveState.value = 'saving';

      let text = overrideContent ?? decryptedContent.value ?? '';

      if (isEncrypted.value && passwords.value[currentId.value]) {
        text = ENCRYPTION_HEADER + await encrypt(text, passwords.value[currentId.value]);
      }

      const res = await updateNoteContent(currentId.value, text);
      if (!res.success) { saveState.value = 'dirty'; return; }

      // Update cache
      loadedContent.value = { ...loadedContent.value, [currentId.value]: text };
      currentRaw.value = text;
      saveState.value = 'saved';
      setMeta(currentId.value, decryptedContent.value ?? text);
    }

    // ── New note ──
    async function newNote(encrypted) {
      const res = await createNote();
      if (!res.success) return;
      const id = res.noteId;
      if (!id) {
        console.error('createNote returned no noteId', res);
        return;
      }

      if (encrypted) {
        const saveRes = await updateNoteContent(id, ENCRYPTION_HEADER);
        if (!saveRes.success) {
          console.error('Failed to write encryption header to new note');
          return;
        }
        loadedContent.value = { ...loadedContent.value, [id]: ENCRYPTION_HEADER };
      } else {
        loadedContent.value = { ...loadedContent.value, [id]: '' };
      }

      await loadAll(id);
    }

    // ── Delete note ──
    async function removeNote(id, e) {
      e.stopPropagation();
      const res = await deleteNote(id);
      if (!res.success) return;

      const newLoaded = { ...loadedContent.value };
      delete newLoaded[id];
      loadedContent.value = newLoaded;

      await loadAll(currentId.value === id ? null : currentId.value);
      if (currentId.value === id) {
        currentId.value = noteIds.value[0] ?? null;
        if (currentId.value) await openNote(currentId.value);
      }
    }

    // ── Computed ──
    const saveLabel = computed(() => {
      if (saveState.value === 'saving') return 'Saving…';
      if (saveState.value === 'saved')  return 'Saved!';
      if (saveState.value === 'dirty')  return 'Save';
      return 'Save';
    });

    // Load on mount
    loadAll();

    return {
      noteIds, noteTitles, noteSummaries, loadedContent, currentId,
      isEncrypted, isEmptyEncrypted, decryptedContent,
      passwordInput, wrongAttempts, saveState, saveLabel,
      loading, sidebarOpen,
      openNote, submitDecrypt, setPassword,
      markDirty, doSave, newNote, removeNote,
    };
  }
};
</script>

<template>
  <div class="notes-layout">

    <!-- Sidebar toggle (mobile) -->
    <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen" :class="{ open: sidebarOpen }">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
      </svg>
    </button>

    <!-- Sidebar -->
    <aside class="notes-sidebar" :class="{ 'sidebar-visible': sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1"/>
            <path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2z"/>
          </svg>
          {{ $t('notes') }}
        </span>
      </div>

      <!-- Note list -->
      <div class="note-list">
        <div v-if="loading" class="note-list-loading">
          <span class="text-muted">{{ $t('loading') }}</span>
        </div>
        <button
          v-for="id in noteIds"
          :key="id"
          class="note-item"
          :class="{ 'note-item-active': currentId === id }"
          @click="openNote(id)"
        >
          <div class="note-item-top">
            <span class="note-item-title">
              <svg v-if="(loadedContent[id] || '').startsWith('------BEGIN ENCRYPTED')"
                xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor"
                viewBox="0 0 16 16" class="lock-icon me-1">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
              </svg>
              {{ noteTitles[id] || id }}
            </span>
            <button class="note-delete-btn" @click="removeNote(id, $event)" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
              </svg>
            </button>
          </div>
          <p class="note-item-summary">{{ noteSummaries[id] || 'Click to load…' }}</p>
        </button>
      </div>

      <!-- New note buttons -->
      <div class="sidebar-actions">
        <button class="sidebar-btn sidebar-btn-primary" @click="newNote(false)">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
          </svg>
          {{ $t('new-note') }}
        </button>
        <button class="sidebar-btn sidebar-btn-lock" @click="newNote(true)">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
          </svg>
          {{ $t('new-encrypted-note') }}
        </button>
      </div>
    </aside>

    <!-- Editor area -->
    <div class="notes-editor">

      <!-- No note selected -->
      <div v-if="!currentId" class="editor-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" class="opacity-25 mb-3" viewBox="0 0 16 16">
          <path d="M5 1a2 2 0 0 0-2 2v1h10V3a2 2 0 0 0-2-2zm6 8H5a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1"/><path d="M0 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1v-2a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2H2a2 2 0 0 1-2-2z"/>
        </svg>
        <p class="text-muted">{{ $t('no-note-selected') }}</p>
      </div>

      <!-- Encrypted: set password (new note) -->
      <div v-else-if="isEncrypted && isEmptyEncrypted && decryptedContent === null" class="editor-lock-screen">
        <div class="lock-card">
          <div class="lock-icon-wrap text-warning">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
            </svg>
          </div>
          <h4>{{ $t('set-encryption-password') }}</h4>
          <p class="text-muted lock-hint">Choose a strong password. It cannot be recovered if lost.</p>
          <input
            type="password"
            class="lock-input"
            :placeholder="$t('password')"
            v-model="passwordInput"
            @keydown.enter="setPassword"
            autofocus
          />
          <button class="lock-btn lock-btn-primary" @click="setPassword">Set Password</button>
        </div>
      </div>

      <!-- Encrypted: enter password to decrypt -->
      <div v-else-if="isEncrypted && decryptedContent === null" class="editor-lock-screen">
        <div class="lock-card">
          <div class="lock-icon-wrap text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
            </svg>
          </div>
          <h4>{{ $t('note-is-encrypted') }}</h4>
          <p v-if="wrongAttempts > 0" class="lock-wrong">
            {{ $t('incorrect-password') }} ({{ wrongAttempts }})
          </p>
          <input
            type="password"
            class="lock-input"
            :class="{ 'lock-input-error': wrongAttempts > 0 }"
            :placeholder="$t('password')"
            v-model="passwordInput"
            @keydown.enter="submitDecrypt"
            autofocus
          />
          <button class="lock-btn lock-btn-primary" @click="submitDecrypt">{{ $t('decrypt') }}</button>
        </div>
      </div>

      <!-- Normal editor (plain or decrypted) -->
      <template v-else>
        <div class="editor-topbar">
          <div class="editor-title-row">
            <svg v-if="isEncrypted" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="text-warning me-2">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
            </svg>
            <span class="editor-note-title">{{ noteTitles[currentId] || currentId }}</span>
          </div>
          <button
            class="save-btn"
            :class="{
              'save-btn-dirty':  saveState === 'dirty',
              'save-btn-saving': saveState === 'saving',
              'save-btn-saved':  saveState === 'saved',
            }"
            :disabled="saveState !== 'dirty'"
            @click="doSave()"
          >
            <svg v-if="saveState === 'saved'" xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
              <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
            </svg>
            {{ saveLabel }}
          </button>
        </div>
        <textarea
          class="editor-textarea"
          :value="decryptedContent"
          @input="e => { decryptedContent = e.target.value; markDirty(); }"
          :placeholder="$t('empty-note')"
          spellcheck="true"
        ></textarea>
      </template>

    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.notes-layout {
  display: flex;
  height: calc(100vh - 57px); /* subtract navbar height */
  overflow: hidden;
  position: relative;
}

/* ── Sidebar ── */
.notes-sidebar {
  width: 280px;
  min-width: 280px;
  background: #111113;
  border-right: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid #27272a;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #d4d4d8;
  display: flex;
  align-items: center;
}

/* Note list */
.note-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.note-list-loading {
  padding: 20px;
  text-align: center;
  font-size: 0.85rem;
}

.note-item {
  width: 100%;
  text-align: left;
  background: none;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  color: inherit;
}

.note-item:hover {
  background: rgba(255,255,255,0.04);
}

.note-item-active {
  background: rgba(37, 99, 235, 0.12) !important;
  border-color: rgba(37, 99, 235, 0.3) !important;
}

.note-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 3px;
}

.note-item-title {
  font-size: 0.83rem;
  font-weight: 600;
  color: #d4d4d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.lock-icon { opacity: 0.6; }

.note-delete-btn {
  background: none;
  border: none;
  color: #52525b;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.12s, background 0.12s;
  line-height: 1;
}

.note-delete-btn:hover {
  color: #f87171;
  background: rgba(248,113,113,0.1);
}

.note-item-summary {
  font-size: 0.75rem;
  color: #52525b;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar actions */
.sidebar-actions {
  padding: 10px;
  border-top: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.sidebar-btn {
  width: 100%;
  padding: 8px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.sidebar-btn-primary {
  background: #2563eb;
  color: #fff;
}

.sidebar-btn-primary:hover { background: #1d4ed8; }

.sidebar-btn-lock {
  background: rgba(255,255,255,0.05);
  border: 1px solid #3f3f46;
  color: #a1a1aa;
}

.sidebar-btn-lock:hover {
  background: rgba(255,255,255,0.08);
  color: #f4f4f5;
}

/* ── Editor ── */
.notes-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f0f11;
}

/* Empty state */
.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #3f3f46;
}

/* Lock screen */
.editor-lock-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lock-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 40px 36px;
  text-align: center;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lock-icon-wrap {
  display: flex;
  justify-content: center;
}

.lock-card h4 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f4f4f5;
  margin: 0;
}

.lock-hint {
  font-size: 0.82rem;
  margin: 0;
}

.lock-wrong {
  font-size: 0.82rem;
  color: #f87171;
  margin: 0;
}

.lock-input {
  background: #111113;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  padding: 10px 14px;
  text-align: center;
  outline: none;
  transition: border-color 0.15s;
}

.lock-input::placeholder { color: #52525b; }
.lock-input:focus { border-color: #6ea8fe; }
.lock-input-error { border-color: #f87171 !important; }

.lock-btn {
  padding: 10px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.lock-btn-primary {
  background: #2563eb;
  color: #fff;
}

.lock-btn-primary:hover { background: #1d4ed8; }

/* Top bar */
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid #1f1f23;
  flex-shrink: 0;
  gap: 12px;
}

.editor-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.editor-note-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #71717a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-btn {
  padding: 6px 16px;
  border-radius: 7px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #3f3f46;
  background: transparent;
  color: #71717a;
  cursor: default;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.save-btn-dirty {
  border-color: #2563eb;
  color: #93c5fd;
  cursor: pointer;
}

.save-btn-dirty:hover {
  background: rgba(37, 99, 235, 0.15);
}

.save-btn-saving {
  color: #52525b;
  cursor: wait;
}

.save-btn-saved {
  border-color: #166534;
  color: #4ade80;
}

/* Textarea */
.editor-textarea {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  color: #d4d4d8;
  font-family: 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.7;
  padding: 20px 24px;
  caret-color: #6ea8fe;
}

.editor-textarea::placeholder { color: #3f3f46; }

/* ── Mobile sidebar toggle ── */
.sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 50;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
}

@media (max-width: 640px) {
  .sidebar-toggle { display: flex; }

  .notes-sidebar {
    position: fixed;
    top: 57px;
    left: 0;
    bottom: 0;
    z-index: 40;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    width: 280px;
  }

  .sidebar-visible {
    transform: translateX(0) !important;
  }
}
</style>
