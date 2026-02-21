<script>
import { loginUser, loginWithPasskey } from "@/assets/js/serble.js";
import { inject, ref } from 'vue';
import { useRoute } from 'vue-router';
import router from "@/router/index.js";

export default {
  setup() {
    const userStore = inject('userStore');
    const route = useRoute();

    if (userStore.state.user) {
      router.push('/');
    }

    const username      = ref('');
    const password      = ref('');
    const rememberMe    = ref(false);
    const error         = ref(0);
    const working       = ref(false);
    const passkeyError  = ref('');
    const passkeyWorking = ref(false);

    async function login() {
      if (working.value) return;
      error.value = 0;
      working.value = true;

      const resp = await loginUser(username.value, password.value);
      working.value = false;

      if (!resp) {
        error.value = 2;
        return;
      }

      if (resp.mfa_required) {
        const search = window.location.search;
        window.location.href = '/mfa?mfa_token=' + resp.mfa_token + (search ? '&' + search.slice(1) : '');
        return;
      }

      const returnUrl = route.query.return_url ?? '/';
      window.location.href = returnUrl;
    }

    async function passkeyLogin() {
      if (passkeyWorking.value) return;
      passkeyError.value = '';
      passkeyWorking.value = true;

      const result = await loginWithPasskey(username.value);
      passkeyWorking.value = false;

      if (!result.success) {
        if (result.error === 'cancelled') {
          passkeyError.value = 'Passkey sign-in was cancelled.';
        } else if (result.error === 'webauthn-unavailable') {
          passkeyError.value = 'Passkeys are not available. This page must be served over HTTPS.';
        } else {
          passkeyError.value = 'Passkey sign-in failed. Please try again.';
        }
        return;
      }

      const returnUrl = route.query.return_url ?? '/';
      window.location.href = returnUrl;
    }

    function handleKey(e) {
      if (e.key === 'Enter') login();
    }

    return { username, password, rememberMe, error, working, login, handleKey, passkeyLogin, passkeyWorking, passkeyError };
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Header -->
      <div class="auth-header">
        <img src="/images/icon.png" width="52" height="52" alt="Serble" class="auth-logo" />
        <h1 class="auth-title">{{ $t('sign-in') }}</h1>
        <p class="auth-sub">Welcome back to Serble.</p>
      </div>

      <!-- Error banner -->
      <div v-if="error === 1" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ $t('username-password-required') }}
      </div>
      <div v-else-if="error === 2" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ $t('invalid-creds-need-account') }}
        <RouterLink to="/register" class="auth-error-link">{{ $t('register') }}</RouterLink>
      </div>
      <div v-else-if="error === 3" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ $t('account-disabled') }}
      </div>

      <!-- Fields -->
      <div class="auth-fields">
        <div class="auth-field">
          <label class="auth-label" for="username">{{ $t('username') }}</label>
          <input
            id="username"
            type="text"
            class="auth-input"
            :class="{ 'auth-input-error': error === 2 }"
            :placeholder="$t('username')"
            v-model="username"
            autocomplete="username"
            @keydown="handleKey"
          />
        </div>

        <div class="auth-field">
          <label class="auth-label" for="password">{{ $t('password') }}</label>
          <input
            id="password"
            type="password"
            class="auth-input"
            :class="{ 'auth-input-error': error === 2 }"
            placeholder="••••••••••••"
            v-model="password"
            autocomplete="current-password"
            @keydown="handleKey"
          />
        </div>
      </div>

      <!-- Remember me -->
      <label class="auth-remember">
        <input type="checkbox" v-model="rememberMe" class="auth-checkbox" />
        <span>{{ $t('remember-me') }}</span>
      </label>

      <!-- Submit -->
      <button class="auth-submit" :disabled="working" @click="login">
        <svg v-if="working" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
        {{ $t('sign-in') }}
      </button>

      <!-- Passkey divider -->
      <div class="auth-divider">
        <span class="auth-divider-text">or</span>
      </div>

      <!-- Passkey error -->
      <div v-if="passkeyError" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ passkeyError }}
      </div>

      <!-- Passkey login button -->
      <button class="auth-submit auth-passkey-btn" :disabled="passkeyWorking" @click="passkeyLogin">
        <svg v-if="passkeyWorking" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
        {{ $t('login-with-passkey') }}
      </button>

      <p class="auth-switch">
        {{ $t('dont-have-account') }}
        <RouterLink to="/register" class="auth-switch-link">{{ $t('register-for-free') }}</RouterLink>
      </p>

    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.auth-logo { border-radius: 10px; }

.auth-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #f4f4f5;
  margin: 0;
}

.auth-sub {
  font-size: 0.82rem;
  color: #71717a;
  margin: 0;
}

/* Error */
.auth-error {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 0.83rem;
  color: #f87171;
  background: rgba(248,113,113,0.08);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: 8px;
  padding: 9px 12px;
}

.auth-error-link {
  color: #fca5a5;
  text-decoration: underline;
  margin-left: 2px;
}

/* Fields */
.auth-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.auth-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #71717a;
}

.auth-input {
  background: #111113;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #f4f4f5;
  font-size: 0.95rem;
  padding: 10px 14px;
  outline: none;
  width: 100%;
  transition: border-color 0.15s;
}

.auth-input::placeholder { color: #52525b; }
.auth-input:focus { border-color: #6ea8fe; }
.auth-input-error { border-color: #f87171 !important; }

/* Remember me */
.auth-remember {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #a1a1aa;
  cursor: pointer;
  user-select: none;
}

.auth-checkbox {
  width: 15px;
  height: 15px;
  accent-color: #2563eb;
  cursor: pointer;
}

/* Submit */
.auth-submit {
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

.auth-submit:hover:not(:disabled) { background: #1d4ed8; }
.auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-passkey-btn {
  background: #27272a;
  color: #d4d4d8;
  border: 1px solid #3f3f46;
}
.auth-passkey-btn:hover:not(:disabled) { background: #3f3f46; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: -4px 0;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #27272a;
}
.auth-divider-text {
  font-size: 0.75rem;
  color: #52525b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Switch link */
.auth-switch {
  font-size: 0.82rem;
  color: #71717a;
  text-align: center;
  margin: 0;
}

.auth-switch-link {
  color: #60a5fa;
  text-decoration: none;
  font-weight: 500;
}

.auth-switch-link:hover { text-decoration: underline; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }
</style>