<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import {
  getOAuthApp, editOAuthApp,
  getAppKeys, createAppKey, deleteAppKey,
  getAppBalance,
} from '@/assets/js/serble.js';
import CoinIcon from '@/components/CoinIcon.vue';
import CoinAmount from '@/components/CoinAmount.vue';

export default {
  components: { CoinIcon, CoinAmount },
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const route = useRoute();

    const appId = ref('');
    const name = ref('');
    const description = ref('');
    const error = ref('');
    const loading = ref(true);
    const redirectUris = ref([]);
    const newUri = ref('');

    // ── API keys ──
    const keys = ref(null);
    const keysLoading = ref(false);
    const keysError = ref(false);
    const newKeyName = ref('');
    const creatingKey = ref(false);
    const revealedKey = ref(null); // { name, key }
    const keyMessage = ref('');

    // ── App balance (read-only; only admins can mint/modify coins) ──
    const balanceCoins = ref(null);
    const balanceLoading = ref(false);
    const balanceError = ref(false);

    let originalApp = null;

    onMounted(async () => {
      const id = route.query.appid;
      if (!id) {
        router.push('/oauthapps');
        return;
      }
      appId.value = id;

      const result = await getOAuthApp(id);
      if (!result.success || !result.app) {
        router.push('/oauthapps');
        return;
      }

      originalApp = result.app;
      name.value = originalApp.Name ?? originalApp.name ?? '';
      description.value = originalApp.Description ?? originalApp.description ?? '';
      const rawUri = originalApp.RedirectUri ?? originalApp.redirectUri ?? '';
      redirectUris.value = rawUri ? rawUri.split(';').map(u => u.trim()).filter(Boolean) : [];
      loading.value = false;

      loadKeys();
      loadBalance();
    });

    function addUri() {
      const trimmed = newUri.value.trim();
      if (trimmed && !redirectUris.value.includes(trimmed)) {
        redirectUris.value.push(trimmed);
      }
      newUri.value = '';
    }

    function removeUri(index) {
      redirectUris.value.splice(index, 1);
    }

    function handleUriKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addUri();
      }
    }

    // ── API key actions ──
    async function loadKeys() {
      keysLoading.value = true;
      keysError.value = false;
      const r = await getAppKeys(appId.value);
      keysLoading.value = false;
      if (r.success) keys.value = r.keys ?? [];
      else keysError.value = true;
    }

    async function createKey() {
      keyMessage.value = '';
      const trimmed = newKeyName.value.trim();
      if (!trimmed) {
        keyMessage.value = 'Enter a key name.';
        return;
      }
      if (trimmed.length > 128) {
        keyMessage.value = 'Key name must be 128 characters or fewer.';
        return;
      }
      creatingKey.value = true;
      const r = await createAppKey(appId.value, trimmed);
      creatingKey.value = false;
      if (r.success) {
        revealedKey.value = { name: r.key?.name ?? trimmed, key: r.key?.key ?? '' };
        newKeyName.value = '';
        await loadKeys();
      } else {
        keyMessage.value = r.error === 403 ? 'You do not own this app.' : 'Failed to create key.';
      }
    }

    async function removeKey(keyId) {
      if (!confirm('Revoke this API key? Applications using it will stop working.')) return;
      const r = await deleteAppKey(appId.value, keyId);
      if (r.success) await loadKeys();
      else keyMessage.value = 'Failed to revoke key.';
    }

    async function copyKey() {
      if (!revealedKey.value?.key) return;
      try {
        await navigator.clipboard.writeText(revealedKey.value.key);
        keyMessage.value = 'Key copied to clipboard.';
      } catch {
        keyMessage.value = 'Copy failed — select and copy manually.';
      }
    }

    function dismissRevealedKey() {
      revealedKey.value = null;
    }

    // ── Balance actions (read-only) ──
    async function loadBalance() {
      balanceLoading.value = true;
      balanceError.value = false;
      const r = await getAppBalance(appId.value);
      balanceLoading.value = false;
      if (r.success) balanceCoins.value = String(r.balance?.coins ?? '0');
      else balanceError.value = true;
    }

    async function submit() {
      error.value = '';

      if (!originalApp) {
        error.value = 'try-again-in-5';
        return;
      }

      const edits = [];

      const originalName = originalApp.Name ?? originalApp.name ?? '';
      const originalDescription = originalApp.Description ?? originalApp.description ?? '';
      const originalRawUri = originalApp.RedirectUri ?? originalApp.redirectUri ?? '';
      const newRawUri = redirectUris.value.join(';');

      if (name.value.trim() !== originalName) {
        edits.push({ field: 'name', newValue: name.value.trim() });
      }
      if (description.value.trim() !== originalDescription) {
        edits.push({ field: 'description', newValue: description.value.trim() });
      }
      if (newRawUri !== originalRawUri) {
        edits.push({ field: 'redirect_uri', newValue: newRawUri });
      }

      if (edits.length === 0) {
        router.push('/oauthapps');
        return;
      }

      const result = await editOAuthApp(originalApp.Id ?? originalApp.id, edits);
      if (!result.success) {
        error.value = 'try-again-in-5';
        return;
      }

      router.push('/oauthapps');
    }

    return {
      name, description, error, loading, redirectUris, newUri, addUri, removeUri, handleUriKeydown, submit,
      keys, keysLoading, keysError, newKeyName, creatingKey, revealedKey, keyMessage,
      loadKeys, createKey, removeKey, copyKey, dismissRevealedKey,
      balanceCoins, balanceLoading, balanceError,
      loadBalance,
    };
  }
};
</script>

