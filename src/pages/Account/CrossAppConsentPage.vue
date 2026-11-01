<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
  getCrossAppRequest,
  approveCrossAppRequest,
  denyCrossAppRequest,
} from '@/assets/js/serble.js';
import { crossAppScopeInfo } from '@/assets/js/crossApp.js';
import AuthCard from '@/components/AuthCard.vue';
import OfficialBadge from '@/components/OfficialBadge.vue';
import LoadingCard from '@/components/LoadingCard.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

// A caller app (client_id) wants to sign the user in to a target app. The API decides everything
// that matters - whether the pair is allowed, whether it needs asking at all - and this page only
// asks when it has to. `state` is the caller's and is passed through untouched.
const REQUIRED_PARAMS = ['client_id', 'target', 'redirect_uri'];

export default {
  components: { AuthCard, OfficialBadge, LoadingCard, LoadingSpinner, Icon },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();

    // state: 'loading' | 'ready' | 'working' | 'redirecting' | 'error'
    const state = ref('loading');
    const info = ref(null);
    const error = ref({ code: '', detail: '' });

    // Locale keys per error code; an unrecognised code falls back to 'unknown'.
    const errorMessages = {
      'missing-params':   'cross-app-err-missing-params',
      'bad-request':      'cross-app-err-bad-request',
      'forbidden':        'oidc-err-forbidden',
      'unknown':          'oidc-err-unknown',
    };

    function setError(code, detail = '') {
      state.value = 'error';
      error.value = { code, detail };
    }

    function failed(r) {
      if (r.flag === 'unauthenticated') {
        // The route requires a sign-in already, so this is a session that lapsed mid-flow.
        router.replace({ name: 'login', query: { return_url: route.fullPath } });
        return;
      }
      setError(errorMessages[r.flag] ? r.flag : 'unknown', r.message ?? (r.error ? `HTTP ${r.error}` : ''));
    }

    function followRedirect(url) {
      if (!url) {
        setError('unknown', t('oidc-detail-no-redirect'));
        return;
      }
      state.value = 'redirecting';
      window.location.href = url;
    }

    function requestBody() {
      const q = route.query;
      return {
        clientId: String(q.client_id ?? ''),
        target: String(q.target ?? ''),
        redirectUri: String(q.redirect_uri ?? ''),
        state: String(q.state ?? ''),
      };
    }

    onMounted(async () => {
      const missing = REQUIRED_PARAMS.filter(p => !route.query[p]);
      if (missing.length) {
        setError('missing-params', t('oauth-detail-missing', { params: missing.join(', ') }));
        return;
      }

      const body = requestBody();
      const r = await getCrossAppRequest(body.clientId, body.target, body.redirectUri, body.state);
      if (!r.success) {
        failed(r);
        return;
      }
      info.value = r.request ?? {};

      // The target's policy refuses this caller, or the user may not use one of the apps - the
      // API has already built the error redirect for the caller.
      if (info.value.denied) {
        followRedirect(info.value.redirect);
        return;
      }

      // Two official apps, or a pair the user already approved - no screen to show. Stays on the
      // loading card so the consent screen never flashes up.
      if (info.value.autoApprove) {
        await decide(true, true);
        return;
      }

      state.value = 'ready';
    });

    async function decide(approve, silent = false) {
      if (state.value === 'working' || state.value === 'redirecting') return;
      if (!silent) state.value = 'working';
      const fn = approve ? approveCrossAppRequest : denyCrossAppRequest;
      const r = await fn(requestBody());
      if (!r.success) {
        failed(r);
        return;
      }
      followRedirect(r.redirect);
    }

    const callerName = computed(() => info.value?.callerName || info.value?.callerId || '');
    const targetName = computed(() => info.value?.targetName || info.value?.targetId || '');
    const scopes = computed(() => (Array.isArray(info.value?.scopes) ? info.value.scopes : [])
      .map(id => crossAppScopeInfo(id)));

    // As on the legacy authorize page: sensitive permissions from an app that isn't official
    // need an explicit acknowledgement before Approve unlocks.
    const showSensitive = computed(() => !info.value?.callerIsOfficial && scopes.value.some(s => s.sensitive));
    const acknowledged = ref(false);

    return {
      state, info, error, errorMessages,
      callerName, targetName, scopes, showSensitive, acknowledged,
      decide,
    };
  }
};
</script>

