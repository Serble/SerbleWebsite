<script>
import { ref, inject, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getTotpQrCode, checkTotpCode, editUser } from '@/assets/js/serble.js';

export default {
  setup() {
    const user    = ensureLoggedIn();
    const router  = useRouter();
    const userStore = inject('userStore');

    const qrSrc    = ref(null);
    const qrError  = ref(false);
    const code     = ref('');
    const error    = ref('');      // '' | 'invalid-code' | 'enable-failed'
    const working  = ref(false);

    // Load QR code asynchronously after mount
    onMounted(async () => {
      try {
        qrSrc.value = await getTotpQrCode();
      } catch {
        qrError.value = true;
      }
    });

    async function submit() {
      if (!code.value.trim() || working.value) return;
      error.value = '';
      working.value = true;

      // 1. Verify the code is correct
      const checkRes = await checkTotpCode(code.value.trim());
      if (!checkRes || !checkRes.valid) {
        error.value = 'invalid-code';
        working.value = false;
        return;
      }

      // 2. Persist the enablement on the account (mirrors Enable2Fa() in Razor)
      const editRes = await editUser([{ field: 'TotpEnabled', newValue: 'true' }]);
      if (!editRes.success) {
        error.value = 'enable-failed';
        working.value = false;
        return;
      }

      // Update in-memory user store so account page badge updates immediately
      if (userStore?.state?.user) {
        userStore.updateUser({ ...userStore.state.user, totpEnabled: true });
      }

      router.push('/account');
    }

    function handleKey(e) {
      if (e.key === 'Enter') submit();
    }

    return { user, qrSrc, qrError, code, error, working, submit, handleKey };
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
            v-if="qrSrc"
            :src="qrSrc"
            class="qr-img"
            width="220"
            height="220"
            alt="TOTP QR Code"
          />
          <div v-else-if="qrError" class="qr-error">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16" class="text-danger mb-2">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
            </svg>
            <p class="text-muted" style="font-size:0.82rem;">Failed to load QR code.</p>
          </div>
          <div v-else class="qr-loading">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary">
              <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
            </svg>
          </div>
        </div>

        <!-- Warning -->
        <div class="totp-warning">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0 mt-1">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
          </svg>
          <span>{{ $t('totp-warning') }}</span>
        </div>
      </div>

      <!-- Right: code entry -->
      <div class="setup-card setup-right">
        <div class="setup-card-header">
          <img src="/images/icon.png" width="48" height="48" alt="Serble" class="setup-logo" />
          <h2 class="setup-title">{{ $t('2fa') }}</h2>
          <p class="setup-sub">Enter the 6-digit code from your authenticator app to confirm setup.</p>
        </div>

        <!-- Error -->
        <div v-if="error === 'invalid-code'" class="code-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1 flex-shrink-0">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
          </svg>
          {{ $t('invalid-code') }}
        </div>
        <div v-else-if="error === 'enable-failed'" class="code-error">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1 flex-shrink-0">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
          </svg>
          {{ $t('unknown-error-occured') }}
        </div>

        <!-- OTP input -->
        <div class="code-input-wrap">
          <label class="code-label">{{ $t('otp-code') }}</label>
          <input
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

        <button
          class="code-submit"
          :disabled="!code.trim() || working"
          @click="submit"
        >
          <svg v-if="working" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
          </svg>
          {{ $t('submit') }}
        </button>

        <RouterLink to="/account" class="cancel-link">← Back to account</RouterLink>
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

.setup-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  max-width: 820px;
}

@media (max-width: 680px) {
  .setup-inner {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.setup-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  background: rgba(37,99,235,0.15);
  color: #60a5fa;
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
  color: #f4f4f5;
  margin: 0;
}

.setup-sub {
  font-size: 0.82rem;
  color: #71717a;
  margin: 0;
  line-height: 1.5;
}

.setup-instructions {
  font-size: 0.85rem;
  color: #71717a;
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
  border: 2px solid #27272a;
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

/* Warning */
.totp-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.8rem;
  color: #fbbf24;
  line-height: 1.5;
}

/* Right side */
.code-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.83rem;
  color: #f87171;
  background: rgba(248,113,113,0.08);
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
  color: #71717a;
}

.code-input {
  background: #111113;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  padding: 12px 16px;
  outline: none;
  transition: border-color 0.15s;
}

.code-input::placeholder {
  color: #3f3f46;
  font-size: 0.9rem;
  letter-spacing: 0;
  font-weight: 400;
}

.code-input:focus { border-color: #6ea8fe; }
.code-input-error { border-color: #f87171 !important; }

.code-submit {
  width: 100%;
  padding: 11px;
  border-radius: 8px;
  background: #2563eb;
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

.code-submit:hover:not(:disabled) { background: #1d4ed8; }
.code-submit:disabled { opacity: 0.45; cursor: not-allowed; }

.cancel-link {
  font-size: 0.82rem;
  color: #52525b;
  text-decoration: none;
  text-align: center;
  transition: color 0.15s;
}

.cancel-link:hover { color: #a1a1aa; }

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }
</style>
