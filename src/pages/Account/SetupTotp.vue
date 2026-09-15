<script>
import { ref, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { beginTotp, verifyTotp, renameCredential, getCredentials, setLoginFlows, getUser, getAuthToken } from '@/assets/js/serble.js';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { LoadingSpinner, Icon },
  setup() {
    const user    = ensureLoggedIn();
    const router  = useRouter();
    const userStore = inject('userStore');

    const enrolment = ref(null);   // { id, secret, qrPng }
    const loadError = ref(false);
    const name     = ref('');
    const code     = ref('');
    const error    = ref('');      // '' | 'invalid-code' | 'enable-failed' | 'too-many-attempts'
    const working  = ref(false);
    const copied   = ref(false);
    // Offered when the account signs in with a password alone, which is what enabling 2FA used to mean.
    const canRequire = ref(false);
    const requireWithPassword = ref(true);
    let flows = [];

    onMounted(async () => {
      const [started, overview] = await Promise.all([beginTotp(), getCredentials()]);
      if (!started.success) {
        if (started.error === 'reauth-cancelled') {
          router.push({ path: '/account', query: { tab: 'security' } });
          return;
        }
        loadError.value = true;
        return;
      }
      enrolment.value = started.data;
      if (overview.success) {
        flows = overview.data.flows.map(f => f.methods);
        canRequire.value = flows.some(f => f.length === 1 && f[0] === 'password');
      }
    });

    async function copySecret() {
      try {
        await navigator.clipboard.writeText(enrolment.value?.secret ?? '');
        copied.value = true;
        setTimeout(() => { copied.value = false; }, 2000);
      } catch {
        // Clipboard unavailable; the key is still visible to copy by hand.
      }
    }

    async function submit() {
      if (!code.value.trim() || working.value || !enrolment.value) return;
      error.value = '';
      working.value = true;

      const verified = await verifyTotp(enrolment.value.id, code.value.trim());
      if (!verified.success) {
        working.value = false;
        error.value = verified.status === 429 ? 'too-many-attempts' : 'invalid-code';
        return;
      }

      if (name.value.trim()) await renameCredential(enrolment.value.id, name.value.trim());

      if (canRequire.value && requireWithPassword.value) {
        const updated = flows.map(f => (f.length === 1 && f[0] === 'password') ? ['password', 'totp'] : f);
        const result = await setLoginFlows(updated);
        if (!result.success) {
          working.value = false;
          error.value = 'enable-failed';
          return;
        }
      }

      const fresh = await getUser(getAuthToken());
      if (fresh && userStore?.updateUser) userStore.updateUser(fresh);

      router.push({ path: '/account', query: { tab: 'security' } });
    }

    function handleKey(e) {
      if (e.key === 'Enter') submit();
    }

    return {
      user, enrolment, loadError, name, code, error, working, copied, canRequire, requireWithPassword,
      copySecret, submit, handleKey,
    };
  }
};
</script>