<template>
  <!-- Loading -->
  <!-- LoadingCard falls back to the translated "loading" caption when text is null. -->
  <div v-if="state === 'loading' || state === 'redirecting'" class="xapp-page">
    <LoadingCard :text="state === 'redirecting' ? $t('redirecting') : null" />
  </div>

  <!-- Error -->
  <div v-else-if="state === 'error'" class="xapp-page">
    <div class="xapp-card-error">
      <div class="xapp-error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>

      <h2 class="xapp-error-title">{{ $t('sign-in-unavailable') }}</h2>
      <p class="xapp-error-sub">{{ $t(errorMessages[error.code] ?? errorMessages.unknown) }}</p>

      <div class="xapp-error-detail">
        <div class="error-detail-row">
          <span class="error-detail-label">{{ $t('error-code') }}</span>
          <code class="error-detail-value error-code-badge">{{ error.code || 'unknown' }}</code>
        </div>
        <div class="error-detail-row" v-if="error.detail">
          <span class="error-detail-label">{{ $t('detail') }}</span>
          <pre class="error-detail-value error-detail-pre">{{ error.detail }}</pre>
        </div>
      </div>

      <RouterLink to="/" class="xapp-back-link"><Icon name="arrowLeft" /> {{ $t('back-to-home') }}</RouterLink>
    </div>
  </div>

  <!-- Consent UI -->
  <AuthCard v-else :title="$t('cross-app-consent-title')">
    <i18n-t keypath="cross-app-consent-heading" tag="p" class="xapp-heading" scope="global">
      <template #caller><strong>{{ callerName }}</strong></template>
      <template #target><strong>{{ targetName }}</strong></template>
    </i18n-t>

    <!-- The two apps, caller first: the arrow reads "signs you in to". -->
    <div class="xapp-pair">
      <div class="xapp-app">
        <div class="xapp-app-icon">{{ (callerName || '?').charAt(0).toUpperCase() }}</div>
        <div class="xapp-app-text">
          <span class="xapp-app-role">{{ $t('cross-app-requesting-app') }}</span>
          <span class="xapp-app-name">
            {{ callerName }}
            <OfficialBadge v-if="info.callerIsOfficial" />
          </span>
          <span v-if="info.callerDescription" class="xapp-app-desc">{{ info.callerDescription }}</span>
        </div>
      </div>

      <div class="xapp-arrow" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1"/>
        </svg>
      </div>

      <div class="xapp-app">
        <div class="xapp-app-icon">{{ (targetName || '?').charAt(0).toUpperCase() }}</div>
        <div class="xapp-app-text">
          <span class="xapp-app-role">{{ $t('cross-app-target-app') }}</span>
          <span class="xapp-app-name">
            {{ targetName }}
            <OfficialBadge v-if="info.targetIsOfficial" />
          </span>
          <span v-if="info.targetDescription" class="xapp-app-desc">{{ info.targetDescription }}</span>
        </div>
      </div>
    </div>

    <div class="alert alert-warning xapp-warning" role="note">
      <Icon name="alert" />
      <i18n-t keypath="cross-app-consent-warning" tag="span" scope="global">
        <template #caller><strong>{{ callerName }}</strong></template>
        <template #target><strong>{{ targetName }}</strong></template>
      </i18n-t>
    </div>

    <div class="xapp-scopes">
      <p class="scopes-heading">{{ $t('cross-app-consent-scopes-heading', { target: targetName }) }}</p>
      <ul v-if="scopes.length" class="scope-list">
        <li
          v-for="s in scopes"
          :key="s.id"
          class="scope-item"
          :class="{ 'scope-item-sensitive': showSensitive && s.sensitive }"
        >
          <div class="scope-text">
            <span class="scope-name">
              {{ s.nameKey ? $t(s.nameKey) : s.id }}
              <span v-if="showSensitive && s.sensitive" class="scope-sensitive-tag">{{ $t('sensitive') }}</span>
            </span>
            <span v-if="s.descKey" class="scope-desc">{{ $t(s.descKey) }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="no-scopes">{{ $t('no-permissions-requested') }}</p>
    </div>

    <!-- Sensitive scope acknowledgement (skipped for official callers) -->
    <label v-if="showSensitive" class="check xapp-ack">
      <input v-model="acknowledged" type="checkbox">
      <span>{{ $t('sensitive-scope-warning') }}</span>
    </label>

    <p v-if="info.alreadyGranted" class="xapp-note">{{ $t('cross-app-already-granted') }}</p>
    <p class="xapp-deny-hint">{{ $t('oidc-deny-hint') }}</p>

    <div class="xapp-actions">
      <button
        class="btn btn-primary btn-lg"
        :disabled="state === 'working' || (showSensitive && !acknowledged)"
        @click="decide(true)"
      >
        <Icon v-if="state !== 'working'" name="check" />
        <LoadingSpinner v-else />
        {{ $t('approve') }}
      </button>
      <button
        class="btn btn-danger btn-lg"
        :disabled="state === 'working'"
        @click="decide(false)"
      >
        <Icon name="close" />
        {{ $t('deny') }}
      </button>
    </div>
  </AuthCard>
</template>

<style scoped>
.xapp-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

/* -- Error state (as on the other consent pages) -- */
.xapp-card-error {
  width: 100%;
  max-width: 560px;
  background: var(--surface);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius);
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.xapp-error-icon { color: var(--danger); display: flex; justify-content: center; }
.xapp-error-title {
  font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; color: var(--text); margin: 0; text-align: center;
}
.xapp-error-sub {
  font-size: 0.85rem; color: var(--text-dim); margin: 0; text-align: center; line-height: 1.6;
}
.xapp-error-detail {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.error-detail-row { display: flex; align-items: flex-start; gap: 12px; }
.error-detail-label {
  font-family: var(--font-mono); font-size: 0.74rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-faint); min-width: 88px; flex-shrink: 0; padding-top: 2px;
}
.error-detail-value { font-size: 0.83rem; color: var(--text-secondary); word-break: break-all; }
.error-code-badge {
  background: var(--danger-bg); color: var(--danger);
  padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;
}
.error-detail-pre {
  font-family: monospace; font-size: 0.8rem; color: var(--text-muted);
  white-space: pre-wrap; word-break: break-all; margin: 0;
  background: transparent; border: none; padding: 0;
}
.xapp-back-link { font-size: 0.82rem; color: var(--text-dim); text-decoration: none; align-self: flex-start; }
.xapp-back-link:hover { color: var(--text-muted); }

/* -- Consent -- */
.xapp-heading {
  font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; margin: 0; text-align: center;
}
.xapp-heading strong { color: var(--text); }

.xapp-pair { display: flex; flex-direction: column; align-items: stretch; gap: 6px; }

.xapp-app {
  display: flex; align-items: flex-start; gap: 12px;
  background: var(--surface-sunken); border: 1px solid var(--border);
  border-radius: 10px; padding: 12px 14px;
}
.xapp-app-icon {
  width: 40px; height: 40px; flex-shrink: 0; border-radius: var(--radius);
  background: var(--surface-raised); border: 1px solid var(--border-strong);
  color: var(--accent-light); font-size: 1.1rem; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.xapp-app-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.xapp-app-role {
  font-family: var(--font-mono); font-size: 0.7rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-faint);
}
.xapp-app-name {
  display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px;
  font-size: 0.95rem; font-weight: 600; color: var(--text); word-break: break-word;
}
.xapp-app-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.45; word-break: break-word; }

