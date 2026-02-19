<script>
import { ref, inject, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { submitTotpCode } from '@/assets/js/serble.js';

export default {
  setup() {
    const userStore = inject('userStore');
    const router  = useRouter();
    const route   = useRoute();

    // Already logged in → redirect home
    if (userStore?.state?.user) {
      router.replace('/');
    }

    const mfaToken = route.query.mfa_token ?? null;
    const returnUrl = route.query.return_url ?? '/account';

    if (!mfaToken) {
      router.replace('/login');
    }

    const code        = ref('');
    const rememberMe  = ref(false);
    const error       = ref('');   // '' | 'invalid-code'
    const working     = ref(false);

    async function login() {
      if (!code.value.trim() || working.value) return;
      error.value = '';
      working.value = true;

      const resp = await submitTotpCode(mfaToken, code.value.trim());
      if (!resp) {
        error.value = 'invalid-code';
        working.value = false;
        return;
      }

      // submitTotpCode already sets access_token in localStorage.
      // If remember-me, also persist in a long-lived cookie.
      if (rememberMe.value) {
        const token = resp.token ?? resp;
        document.cookie = `access_token=${token}; max-age=${60 * 60 * 24 * 365}; path=/`;
      }

      window.location.href = returnUrl;
    }

    function handleKey(e) {
      if (e.key === 'Enter') login();
    }

    return { code, rememberMe, error, working, login, handleKey };
  }
};
</script>

<template>
  <div class="mfa-page">
    <div class="mfa-card">

      <!-- Header -->
      <div class="mfa-header">
        <img src="/images/icon.png" width="52" height="52" alt="Serble" class="mfa-logo" />
        <h1 class="mfa-title">{{ $t('2fa') }}</h1>
        <p class="mfa-sub">Enter the 6-digit code from your authenticator app.</p>
      </div>

      <!-- Error -->
      <div v-if="error === 'invalid-code'" class="mfa-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
        {{ $t('invalid-code') }}
      </div>

      <!-- Code input -->
      <div class="mfa-input-wrap">
        <label class="mfa-label">{{ $t('otp-code') }}</label>
        <input
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="mfa-input"
          :class="{ 'mfa-input-error': error === 'invalid-code' }"
          :placeholder="$t('otp-code')"
          v-model="code"
          @keydown="handleKey"
          autofocus
        />
      </div>

      <!-- Remember me -->
      <label class="mfa-remember">
        <input type="checkbox" v-model="rememberMe" class="mfa-checkbox" />
        <span>{{ $t('remember-me') }}</span>
      </label>

      <!-- Submit -->
      <button
        class="mfa-submit"
        :disabled="!code.trim() || working"
        @click="login"
      >
        <svg v-if="working" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
        {{ $t('sign-in') }}
      </button>

      <RouterLink to="/login" class="mfa-back">← {{ $t('login') }}</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.mfa-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.mfa-card {
  width: 100%;
  max-width: 380px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.mfa-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.mfa-logo {
  border-radius: 10px;
}

.mfa-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f4f4f5;
  margin: 0;
}

.mfa-sub {
  font-size: 0.82rem;
  color: #71717a;
  margin: 0;
  line-height: 1.5;
}

.mfa-error {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.83rem;
  color: #f87171;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 7px;
  padding: 8px 12px;
}

.mfa-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mfa-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #71717a;
}

.mfa-input {
  background: #111113;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.35em;
  text-align: center;
  padding: 12px 16px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}

.mfa-input::placeholder {
  color: #3f3f46;
  font-size: 0.9rem;
  letter-spacing: 0;
  font-weight: 400;
}

.mfa-input:focus { border-color: #6ea8fe; }
.mfa-input-error { border-color: #f87171 !important; }

.mfa-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #a1a1aa;
  cursor: pointer;
  user-select: none;
}

.mfa-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #2563eb;
  cursor: pointer;
}

.mfa-submit {
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

.mfa-submit:hover:not(:disabled) { background: #1d4ed8; }
.mfa-submit:disabled { opacity: 0.45; cursor: not-allowed; }

.mfa-back {
  font-size: 0.82rem;
  color: #52525b;
  text-decoration: none;
  text-align: center;
  transition: color 0.15s;
}

.mfa-back:hover { color: #a1a1aa; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }
</style>
