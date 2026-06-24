<script>
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPublicAppInfo, authorizeApp } from '@/assets/js/serble.js';
import { filterInvalidScopes, scopeIdsToNames, scopeIdsToString, getDescriptionFromName, isSensitiveScopeName } from '@/assets/js/scopes.js';
import OfficialBadge from '@/components/OfficialBadge.vue';

// Note: `response_type` is intentionally NOT required. The legacy Serble OAuth
// flow always issues an authorization code and never reads response_type, so
// requiring it only rejects otherwise-valid requests.
const REQUIRED_PARAMS = ['redirect_uri', 'client_id', 'scope', 'state'];

export default {
  components: { OfficialBadge },
  setup() {
    const user = ensureLoggedIn();
    const route  = useRoute();
    const router = useRouter();
    const userStore = inject('userStore');

    // state: 'loading' | 'ready' | 'working' | 'error'
    const state    = ref('loading');
    const app      = ref(null);        // PublicOAuthApp
    const scopeNames = ref([]);        // display names of requested valid scopes
    const error    = ref({ code: '', detail: '', params: null });

    function setError(code, detail = '', params = null) {
      state.value = 'error';
      error.value = { code, detail, params };
    }

    // True if every scope requested (requestedStr) is already granted (grantedStr).
    function isScopeSubset(requestedStr, grantedStr) {
      for (let i = 0; i < requestedStr.length; i++) {
        if (requestedStr[i] === '1' && grantedStr[i] !== '1') return false;
      }
      return true;
    }

    const errorMessages = {
      'missing-params':         'One or more required query parameters are missing.',
      'app-not-found':          'No application with the given client_id was found.',
      'redirect-uri-mismatch':  'The redirect_uri does not match any of the URIs registered for this application.',
      'bad-app':                'The application ID was rejected by the server.',
      'unknown':                'An unexpected error occurred.',
    };

    onMounted(async () => {
      const q = route.query;

      // 1. Check all required params are present
      const missing = REQUIRED_PARAMS.filter(p => !q[p]);
      if (missing.length) {
        setError('missing-params', `Missing: ${missing.join(', ')}`, q);
        return;
      }

      // 2. Fetch public app info
      const appRes = await getPublicAppInfo(q.client_id);
      if (!appRes.success) {
        setError(
          appRes.flag === 'not-found' ? 'app-not-found' : 'unknown',
          appRes.message ?? '',
          q
        );
        return;
      }
      app.value = appRes.app;

      // 3. Resolve scopes
      const requestedIds = q.scope.split(' ');
      const validIds     = filterInvalidScopes(requestedIds);
      scopeNames.value   = scopeIdsToNames(validIds);

      // 4. Check if already authorized — auto-allow only if no new scopes are requested.
      //    The authorized-app entry's appId is the OAuth client_id, so match on that
      //    rather than the public app payload (which may not include an id field).
      const currentUser = user.value ?? userStore?.state?.user;
      const authorizedApps = currentUser?.authorizedApps ?? currentUser?.AuthorizedApps ?? [];
      const existing = authorizedApps.find(a => (a.appId ?? a.AppId) === q.client_id);
      if (existing) {
        const grantedStr   = existing.scopes ?? existing.Scopes ?? '';
        const requestedStr = scopeIdsToString(validIds);
        if (isScopeSubset(requestedStr, grantedStr)) {
          await doAuthorize(true, true);
          return;
        }
      }

      state.value = 'ready';
    });

    async function doAuthorize(allow, silent = false) {
      if (!silent) state.value = 'working';

      const q = route.query;

      // Validate redirect_uri
      let redirectUri;
      try {
        redirectUri = new URL(q.redirect_uri);
      } catch {
        setError('redirect-uri-mismatch', `"${q.redirect_uri}" is not a valid URL.`, q);
        return;
      }

      // Check redirect_uri is in app's allowed list
      const validUris = (app.value.redirectUri ?? app.value.RedirectUri ?? '').split(';').map(u => u.trim());
      if (!validUris.includes(q.redirect_uri)) {
        setError(
          'redirect-uri-mismatch',
          `Provided: "${q.redirect_uri}"\nAllowed: ${validUris.join(', ')}`,
          q
        );
        return;
      }

      let authCode = null;
      if (allow) {
        const requestedIds = q.scope.split(' ');
        const validIds     = filterInvalidScopes(requestedIds);
        const scopeStr     = scopeIdsToString(validIds);
        const appId        = app.value.id ?? app.value.Id;

        const authRes = await authorizeApp(appId, scopeStr);
        if (!authRes.success) {
          setError(authRes.flag === 'bad-app' ? 'bad-app' : 'unknown', '', q);
          return;
        }
        authCode = authRes.authCode;
      }

      // Build final redirect URL
      let finalUrl = q.redirect_uri;
      finalUrl += `?state=${encodeURIComponent(q.state)}`;
      if (authCode) finalUrl += `&code=${encodeURIComponent(authCode)}`;
      finalUrl += `&authorized=${allow ? 'true' : 'false'}`;

      window.location.href = finalUrl;
    }

    const appName = computed(() => app.value?.name ?? app.value?.Name ?? '');
    const appIsOfficial = computed(() => app.value?.isOfficial ?? app.value?.IsOfficial ?? false);
    const hasSensitiveScopes = computed(() => scopeNames.value.some(isSensitiveScopeName));
    // Only warn / require acknowledgement for non-official apps.
    const showSensitive = computed(() => hasSensitiveScopes.value && !appIsOfficial.value);
    const acknowledged = ref(false);

    return { state, app, appName, appIsOfficial, scopeNames, error, errorMessages, doAuthorize, getDescriptionFromName, isSensitiveScopeName, hasSensitiveScopes, showSensitive, acknowledged };
  }
};
</script>