<template>
  <div class="setup-page">
    <div class="setup-inner">

      <!-- Left: instructions + QR -->
      <div class="setup-card setup-left">
        <div class="setup-card-header">
          <div class="setup-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
            </svg>
          </div>
          <h2 class="setup-title">{{ $t('setup-totp-app') }}</h2>
        </div>

        <p class="setup-instructions">{{ $t('setup-totp-instructions') }}</p>

        <!-- QR Code -->
        <div class="qr-wrap">
          <img
            v-if="enrolment"
            :src="'data:image/png;base64,' + enrolment.qrPng"
            class="qr-img"
            width="220"
            height="220"
            :alt="$t('totp-qr-alt')"
          />
          <div v-else-if="loadError" class="qr-error">
            <Icon name="alert" :size="28" />
            <p class="text-muted" style="font-size:0.82rem;">{{ $t('qr-load-failed') }}</p>
          </div>
          <div v-else class="qr-loading">
            <LoadingSpinner :size="32" class="text-accent" />
          </div>
        </div>

        <div v-if="enrolment" class="manual-key">
          <span class="code-label">{{ $t('totp-manual-key') }}</span>
          <div class="manual-key-row">
            <code class="manual-key-value">{{ enrolment.secret }}</code>
            <button type="button" class="btn btn-ghost btn-sm" @click="copySecret">
              {{ copied ? $t('copied') : $t('copy') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Right: code entry -->
      <div class="setup-card setup-right">
        <div class="setup-card-header">
          <img src="/images/icon.png" width="48" height="48" :alt="$t('serble')" class="setup-logo" />
          <h2 class="setup-title">{{ $t('2fa') }}</h2>
          <p class="setup-sub">{{ $t('totp-enter-code-setup') }}</p>
        </div>

        <div v-if="error" class="code-error">
          <Icon name="alert" :size="13" />
          {{ $t(error === 'enable-failed' ? 'unknown-error-occured' : error) }}
        </div>

        <div class="code-input-wrap">
          <label class="code-label" for="totp-name">{{ $t('authenticator-name') }}</label>
          <input id="totp-name" v-model="name" type="text" class="input" maxlength="255" :placeholder="$t('authenticator-app')">
        </div>

        <div class="code-input-wrap">
          <label class="code-label" for="totp-code">{{ $t('otp-code') }}</label>
          <input
            id="totp-code"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            class="code-input"
            :class="{ 'code-input-error': error === 'invalid-code' }"
            :placeholder="$t('otp-code')"
            v-model="code"
            @keydown="handleKey"
            autofocus
          />
        </div>

        <label v-if="canRequire" class="require-toggle">
          <input v-model="requireWithPassword" type="checkbox">
          <span>{{ $t('require-totp-with-password') }}</span>
        </label>

        <button
          class="code-submit"
          :disabled="!code.trim() || working || !enrolment"
          @click="submit"
        >
          <LoadingSpinner v-if="working" class="me-2" />
          <Icon v-else name="check" :size="14" class="me-2" />
          {{ $t('submit') }}
        </button>

        <RouterLink :to="{ path: '/account', query: { tab: 'security' } }" class="cancel-link"><Icon name="arrowLeft" /> {{ $t('back-to-account') }}</RouterLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.setup-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

/* The left card carries the QR plus a long instruction paragraph, so it needs
   noticeably more room than the right one, which is just a code field. */
.setup-inner {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 940px;
}

@media (max-width: 820px) {
  .setup-inner {
    grid-template-columns: 1fr;
    max-width: 480px;
  }
}

/* Cards */
.setup-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* The right card is much shorter than the left, so centre it in the shared row
   height instead of leaving a block of empty space below it. */
.setup-right {
  justify-content: center;
}

.setup-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.setup-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--accent-ring);
  color: var(--accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
}

.setup-logo {
  border-radius: 10px;
}

.setup-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.setup-sub {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.5;
}

.setup-instructions {
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1.65;
  margin: 0;
}

/* QR */
.qr-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
}

.qr-img {
  border-radius: 10px;
  border: 2px solid var(--border);
  image-rendering: pixelated;
  background: #fff;
  padding: 8px;
}

.qr-loading,
.qr-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.manual-key {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.manual-key-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.manual-key-value {
  flex: 1;
  font-size: 0.82rem;
  word-break: break-all;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
}

.require-toggle {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.83rem;
  color: var(--text-dim);
}

/* Right side */
.code-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.83rem;
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 7px;
  padding: 8px 12px;
}

.code-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.code-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-dim);
}

/* line-height must be set explicitly: base.css gives inputs `font: inherit`,
   which drags in body's 1.6 and makes a large-font field absurdly tall. */
.code-input {
  background: var(--surface-sunken);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  color: var(--text);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.3em;
  text-indent: 0.3em; /* offsets the trailing letter-spacing so text stays centred */
  text-align: center;
  padding: 11px 16px;
  width: 100%;
  transition: border-color 0.15s;
}

.code-input::placeholder {
  color: var(--border-strong);
  font-size: 0.9rem;
  letter-spacing: 0;
  text-indent: 0;
  font-weight: 400;
}

.code-input:focus { border-color: var(--accent-light); }
.code-input-error { border-color: var(--danger) !important; }

.code-submit {
  width: 100%;
  padding: 11px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, opacity 0.15s;
}

.code-submit:hover:not(:disabled) { background: var(--accent-hover); }
.code-submit:disabled { opacity: 0.45; cursor: not-allowed; }

.cancel-link {
  font-size: 0.82rem;
  color: var(--text-faint);
  text-decoration: none;
  text-align: center;
  transition: color 0.15s;
}

.cancel-link:hover { color: var(--text-muted); }

</style>
