<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import {
  getNotes, getNoteContent, updateNoteContent, createNote, deleteNote
} from '@/assets/js/serble.js';
import {
  encrypt, decrypt, loadPasswords, savePasswords
} from '@/assets/js/vaultCrypto.js';
import LinkedText from '@/components/LinkedText.vue';
import Icon from '@/components/Icon.vue';

const ENCRYPTION_HEADER = '------BEGIN ENCRYPTED NOTE-----\n';

export default {
  components: { LinkedText, Icon },
  setup() {
    const { t } = useI18n();
    ensureLoggedIn();
    const route = useRoute();
    const router = useRouter();

    // -- State --
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

    // -- Helpers --
    function titleFromContent(content) {
      const plain = content.startsWith(ENCRYPTION_HEADER)
        ? content.slice(ENCRYPTION_HEADER.length)
        : content;
      const line = plain.split('\n')[0].trim();
      return line || null;
    }

    function summaryFromContent(content) {
      if (!content) return t('empty-note');
      const plain = content.startsWith(ENCRYPTION_HEADER)
        ? content.slice(ENCRYPTION_HEADER.length)
        : content;
      const flat = plain.replace(/\n/g, ' ').trim();
      return flat.length > 80 ? flat.slice(0, 80) + '...' : (flat || t('empty-note'));
    }

    function setMeta(id, rawOrDecrypted) {
      const title = titleFromContent(rawOrDecrypted);
      noteTitles.value  = { ...noteTitles.value,  [id]: title || id };
      noteSummaries.value = { ...noteSummaries.value, [id]: summaryFromContent(rawOrDecrypted) };
    }

    // -- Load all notes --
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

    // -- Open a note --
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

    // -- Decrypt --
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

    // -- Set password (new encrypted note) --
    async function setPassword() {
      const pw = passwordInput.value;
      if (!pw) return;
      passwords.value = { ...passwords.value, [currentId.value]: pw };
      savePasswords(passwords.value);
      passwordInput.value = '';
      await doSave(t('welcome-to-encrypted-note'));
      await loadNoteBackground(currentId.value);
      await openNote(currentId.value);
    }

    // -- Save --
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

    // -- New note --
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

    // -- Delete note --
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

    // -- Computed --
    const saveLabel = computed(() => {
      if (saveState.value === 'saving') return 'Saving...';
      if (saveState.value === 'saved')  return 'Saved!';
      if (saveState.value === 'dirty')  return 'Save';
      return 'Save';
    });

    // Ctrl/Cmd + S to save
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (saveState.value === 'dirty') doSave();
      }
    }
    onMounted(() => window.addEventListener('keydown', handleKeydown));
    onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

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
      <Icon name="menu" :size="18" />
    </button>

    <!-- Sidebar -->
    <aside class="notes-sidebar" :class="{ 'sidebar-visible': sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-title">
          <Icon name="note" :size="18" class="me-2" />
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
              <Icon v-if="(loadedContent[id] || '').startsWith('------BEGIN ENCRYPTED')" name="lock" :size="13" class="lock-icon me-1" />
              {{ noteTitles[id] || id }}
            </span>
            <button class="note-delete-btn" @click="removeNote(id, $event)" :title="$t('delete')">
              <Icon name="trash" :size="14" />
            </button>
          </div>
          <p class="note-item-summary">{{ noteSummaries[id] || $t('click-to-load') }}</p>
        </button>
      </div>

      <!-- New note buttons -->
      <div class="sidebar-actions">
        <button class="sidebar-btn sidebar-btn-primary" @click="newNote(false)">
          <Icon name="plusCircle" :size="15" class="me-1" />
          {{ $t('new-note') }}
        </button>
        <button class="sidebar-btn sidebar-btn-lock" @click="newNote(true)">
          <Icon name="lock" :size="15" class="me-1" />
          {{ $t('new-encrypted-note') }}
        </button>
      </div>
    </aside>

    <!-- Editor area -->
    <div class="notes-editor">

      <!-- This page is superseded by notes.serble.net. -->
      <div class="deprecated-banner" role="status">
        <Icon name="alert" :size="15" />
        <LinkedText :text="$t('notes-deprecated')" href="https://notes.serble.net" target="_blank" />
      </div>

      <!-- No note selected -->
      <div v-if="!currentId" class="editor-empty">
        <Icon name="note" :size="40" class="opacity-25 mb-3" />
        <p class="text-muted">{{ $t('no-note-selected') }}</p>
      </div>

      <!-- Encrypted: set password (new note) -->
      <div v-else-if="isEncrypted && isEmptyEncrypted && decryptedContent === null" class="editor-lock-screen">
        <div class="lock-card">
          <div class="lock-icon-wrap text-warning">
            <Icon name="lock" :size="40" />
          </div>
          <h4>{{ $t('set-encryption-password') }}</h4>
          <p class="text-muted lock-hint">{{ $t('choose-strong-password') }}</p>
          <input
            type="password"
            class="lock-input"
            :placeholder="$t('password')"
            v-model="passwordInput"
            @keydown.enter="setPassword"
            autofocus
          />
          <button class="lock-btn lock-btn-primary" @click="setPassword">{{ $t('set-password') }}</button>
        </div>
      </div>

      <!-- Encrypted: enter password to decrypt -->
      <div v-else-if="isEncrypted && decryptedContent === null" class="editor-lock-screen">
        <div class="lock-card">
          <div class="lock-icon-wrap text-accent">
            <Icon name="lock" :size="40" />
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
            <Icon v-if="isEncrypted" name="lock" class="text-warning me-2" />
            <span class="editor-note-title">{{ noteTitles[currentId] || currentId }}</span>
          </div>
          <button
            class="save-btn"
            :class="{ 'save-btn-dirty': saveState === 'dirty', 'save-btn-saving': saveState === 'saving', 'save-btn-saved': saveState === 'saved', }"
            :disabled="saveState !== 'dirty'"
            @click="doSave()"
          >
            <Icon v-if="saveState === 'saved'" name="check" :size="15" class="me-1" />
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
/* -- Layout -- */
.notes-layout {
  display: flex;
  height: calc(100vh - 57px); /* subtract navbar height */
  overflow: hidden;
  position: relative;
}