.xapp-arrow { display: flex; justify-content: center; color: var(--text-faint); }

.xapp-warning { margin: 0; line-height: 1.5; flex-wrap: nowrap; align-items: flex-start; }
.xapp-warning svg { margin-top: 2px; }

.xapp-scopes {
  width: 100%; background: var(--surface-sunken); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px 16px;
}
.scopes-heading {
  font-family: var(--font-mono); font-size: 0.74rem; font-weight: 500; letter-spacing: 0.02em; color: var(--text-faint); margin: 0 0 10px;
}
.scope-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.scope-item { display: flex; align-items: flex-start; gap: 10px; }
.scope-text { display: flex; flex-direction: column; gap: 2px; }
.scope-name { font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); }
.scope-desc { font-size: 0.77rem; color: var(--text-faint); line-height: 1.4; }
.no-scopes { font-size: 0.85rem; color: var(--text-faint); margin: 0; }

.scope-item-sensitive {
  background: var(--danger-bg); border: 1px solid var(--danger-border);
  border-radius: 8px; padding: 8px 10px;
}
.scope-item-sensitive .scope-name { color: var(--danger); }
.scope-sensitive-tag {
  display: inline-block; margin-left: 6px;
  font-family: var(--font-mono); font-size: 0.72rem; font-weight: 500; letter-spacing: 0.02em;
  color: var(--danger); vertical-align: middle;
}

.xapp-ack {
  align-items: flex-start;
  color: var(--danger); font-size: 0.8rem; font-weight: 600; line-height: 1.4;
  background: var(--danger-bg); border: 1px solid var(--danger-border);
  border-radius: 8px; padding: 12px 14px;
}
.xapp-ack input[type='checkbox'] { margin-top: 1px; accent-color: var(--danger); }

.xapp-note { font-size: 0.8rem; color: var(--text-dim); margin: 0; text-align: center; }

.xapp-deny-hint {
  font-family: var(--font-mono); font-size: 0.76rem; font-weight: 500; color: var(--danger);
  letter-spacing: 0.02em; margin: 0; text-align: center;
}

.xapp-actions { display: flex; gap: 10px; }
.xapp-actions .btn { flex: 1; }
</style>
