<script>
import { registerUser } from "@/assets/js/serble.js";
import { inject, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import router from "@/router/index.js";
import VueTurnstile from 'vue-turnstile';

export default {
  components: { VueTurnstile },
  setup() {
    const userStore = inject('userStore');
    const route = useRoute();

    if (userStore.state.user) {
      router.push('/');
    }

    const username   = ref('');
    const password   = ref('');
    const error      = ref(0);
    const working    = ref(false);
    const recapToken = ref('');

    const returnUrl = route.query.return_url ?? null;

    const loginLink = computed(() =>
      returnUrl ? { path: '/login', query: { return_url: returnUrl } } : '/login'
    );

    async function register() {
      if (working.value || !recapToken.value) return;
      error.value = 0;
      working.value = true;

      const resp = await registerUser(username.value, password.value, recapToken.value);
      working.value = false;

      if (!resp.success) {
        error.value = resp.error === 409 ? 2 : 1;
        return;
      }

      window.location.href = returnUrl ? `/login?return_url=${encodeURIComponent(returnUrl)}` : '/login';
    }

    function handleKey(e) {
      if (e.key === 'Enter') register();
    }

    return { username, password, error, working, recapToken, register, handleKey, loginLink };
  }
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">

      <!-- Header -->
      <div class="auth-header">
        <img src="/images/icon.png" width="52" height="52" alt="Serble" class="auth-logo" />
        <h1 class="auth-title">{{ $t('register') }}</h1>
        <p class="auth-sub">Create your free Serble account.</p>
      </div>

      <!-- Error banner -->
      <div v-if="error === 1" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ $t('username-password-required') }}
      </div>
      <div v-else-if="error === 2" class="auth-error">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
        {{ $t('user-exists-trying-to-login') }}
        <RouterLink :to="loginLink" class="auth-error-link">{{ $t('login') }}</RouterLink>
      </div>

      <!-- Fields -->
      <div class="auth-fields">
        <div class="auth-field">
          <label class="auth-label" for="reg-username">{{ $t('username') }}</label>
          <input
            id="reg-username"
            type="text"
            class="auth-input"
            :class="{ 'auth-input-error': error > 0 }"
            :placeholder="$t('username')"
            v-model="username"
            autocomplete="username"
            @keydown="handleKey"
          />
        </div>

        <div class="auth-field">
          <label class="auth-label" for="reg-password">{{ $t('password') }}</label>
          <input
            id="reg-password"
            type="password"
            class="auth-input"
            :class="{ 'auth-input-error': error > 0 }"
            placeholder="••••••••••••"
            v-model="password"
            autocomplete="new-password"
            @keydown="handleKey"
          />
        </div>
      </div>

      <!-- Turnstile -->
      <div class="captcha-wrap">
        <vue-turnstile
          theme="dark"
          site-key="0x4AAAAAABDes5z9y1_Rb-8A"
          v-model="recapToken"
          action="register"
        />
      </div>

      <!-- Submit -->
      <button
        class="auth-submit"
        :disabled="working || !recapToken"
        @click="register"
      >
        <svg v-if="working" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>
        {{ $t('register') }}
      </button>

      <p class="auth-switch">
        {{ $t('want-login-go-here').replace('[', '').replace(']', '') }}
        <RouterLink :to="loginLink" class="auth-switch-link">{{ $t('sign-in') }}</RouterLink>
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

/* Turnstile captcha */
.captcha-wrap {
  display: flex;
  justify-content: center;
}

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