<template>
  <div v-if="loading" class="state-block">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary">
      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
    </svg>
    <p>{{ $t('loading') }}</p>
  </div>

  <div v-else class="form-page">

    <!-- Page header -->
    <div class="form-header">
      <RouterLink to="/oauthapps" class="back-btn" :title="$t('cancel')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
        </svg>
      </RouterLink>
      <div>
        <h3 class="form-title">{{ $t('edit-oauth-application') }}</h3>
        <p class="form-subtitle">Update the details for your application.</p>
      </div>
    </div>

    <!-- Error alert -->
    <div v-if="error" class="form-error" role="alert">{{ $t(error) }}</div>

    <!-- Form card -->
    <div class="form-card">

      <!-- Name -->
      <div class="form-section">
        <label class="section-label" for="name">{{ $t('application-name') }}</label>
        <input
          type="text"
          class="dark-input"
          id="name"
          :placeholder="$t('application-name')"
          maxlength="255"
          v-model="name"
        >
      </div>

      <!-- Description -->
      <div class="form-section">
        <label class="section-label" for="desc">{{ $t('description') }}</label>
        <p class="section-hint">Optional. Shown to users when they authorize your app.</p>
        <textarea
          class="dark-input"
          id="desc"
          :placeholder="$t('description')"
          maxlength="4095"
          rows="3"
          v-model="description"
        ></textarea>
      </div>

      <!-- Redirect URIs -->
      <div class="form-section">
        <label class="section-label">{{ $t('redirect-uris') }}</label>
        <p class="section-hint">Add one or more URIs that users can be redirected to after authorization. Press Enter or click Add.</p>

        <div v-if="redirectUris.length > 0" class="uri-list">
          <div v-for="(uri, index) in redirectUris" :key="index" class="uri-item">
            <span class="uri-text">{{ uri }}</span>
            <button type="button" class="uri-remove" :title="$t('delete')" @click="removeUri(index)">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="uri-input-group">
          <input
            type="text"
            class="dark-input"
            :placeholder="$t('add-redirect-uri')"
            v-model="newUri"
            @keydown="handleUriKeydown"
          >
          <button type="button" class="add-btn" @click="addUri">{{ $t('add') }}</button>
        </div>
      </div>

    </div>

    <!-- Actions -->
    <div class="form-actions">
      <RouterLink to="/oauthapps" class="btn-secondary">{{ $t('cancel') }}</RouterLink>
      <button class="btn-primary" @click="submit">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
        </svg>
        {{ $t('save-changes') }}
      </button>
    </div>

    <!-- ── API keys ── -->
    <div class="panel">
      <div class="panel-head">
        <div>
          <h4 class="panel-title">{{ $t('api-keys') }}</h4>
          <p class="panel-subtitle">Keys let your app authenticate as itself (header <code>SerbleAuth: ApiKey sap_…</code>).</p>
        </div>
        <button class="ghost-btn" :disabled="keysLoading" @click="loadKeys">
          {{ keysLoading ? '…' : $t('reload') }}
        </button>
      </div>

      <!-- Reveal-once banner -->
      <div v-if="revealedKey" class="reveal-card">
        <p class="reveal-warning">Copy this key now — it will <strong>never</strong> be shown again.</p>
        <div class="reveal-row">
          <code class="reveal-key">{{ revealedKey.key }}</code>
          <button class="ghost-btn" @click="copyKey">Copy</button>
        </div>
        <button class="reveal-dismiss" @click="dismissRevealedKey">I've saved it</button>
      </div>

      <div v-if="keyMessage" class="panel-message">{{ keyMessage }}</div>

      <!-- Create key -->
      <div class="uri-input-group">
        <input
          type="text"
          class="dark-input"
          maxlength="128"
          :placeholder="'Key name (e.g. CI server key)'"
          v-model="newKeyName"
          @keydown.enter.prevent="createKey"
        >
        <button type="button" class="add-btn" :disabled="creatingKey" @click="createKey">
          {{ creatingKey ? '…' : 'Create key' }}
        </button>
      </div>

      <!-- Key list -->
      <div v-if="keysLoading" class="panel-state">{{ $t('loading') }}</div>
      <div v-else-if="keysError" class="panel-state panel-state-error">{{ $t('unknown-error') }}</div>
      <div v-else-if="!keys || keys.length === 0" class="panel-state">No API keys yet.</div>
      <div v-else class="key-list">
        <div v-for="k in keys" :key="k.id" class="key-item">
          <div class="key-info">
            <span class="key-name">{{ k.name }}</span>
            <code class="key-prefix">{{ k.keyPrefix }}</code>
            <span v-if="k.dateCreated" class="key-date">{{ new Date(k.dateCreated).toLocaleDateString() }}</span>
          </div>
          <button class="uri-remove" :title="$t('delete')" @click="removeKey(k.id)">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ── App balance ── -->
    <div class="panel">
      <div class="panel-head">
        <div>
          <h4 class="panel-title">{{ $t('app-balance') }}</h4>
          <p class="panel-subtitle">Coins held by this application.</p>
        </div>
        <button class="ghost-btn" :disabled="balanceLoading" @click="loadBalance">
          {{ balanceLoading ? '…' : $t('reload') }}
        </button>
      </div>

      <div class="balance-display">
        <CoinIcon :size="22" />
        <span v-if="balanceLoading" class="balance-value">…</span>
        <span v-else-if="balanceError" class="balance-value balance-err">{{ $t('unknown-error') }}</span>
        <span v-else class="balance-value"><CoinAmount :value="balanceCoins" /> {{ $t('coins') }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.form-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* ── Loading ── */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  text-align: center;
  color: var(--text-dim);
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

/* ── Header ── */
.form-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.back-btn:hover {
  background: var(--border);
  color: var(--text);
  border-color: var(--border-strong);
}

.form-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 2px;
}

