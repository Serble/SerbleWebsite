<script>
import { ref, computed, onMounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPublicAppInfo, authorizeApp } from '@/assets/js/serble.js';
import { filterInvalidScopes, scopeIdsToString, isSensitiveScope } from '@/assets/js/scopes.js';
import OfficialBadge from '@/components/OfficialBadge.vue';
import LoadingCard from '@/components/LoadingCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

// Note: `response_type` is intentionally NOT required. The legacy Serble OAuth
// flow always issues an authorization code and never reads response_type, so
// requiring it only rejects otherwise-valid requests.
const REQUIRED_PARAMS = ['redirect_uri', 'client_id', 'scope', 'state'];

export default {
  components: { OfficialBadge, LoadingCard, LoadingSpinner, Icon },
  setup() {
    const user = ensureLoggedIn();
    const route  = useRoute();
    const router = useRouter();
    const userStore = inject('userStore');
    const { t } = useI18n();

    // state: 'loading' | 'ready' | 'working' | 'error'
    const state    = ref('loading');
    const app      = ref(null);        // PublicOAuthApp
    const scopeIds = ref([]);          // ids of the requested valid scopes
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

    // Locale keys for each error code. A code with no entry here (a server that
    // knows an error this build doesn't) simply shows no explanation line.
    const errorMessages = {
      'missing-params':         'oauth-err-missing-params',
      'app-not-found':          'oauth-err-app-not-found',
      'redirect-uri-mismatch':  'oauth-err-redirect-uri-mismatch',
      'bad-app':                'oauth-err-bad-app',
      'unknown':                'oauth-err-unknown',
    };

    onMounted(async () => {
      const q = route.query;

      // 1. Check all required params are present
      const missing = REQUIRED_PARAMS.filter(p => !q[p]);
      if (missing.length) {
        setError('missing-params', t('oauth-detail-missing', { params: missing.join(', ') }), q);
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
      scopeIds.value     = validIds;

      // 4. Official apps are trusted outright - auto-allow (the grant is still recorded,
      //    so it appears on the authorized apps page).
      if (appIsOfficial.value) {
        await doAuthorize(true, true);
        return;
      }

      // 5. Check if already authorized - auto-allow only if no new scopes are requested.
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
        setError('redirect-uri-mismatch', t('oauth-detail-bad-uri', { uri: q.redirect_uri }), q);
        return;
      }

      // Check redirect_uri is in app's allowed list
      const validUris = (app.value.redirectUri ?? app.value.RedirectUri ?? '').split(';').map(u => u.trim());
      if (!validUris.includes(q.redirect_uri)) {
        setError(
          'redirect-uri-mismatch',
          t('oauth-detail-uri-mismatch', { provided: q.redirect_uri, allowed: validUris.join(', ') }),
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
    const hasSensitiveScopes = computed(() => scopeIds.value.some(isSensitiveScope));
    // Only warn / require acknowledgement for non-official apps.
    const showSensitive = computed(() => hasSensitiveScopes.value && !appIsOfficial.value);
    const acknowledged = ref(false);

    return { state, app, appName, appIsOfficial, scopeIds, error, errorMessages, doAuthorize, isSensitiveScope, hasSensitiveScopes, showSensitive, acknowledged };
  }
};
</script>

<template>
  <div class="oauth-page">

    <!-- Loading -->
    <LoadingCard v-if="state === 'loading'" />

    <!-- Error (inline, no redirect) -->
    <div v-else-if="state === 'error'" class="oauth-card oauth-card-error">

      <div class="oauth-error-icon">
        <Icon name="alert" :size="44" />
      </div>

      <h2 class="oauth-error-title">{{ $t('invalid-oauth') }}</h2>
      <p class="oauth-error-sub">{{ $t('invalid-oauth-message') }}</p>

      <!-- Error detail card -->
      <div class="oauth-error-detail">
        <div class="error-detail-row">
          <span class="error-detail-label">{{ $t('error-code') }}</span>
          <code class="error-detail-value error-code-badge">{{ error.code || 'unknown' }}</code>
        </div>
        <div class="error-detail-row" v-if="error.detail">
          <span class="error-detail-label">{{ $t('detail') }}</span>
          <pre class="error-detail-value error-detail-pre">{{ error.detail }}</pre>
        </div>
        <div v-if="errorMessages[error.code]" class="error-detail-row">
          <span class="error-detail-label">{{ $t('explanation') }}</span>
          <span class="error-detail-value">{{ $t(errorMessages[error.code]) }}</span>
        </div>
      </div>

      <!-- Query params dump -->
      <div v-if="error.params && Object.keys(error.params).length" class="oauth-params-dump">
        <p class="params-heading">{{ $t('request-parameters') }}</p>
        <div class="params-grid">
          <template v-for="(val, key) in error.params" :key="key">
            <code class="param-key">{{ key }}</code>
            <code class="param-val">{{ val }}</code>
          </template>
        </div>
      </div>

      <RouterLink to="/" class="oauth-back-link"><Icon name="arrowLeft" /> {{ $t('back-to-home') }}</RouterLink>
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
        {{ $t('oauth-warning', { app: appName }) }}
      </p>

      <!-- Scope list -->
      <div class="oauth-scopes">
        <p class="scopes-heading">{{ $t('scopes') }}</p>

        <ul v-if="scopeIds.length" class="scope-list">
          <li
            v-for="id in scopeIds"
            :key="id"
            class="scope-item"
            :class="{ 'scope-item-sensitive': showSensitive && isSensitiveScope(id) }"
          >
            <div class="scope-text">
              <span class="scope-name">
                {{ $t(`scope-${id}`) }}
                <span v-if="showSensitive && isSensitiveScope(id)" class="scope-sensitive-tag">{{ $t('sensitive') }}</span>
              </span>
              <span class="scope-desc">{{ $t(`scope-${id}-desc`) }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="no-scopes">{{ $t('none') }}</p>
      </div>

      <!-- Sensitive scope acknowledgement (skipped for official apps) -->
      <label v-if="showSensitive" class="sensitive-ack" :class="{ 'sensitive-ack-checked': acknowledged }">
        <input type="checkbox" v-model="acknowledged" class="sensitive-ack-input">
        <span class="sensitive-ack-box" aria-hidden="true">
          <Icon v-if="acknowledged" name="check" :size="14" />
        </span>
        <span class="sensitive-ack-text">
          <Icon name="warning" :size="18" class="sensitive-ack-icon" />
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
          <Icon v-if="state !== 'working'" name="check" :size="18" class="me-2" />
          <LoadingSpinner v-else class="me-2" />
          {{ $t('allow') }}
        </button>
        <button
          class="oauth-btn oauth-btn-deny"
          :disabled="state === 'working'"
          @click="doAuthorize(false)"
        >
          <Icon name="close" :size="18" class="me-2" />
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

/* -- Card -- */
.oauth-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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

/* -- Error state -- */
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
  font-weight: 600;
  letter-spacing: -0.02em;
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
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
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
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
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

/* -- Auth UI -- */
.oauth-app-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.oauth-app-icon {
  width: 60px;
  height: 60px;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  color: var(--accent-light);
  font-size: 1.6rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oauth-app-name {
  font-size: 1.4rem;
  font-weight: 600;
  letter-spacing: -0.02em;
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
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
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

/* -- Sensitive scope highlighting -- */
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
  transition: border-color var(--t), background var(--t);
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
  transition: background var(--t);
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
  margin-top: calc((1lh - 18px) / 2); /* centre the icon on the first line of text */
}

.scope-item-sensitive {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  padding: 8px 10px;
}

.scope-item-sensitive .scope-name {
  color: var(--danger);
}

.scope-sensitive-tag {
  display: inline-block;
  margin-left: 6px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--danger);
  vertical-align: middle;
}

.oauth-deny-warning {
  font-family: var(--font-mono);
  font-size: 0.76rem;
  font-weight: 500;
  color: var(--danger);
  letter-spacing: 0.02em;
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
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--t), color var(--t), opacity var(--t), transform var(--t);
}

.oauth-btn:active:not(:disabled) { transform: scale(0.98); }

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
/* -- Phones --
   The card's border and padding cost a third of a phone's width, and the boxes inside it then
   made a card in a card. On a phone the page is the card: the content uses the full width, the
   inner boxes are the only boxes, and the two decisions stack as full-width buttons. */
@media (max-width: 560px) {
  .oauth-page {
    align-items: flex-start;
    min-height: 0;
    padding: 24px 16px 40px;
  }

  .oauth-card {
    background: none;
    border: none;
    border-radius: 0;
    padding: 0;
  }

  .oauth-actions {
    flex-direction: column;
    gap: 12px;
  }

  .oauth-btn {
    flex: none;
    width: 100%;
    min-height: 52px;
    font-size: 1rem;
  }

  .oauth-back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    font-size: 0.9rem;
  }

  /* the mono labels stay labels, but readable: 12px */
  .scopes-heading, .error-detail-label, .params-heading {
    font-size: 0.75rem;
  }
}
</style>