<template>
  <div class="oauth-page">

    <!-- Loading -->
    <div v-if="state === 'loading'" class="oauth-card">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary mb-3">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
      </svg>
      <p class="text-muted">{{ $t('loading') }}</p>
    </div>

    <!-- Error (inline, no redirect) -->
    <div v-else-if="state === 'error'" class="oauth-card oauth-card-error">

      <div class="oauth-error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>

      <h2 class="oauth-error-title">{{ $t('invalid-oauth') }}</h2>
      <p class="oauth-error-sub">{{ $t('invalid-oauth-message') }}</p>

      <!-- Error detail card -->
      <div class="oauth-error-detail">
        <div class="error-detail-row">
          <span class="error-detail-label">Error code</span>
          <code class="error-detail-value error-code-badge">{{ error.code || 'unknown' }}</code>
        </div>
        <div class="error-detail-row" v-if="error.detail">
          <span class="error-detail-label">Detail</span>
          <pre class="error-detail-value error-detail-pre">{{ error.detail }}</pre>
        </div>
        <div v-if="errorMessages[error.code]" class="error-detail-row">
          <span class="error-detail-label">Explanation</span>
          <span class="error-detail-value">{{ errorMessages[error.code] }}</span>
        </div>
      </div>

      <!-- Query params dump -->
      <div v-if="error.params && Object.keys(error.params).length" class="oauth-params-dump">
        <p class="params-heading">Request parameters</p>
        <div class="params-grid">
          <template v-for="(val, key) in error.params" :key="key">
            <code class="param-key">{{ key }}</code>
            <code class="param-val">{{ val }}</code>
          </template>
        </div>
      </div>

      <RouterLink to="/" class="oauth-back-link">← Back to home</RouterLink>
    </div>

    <!-- Ready: show authorize UI -->
    <div v-else class="oauth-card">

      <!-- App name / header -->
      <div class="oauth-app-header">
        <div class="oauth-app-icon">{{ appName.charAt(0).toUpperCase() }}</div>
        <h2 class="oauth-app-name">{{ appName }}</h2>
        <OfficialBadge v-if="appIsOfficial" />
      </div>

      <p class="oauth-warning-text">
        {{ $t('oauth-warning').replace('{app}', appName) }}
      </p>

      <!-- Scope list -->
      <div class="oauth-scopes">
        <p class="scopes-heading">{{ $t('scopes') }}</p>

        <ul v-if="scopeNames.length" class="scope-list">
          <li
            v-for="name in scopeNames"
            :key="name"
            class="scope-item"
            :class="{ 'scope-item-sensitive': showSensitive && isSensitiveScopeName(name) }"
          >
            <div class="scope-dot"></div>
            <div class="scope-text">
              <span class="scope-name">
                {{ name }}
                <span v-if="showSensitive && isSensitiveScopeName(name)" class="scope-sensitive-tag">{{ $t('sensitive') }}</span>
              </span>
              <span class="scope-desc">{{ getDescriptionFromName(name) }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="no-scopes">{{ $t('none') }}</p>
      </div>

      <!-- Sensitive scope acknowledgement (skipped for official apps) -->
      <label v-if="showSensitive" class="sensitive-ack" :class="{ 'sensitive-ack-checked': acknowledged }">
        <input type="checkbox" v-model="acknowledged" class="sensitive-ack-input">
        <span class="sensitive-ack-box" aria-hidden="true">
          <svg v-if="acknowledged" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
          </svg>
        </span>
        <span class="sensitive-ack-text">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="sensitive-ack-icon">
            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
          </svg>
          {{ $t('sensitive-scope-warning') }}
        </span>
      </label>

      <p class="oauth-deny-warning">{{ $t('click-deny-if-confused') }}</p>

      <!-- Action buttons -->
      <div class="oauth-actions">
        <button
          class="oauth-btn oauth-btn-allow"
          :disabled="state === 'working' || (showSensitive && !acknowledged)"
          @click="doAuthorize(true)"
        >
          <svg v-if="state !== 'working'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
          {{ $t('allow') }}
        </button>
        <button
          class="oauth-btn oauth-btn-deny"
          :disabled="state === 'working'"
          @click="doAuthorize(false)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
          </svg>
          {{ $t('deny') }}
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
.oauth-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

/* ── Card ── */
.oauth-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.oauth-card-error {
  max-width: 560px;
  text-align: left;
  align-items: stretch;
  border-color: var(--danger-border);
}

/* ── Loading spinner ── */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin { animation: spin 0.9s linear infinite; }

/* ── Error state ── */
.oauth-error-icon {
  color: var(--danger);
  display: flex;
  justify-content: center;
  animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}

.oauth-error-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  text-align: center;
}

