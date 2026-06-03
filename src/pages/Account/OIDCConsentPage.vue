<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getOidcAuthorizeSession,
  approveOidcAuthorizeSession,
  denyOidcAuthorizeSession,
} from '@/assets/js/serble.js';

// Friendly descriptions for the standard OIDC scopes.
const SCOPE_DESCRIPTIONS = {
  openid: 'Sign you in to this application',
  profile: 'Access your basic profile (username, name)',
  email: 'See your email address',
  groups: 'See which groups you are a member of',
  offline_access: 'Stay signed in when you are away',
};

export default {
  setup() {
    const route = useRoute();
    const router = useRouter();

    // state: 'loading' | 'ready' | 'working' | 'redirecting' | 'error'
    const state = ref('loading');
    const sessionInfo = ref(null);
    const error = ref({ code: '', detail: '' });

    const sessionId = computed(() => route.query.session ?? '');

    const errorMessages = {
      'no-session':       'No consent session id was provided in the URL.',
      'expired':          'This consent request has expired or is invalid. Please retry signing in from the application.',
      'unauthenticated':  'Your session expired. Please sign in again.',
      'forbidden':        'You are not allowed to use this application.',
      'unknown':          'An unexpected error occurred. Please try again.',
    };

    function setError(code, detail = '') {
      state.value = 'error';
      error.value = { code, detail };
    }

    function describeScope(scope) {
      return SCOPE_DESCRIPTIONS[scope] ?? '';
    }

    function followRedirect(url) {
      if (!url) {
        setError('unknown', 'Server did not return a redirect URL.');
        return;
      }
      state.value = 'redirecting';
      window.location.href = url;
    }

    onMounted(async () => {
      const sid = sessionId.value;
      if (!sid) {
        setError('no-session');
        return;
      }

      const r = await getOidcAuthorizeSession(sid);
      if (!r.success) {
        if (r.flag === 'unauthenticated') {
          router.replace({ name: 'login', query: { return_url: route.fullPath } });
          return;
        }
        setError(r.flag ?? 'unknown', r.error ? `HTTP ${r.error}` : '');
        return;
      }

      sessionInfo.value = r.session;

      // Backend says user is denied — bounce back without showing UI.
      if (r.session?.denied) {
        followRedirect(r.session.redirect);
        return;
      }

      state.value = 'ready';
    });

    async function decide(approve) {
      if (state.value === 'working' || state.value === 'redirecting') return;
      state.value = 'working';
      const fn = approve ? approveOidcAuthorizeSession : denyOidcAuthorizeSession;
      const r = await fn(sessionId.value);
      if (!r.success) {
        if (r.flag === 'unauthenticated') {
          router.replace({ name: 'login', query: { return_url: route.fullPath } });
          return;
        }
        setError(r.flag ?? 'unknown', r.error ? `HTTP ${r.error}` : '');
        return;
      }
      followRedirect(r.redirect);
    }

    const appName = computed(() => sessionInfo.value?.appName ?? '');
    const appDescription = computed(() => sessionInfo.value?.appDescription ?? '');
    const scopes = computed(() => Array.isArray(sessionInfo.value?.scopes) ? sessionInfo.value.scopes : []);

    return {
      state, sessionInfo, error, errorMessages,
      appName, appDescription, scopes,
      describeScope, decide,
    };
  }
};
</script>

