<script>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getOAuthApp, editOAuthApp } from '@/assets/js/serble.js';

export default {
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const route = useRoute();

    const name = ref('');
    const description = ref('');
    const error = ref('');
    const loading = ref(true);
    const redirectUris = ref([]);
    const newUri = ref('');

    let originalApp = null;

    onMounted(async () => {
      const appId = route.query.appid;
      if (!appId) {
        router.push('/oauthapps');
        return;
      }

      const result = await getOAuthApp(appId);
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

    return { name, description, error, loading, redirectUris, newUri, addUri, removeUri, handleUriKeydown, submit };
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
</style>