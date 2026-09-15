<script>
import { loginPasskey, loginStart } from "@/assets/js/serble.js";
import { inject, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import router from "@/router/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import AuthCard from "@/components/AuthCard.vue";
import SignInSteps from "@/components/SignInSteps.vue";
import Icon from "@/components/Icon.vue";

// Only same-site paths, so a crafted link cannot send someone elsewhere after signing in.
function safeReturnUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/';
  }
  return value;
}

export default {
  components: { LoadingSpinner, AuthCard, SignInSteps, Icon },
  setup() {
    const userStore = inject('userStore');
    const route = useRoute();
    const { t } = useI18n();

    if (userStore.state.user) {
      router.push('/');
    }

    const username = ref('');
    const session = ref(null);   // { loginSession, methods } once the account is known
    const error = ref('');
    const working = ref(false);
    const passkeyWorking = ref(false);

    const START_ERRORS = {
      'invalid-credentials': 'invalid-creds-need-account',
      'rate-limited': 'too-many-attempts',
      busy: 'server-busy',
    };

    const PASSKEY_ERRORS = {
      cancelled: 'passkey-login-cancelled',
      'webauthn-unavailable': 'passkey-unavailable',
      'rate-limited': 'too-many-attempts',
    };

    function finish() {
      window.location.href = safeReturnUrl(route.query.return_url);
    }

    async function start() {
      if (working.value || !username.value.trim()) return;
      error.value = '';
      working.value = true;
      const result = await loginStart(username.value.trim());
      working.value = false;

      if (!result.success) {
        error.value = START_ERRORS[result.error] ?? 'unknown-error-occured';
        return;
      }
      session.value = { loginSession: result.loginSession, methods: result.methods ?? [] };
    }

    async function passkeyLogin() {
      if (passkeyWorking.value) return;
      error.value = '';
      passkeyWorking.value = true;
      const result = await loginPasskey(null);
      passkeyWorking.value = false;

      if (result.success && result.complete) {
        finish();
        return;
      }
      if (result.success) {
        // The passkey was accepted but this account needs another step.
        session.value = { loginSession: result.loginSession, methods: result.methods ?? [] };
        return;
      }
      error.value = PASSKEY_ERRORS[result.error] ?? 'passkey-login-failed';
    }

    function changeAccount() {
      session.value = null;
      error.value = '';
    }

    function restart() {
      session.value = null;
      error.value = 'sign-in-expired';
    }

    const registerLink = computed(() =>
      route.query.return_url
        ? { path: '/register', query: { return_url: route.query.return_url } }
        : '/register'
    );

    return {
      t, username, session, error, working, passkeyWorking,
      start, passkeyLogin, changeAccount, restart, finish, registerLink,
    };
  }
};
</script>

<template>
  <AuthCard :title="$t('sign-in')" subtitle="Welcome back to Serble.">

    <div v-if="error" class="alert alert-danger" role="alert">
      <Icon name="alert" />{{ $t(error) }}
      <RouterLink v-if="error === 'invalid-creds-need-account'" :to="registerLink" class="auth-error-link">{{ $t('register') }}</RouterLink>
    </div>

    <template v-if="!session">
      <!-- A real form so Enter submits and password managers behave. -->
      <form class="auth-form" @submit.prevent="start">
        <div class="field">
          <label class="field-label" for="username">{{ $t('username') }}</label>
          <input
            id="username"
            type="text"
            class="input"
            :class="{ 'input-invalid': error === 'invalid-creds-need-account' }"
            :placeholder="$t('username')"
            v-model="username"
            autocomplete="username"
            autofocus
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="working || !username.trim()">
          <LoadingSpinner v-if="working" />
          {{ $t('next') }}
        </button>
      </form>

      <div class="auth-divider">
        <span class="auth-divider-text">{{ $t('or') }}</span>
      </div>

      <button class="btn btn-secondary btn-block" :disabled="passkeyWorking" @click="passkeyLogin">
        <LoadingSpinner v-if="passkeyWorking" />
        <Icon v-else name="lock" />
        {{ $t('login-with-passkey') }}
      </button>
    </template>

    <template v-else>
      <p v-if="username.trim()" class="auth-account">
        {{ $t('sign-in-as', { name: username.trim() }) }}
        <button type="button" class="auth-switch-link link-button" @click="changeAccount">{{ $t('not-you') }}</button>
      </p>
      <SignInSteps
        :login-session="session.loginSession"
        :methods="session.methods"
        :username="username.trim()"
        @complete="finish"
        @restart="restart"
      />
    </template>

    <p class="auth-switch">
      {{ $t('dont-have-account') }}
      <RouterLink :to="registerLink" class="auth-switch-link">{{ $t('register-for-free') }}</RouterLink>
    </p>

  </AuthCard>
</template>

<style scoped>
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.auth-error-link {
  color: var(--danger);
  text-decoration: underline;
  margin-left: 2px;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border);
}

.auth-divider-text {
  font-size: 0.75rem;
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.auth-account {
  font-size: 0.85rem;
  color: var(--text-dim);
  text-align: center;
  margin: 0;
}

.auth-switch {
  font-size: 0.82rem;
  color: var(--text-dim);
  text-align: center;
  margin: 0;
}

.auth-switch-link {
  color: var(--accent-light);
  text-decoration: none;
  font-weight: 500;
}

.auth-switch-link:hover { text-decoration: underline; }

.link-button {
  background: none;
  border: none;
  padding: 0;
  margin-left: 4px;
  font: inherit;
  cursor: pointer;
}
</style>