.oauth-error-sub {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
  text-align: center;
  line-height: 1.6;
}

.oauth-error-detail {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.error-detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  min-width: 88px;
  flex-shrink: 0;
  padding-top: 2px;
}

.error-detail-value {
  font-size: 0.83rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.error-code-badge {
  background: var(--danger-bg);
  color: var(--danger);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.error-detail-pre {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  background: transparent;
  border: none;
  padding: 0;
}

/* Params dump */
.oauth-params-dump {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
}

.params-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: 10px;
}

.params-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 12px;
  align-items: start;
}

.param-key {
  font-size: 0.78rem;
  color: var(--accent-light);
  white-space: nowrap;
}

.param-val {
  font-size: 0.78rem;
  color: var(--text-muted);
  word-break: break-all;
}

.oauth-back-link {
  font-size: 0.82rem;
  color: var(--text-dim);
  text-decoration: none;
  align-self: flex-start;
}

.oauth-back-link:hover { color: var(--text-muted); }

/* ── Auth UI ── */
.oauth-app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.oauth-app-icon {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-purple));
  color: #fff;
  font-size: 1.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oauth-app-name {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
}

.oauth-warning-text {
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1.6;
  margin: 0;
}

/* Scopes */
.oauth-scopes {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  text-align: left;
}

.scopes-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin-bottom: 10px;
}

.scope-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.scope-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 5px;
}

.scope-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scope-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.scope-desc {
  font-size: 0.77rem;
  color: var(--text-faint);
  line-height: 1.4;
}

.no-scopes {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: 0;
}

/* ── Sensitive scope highlighting ── */
.sensitive-ack {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.sensitive-ack-checked {
  border-color: var(--danger);
}

.sensitive-ack-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.sensitive-ack-box {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 5px;
  border: 1.5px solid var(--danger);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: background 0.15s;
}

.sensitive-ack-checked .sensitive-ack-box {
  background: var(--danger);
}

.sensitive-ack-text {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  color: var(--danger);
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.4;
}

.sensitive-ack-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.scope-item-sensitive {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  padding: 8px 10px;
}

.scope-item-sensitive .scope-dot {
  background: var(--danger);
}

.scope-item-sensitive .scope-name {
  color: var(--danger);
}

.scope-sensitive-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
}

.oauth-deny-warning {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--danger);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
}

/* Buttons */
.oauth-actions {
  display: flex;
  gap: 10px;
  width: 100%;
}

.oauth-btn {
  flex: 1;
  padding: 11px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, opacity 0.15s;
}

.oauth-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.oauth-btn-allow {
  background: var(--accent);
  color: #fff;
}

.oauth-btn-allow:hover:not(:disabled) { background: var(--accent-hover); }

.oauth-btn-deny {
  background: var(--danger-strong);
  color: #fff;
}

.oauth-btn-deny:hover:not(:disabled) { background: var(--danger-stronger); }
</style>