.form-subtitle {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
}

/* ── Error ── */
.form-error {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  color: var(--danger);
  font-size: 0.85rem;
  border-radius: 9px;
  padding: 10px 14px;
  margin-bottom: 18px;
}

/* ── Form card ── */
.form-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.form-section {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.form-section:last-child {
  border-bottom: none;
}

.section-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: 8px;
}

.section-hint {
  font-size: 0.8rem;
  color: var(--text-faint);
  margin: 0 0 12px;
  line-height: 1.5;
}

/* ── Inputs ── */
.dark-input {
  width: 100%;
  background: var(--surface-sunken);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.9rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.dark-input::placeholder { color: var(--text-faint); }

.dark-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

textarea.dark-input {
  resize: vertical;
  line-height: 1.5;
}

/* ── URI list ── */
.uri-list {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.uri-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-sunken);
}

.uri-item:last-child { border-bottom: none; }

.uri-text {
  word-break: break-all;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.uri-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid var(--danger-border-soft);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.uri-remove:hover {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

.uri-input-group {
  display: flex;
  gap: 8px;
}

.uri-input-group .dark-input { flex-grow: 1; }

.add-btn {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 0 18px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.add-btn:hover {
  background: var(--border-strong);
  color: var(--text);
}

/* ── Actions ── */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}

.btn-secondary,
.btn-primary {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 9px 18px;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.btn-secondary {
  color: var(--text-secondary);
  background: transparent;
  border-color: var(--border-strong);
}

.btn-secondary:hover {
  background: var(--border);
  color: var(--text);
}

.btn-primary {
  color: #fff;
  background: var(--accent);
  padding: 9px 24px;
}

.btn-primary:hover { background: var(--accent-hover); }

/* ── Panels (API keys / balance) ── */
.panel {
  margin-top: 28px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
}

.panel-subtitle code {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.ghost-btn {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.ghost-btn:hover:not(:disabled) {
  background: var(--border-strong);
  color: var(--text);
}

.ghost-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.panel-message {
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.panel-state {
  font-size: 0.85rem;
  color: var(--text-faint);
  padding: 12px 0 4px;
}

.panel-state-error { color: var(--danger); }

/* Reveal-once key */
.reveal-card {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.reveal-warning {
  font-size: 0.82rem;
  color: var(--danger);
  margin: 0 0 10px;
}

.reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.reveal-key {
  flex-grow: 1;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--text);
  word-break: break-all;
}

.reveal-dismiss {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  padding: 6px 14px;
  cursor: pointer;
}

.reveal-dismiss:hover { background: var(--border); color: var(--text); }

/* Key list */
.key-list {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.key-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-sunken);
}

.key-item:last-child { border-bottom: none; }

.key-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.key-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.key-prefix {
  font-size: 0.76rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.key-date {
  font-size: 0.74rem;
  color: var(--text-faint);
}

/* Balance display */
.balance-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 14px;
}



.balance-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
  word-break: break-all;
}

.balance-err { font-size: 0.9rem; color: var(--danger); font-weight: 500; }
</style>