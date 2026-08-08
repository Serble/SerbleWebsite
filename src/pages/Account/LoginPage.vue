<script>
import { loginUser, loginWithPasskey } from "@/assets/js/serble.js";
import { inject, ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import router from "@/router/index.js";
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import AuthCard from "@/components/AuthCard.vue";
import Icon from "@/components/Icon.vue";

export default {
  components: { LoadingSpinner, AuthCard, Icon },
  setup() {
    const userStore = inject('userStore');
    const route = useRoute();
    const { t } = useI18n();

    if (userStore.state.user) {
      router.push('/');
    }

    const username      = ref('');
    const password      = ref('');
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
          passkeyError.value = t('passkey-login-cancelled');
        } else if (result.error === 'webauthn-unavailable') {
          passkeyError.value = t('passkey-unavailable');
        } else {
          passkeyError.value = t('passkey-login-failed');
        }
        return;
      }

      const returnUrl = route.query.return_url ?? '/';
      window.location.href = returnUrl;
    }

    const registerLink = computed(() =>
      route.query.return_url
        ? { path: '/register', query: { return_url: route.query.return_url } }
        : '/register'
    );

    return { username, password, error, working, login, passkeyLogin, passkeyWorking, passkeyError, registerLink };
  }
};
</script>

<template>
  <AuthCard :title="$t('sign-in')" subtitle="Welcome back to Serble.">

    <!-- A real form so Enter submits and password managers behave. -->
    <form class="auth-form" @submit.prevent="login">

      <div v-if="error === 1" class="alert alert-danger">
        <Icon name="alert" />{{ $t('username-password-required') }}
      </div>
      <div v-else-if="error === 2" class="alert alert-danger">
        <Icon name="alert" />{{ $t('invalid-creds-need-account') }}
        <RouterLink :to="registerLink" class="auth-error-link">{{ $t('register') }}</RouterLink>
      </div>
      <div v-else-if="error === 3" class="alert alert-danger">
        <Icon name="alert" />{{ $t('account-disabled') }}
      </div>

      <div class="field">
        <label class="field-label" for="username">{{ $t('username') }}</label>
        <input
          id="username"
          type="text"
          class="input"
          :class="{ 'input-invalid': error === 2 }"
          :placeholder="$t('username')"
          v-model="username"
          autocomplete="username"
        />
      </div>

      <div class="field">
        <label class="field-label" for="password">{{ $t('password') }}</label>
        <input
          id="password"
          type="password"
          class="input"
          :class="{ 'input-invalid': error === 2 }"
          placeholder="••••••••••••"
          v-model="password"
          autocomplete="current-password"
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="working">
        <LoadingSpinner v-if="working" />
        {{ $t('sign-in') }}
      </button>
    </form>

    <div class="auth-divider">
      <span class="auth-divider-text">{{ $t('or') }}</span>
    </div>

    <div v-if="passkeyError" class="alert alert-danger">
      <AlertIcon /> {{ passkeyError }}
    </div>

    <button class="btn btn-secondary btn-block" :disabled="passkeyWorking" @click="passkeyLogin">
      <LoadingSpinner v-if="passkeyWorking" />
      <Icon v-else name="lock" />
      {{ $t('login-with-passkey') }}
    </button>

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
</style>