<template>
  <div class="oidc-page">

    <!-- Loading -->
    <div v-if="state === 'loading' || state === 'redirecting'" class="oidc-card">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary mb-3">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
      </svg>
      <p class="text-muted">{{ state === 'redirecting' ? 'Redirecting…' : 'Loading…' }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="state === 'error'" class="oidc-card oidc-card-error">
      <div class="oidc-error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>

      <h2 class="oidc-error-title">Sign-in unavailable</h2>
      <p class="oidc-error-sub">{{ errorMessages[error.code] ?? errorMessages.unknown }}</p>

      <div class="oidc-error-detail">
        <div class="error-detail-row">
          <span class="error-detail-label">Error code</span>
          <code class="error-detail-value error-code-badge">{{ error.code || 'unknown' }}</code>
        </div>
        <div class="error-detail-row" v-if="error.detail">
          <span class="error-detail-label">Detail</span>
          <pre class="error-detail-value error-detail-pre">{{ error.detail }}</pre>
        </div>
      </div>

      <RouterLink to="/" class="oidc-back-link">← Back to home</RouterLink>
    </div>

    <!-- Consent UI -->
    <div v-else class="oidc-card">
      <div class="oidc-app-header">
        <div class="oidc-app-icon">{{ (appName || '?').charAt(0).toUpperCase() }}</div>
        <h2 class="oidc-app-name">{{ appName }}</h2>
        <p v-if="appDescription" class="oidc-app-desc">{{ appDescription }}</p>
      </div>

      <p class="oidc-warning-text">
        <strong>{{ appName }}</strong> wants to sign you in with your Serble account.
        Only approve if you trust this application.
      </p>

      <div class="oidc-scopes">
        <p class="scopes-heading">This will let it</p>
        <ul v-if="scopes.length" class="scope-list">
          <li v-for="s in scopes" :key="s" class="scope-item">
            <div class="scope-dot"></div>
            <div class="scope-text">
              <span class="scope-name">{{ s }}</span>
              <span class="scope-desc">{{ describeScope(s) }}</span>
            </div>
          </li>
        </ul>
        <p v-else class="no-scopes">No specific permissions requested.</p>
      </div>

      <p class="oidc-deny-warning">If you didn't initiate this sign-in, click Deny.</p>

      <div class="oidc-actions">
        <button
          class="oidc-btn oidc-btn-allow"
          :disabled="state === 'working'"
          @click="decide(true)"
        >
          <svg v-if="state !== 'working'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
          Approve
        </button>
        <button
          class="oidc-btn oidc-btn-deny"
          :disabled="state === 'working'"
          @click="decide(false)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
          </svg>
          Deny
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.oidc-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.oidc-card {
  width: 100%;
  max-width: 480px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.oidc-card-error {
  max-width: 560px;
  text-align: left;
  align-items: stretch;
  border-color: #3f1515;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

.oidc-error-icon {
  color: #f87171;
  display: flex;
  justify-content: center;
}
.oidc-error-title {
  font-size: 1.5rem; font-weight: 800; color: #f4f4f5; margin: 0; text-align: center;
}
.oidc-error-sub {
  font-size: 0.85rem; color: #71717a; margin: 0; text-align: center; line-height: 1.6;
}
.oidc-error-detail {
  width: 100%;
  background: #111113;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.error-detail-row { display: flex; align-items: flex-start; gap: 12px; }
.error-detail-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #52525b; min-width: 88px; flex-shrink: 0; padding-top: 2px;
}
.error-detail-value { font-size: 0.83rem; color: #d4d4d8; word-break: break-all; }
.error-code-badge {
  background: rgba(248,113,113,0.1); color: #f87171;
  padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;
}
.error-detail-pre {
  font-family: monospace; font-size: 0.8rem; color: #a1a1aa;
  white-space: pre-wrap; word-break: break-all; margin: 0;
  background: transparent; border: none; padding: 0;
}
.oidc-back-link { font-size: 0.82rem; color: #71717a; text-decoration: none; align-self: flex-start; }
.oidc-back-link:hover { color: #a1a1aa; }

.oidc-app-header { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.oidc-app-icon {
  width: 60px; height: 60px; border-radius: 14px;
  background: linear-gradient(135deg, #2563eb, #7c3aed);
  color: #fff; font-size: 1.6rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.oidc-app-name { font-size: 1.4rem; font-weight: 800; color: #f4f4f5; margin: 0; }
.oidc-app-desc { font-size: 0.85rem; color: #a1a1aa; margin: 0; line-height: 1.5; }

.oidc-warning-text { font-size: 0.85rem; color: #71717a; line-height: 1.6; margin: 0; }

.oidc-scopes {
  width: 100%; background: #111113; border: 1px solid #27272a;
  border-radius: 10px; padding: 14px 16px; text-align: left;
}
.scopes-heading {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: #52525b; margin-bottom: 10px;
}
.scope-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.scope-item { display: flex; align-items: flex-start; gap: 10px; }
.scope-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; flex-shrink: 0; margin-top: 5px; }
.scope-text { display: flex; flex-direction: column; gap: 2px; }
.scope-name { font-size: 0.85rem; font-weight: 600; color: #d4d4d8; }
.scope-desc { font-size: 0.77rem; color: #52525b; line-height: 1.4; }
.no-scopes { font-size: 0.85rem; color: #52525b; margin: 0; }

.oidc-deny-warning {
  font-size: 0.78rem; font-weight: 700; color: #f87171;
  text-transform: uppercase; letter-spacing: 0.04em; margin: 0;
}

.oidc-actions { display: flex; gap: 10px; width: 100%; }
.oidc-btn {
  flex: 1; padding: 11px; border-radius: 8px;
  font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, opacity 0.15s;
}
.oidc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.oidc-btn-allow { background: #2563eb; color: #fff; }
.oidc-btn-allow:hover:not(:disabled) { background: #1d4ed8; }
.oidc-btn-deny { background: #dc2626; color: #fff; }
.oidc-btn-deny:hover:not(:disabled) { background: #b91c1c; }
</style>