/* -- Sidebar -- */
.notes-sidebar {
  width: 280px;
  min-width: 280px;
  background: var(--surface-sunken);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
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
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background var(--t-fast), border-color var(--t-fast);
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
  color: var(--text-secondary);
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
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color var(--t-fast), background var(--t-fast);
  line-height: 1;
}

.note-delete-btn:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

.note-item-summary {
  font-size: 0.75rem;
  color: var(--text-faint);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Sidebar actions */
.sidebar-actions {
  padding: 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.sidebar-btn {
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t), color var(--t), transform var(--t);
}

.sidebar-btn:active { transform: scale(0.98); }

.sidebar-btn-primary {
  background: var(--accent);
  color: #fff;
}

.sidebar-btn-primary:hover { background: var(--accent-hover); }

.sidebar-btn-lock {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.sidebar-btn-lock:hover {
  background: rgba(255,255,255,0.08);
  color: var(--text);
}

/* -- Editor -- */
.notes-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f0f11;
}

/* Sits above every editor state, so it is on screen whichever note is open. */
.deprecated-banner {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 10px 16px;
  background: var(--warning-bg);
  border-bottom: 1px solid var(--warning-border);
  color: var(--warning);
  font-size: 0.82rem;
  line-height: 1.4;
}

.deprecated-banner a {
  color: inherit;
  font-weight: 600;
  text-decoration: underline;
}

/* Empty state */
.editor-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--border-strong);
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.lock-hint {
  font-size: 0.82rem;
  margin: 0;
}

.lock-wrong {
  font-size: 0.82rem;
  color: var(--danger);
  margin: 0;
}

.lock-input {
  background: var(--surface-sunken);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: 0.95rem;
  padding: 10px 14px;
  text-align: center;
  transition: border-color var(--t);
}

.lock-input::placeholder { color: var(--text-faint); }
.lock-input:focus { border-color: var(--accent-light); }
.lock-input-error { border-color: var(--danger) !important; }

.lock-btn {
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background var(--t), transform var(--t);
}

.lock-btn:active { transform: scale(0.98); }

.lock-btn-primary {
  background: var(--accent);
  color: #fff;
}

.lock-btn-primary:hover { background: var(--accent-hover); }

/* Top bar */
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
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
  color: var(--text-dim);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-btn {
  padding: 6px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text-dim);
  cursor: default;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: background var(--t), color var(--t), border-color var(--t);
}

.save-btn-dirty {
  border-color: var(--accent);
  color: var(--accent-light);
  cursor: pointer;
}

.save-btn-dirty:hover {
  background: var(--accent-ring);
}

.save-btn-saving {
  color: var(--text-faint);
  cursor: wait;
}

.save-btn-saved {
  border-color: var(--success-border);
  color: var(--success);
}

/* Textarea */
.editor-textarea {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  resize: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.7;
  padding: 20px 24px;
  caret-color: var(--accent-light);
}

.editor-textarea::placeholder { color: var(--border-strong); }

/* -- Mobile sidebar toggle -- */
.sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 50;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-popover);
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
    transition: transform var(--t);
    width: 280px;
  }

  .sidebar-visible {
    transform: translateX(0) !important;
  }
}

/* A finger-sized delete button; the negative margin keeps the row height as it was. */
@media (max-width: 768px), (pointer: coarse) {
  /* 16px stops iOS zooming in when the editor takes focus */
  .editor-textarea {
    font-size: 16px;
  }

  .sidebar-btn,
  .save-btn {
    min-height: 44px;
  }

  .note-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
    margin: -8px -6px -8px 0;
  }
}
</style>
