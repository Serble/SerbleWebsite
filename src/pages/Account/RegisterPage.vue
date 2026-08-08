<script>
import { registerUser, isTurnstileDisabled } from "@/assets/js/serble.js";
import { inject, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import router from "@/router/index.js";
import VueTurnstile from 'vue-turnstile';
import LoadingSpinner from "@/components/LoadingSpinner.vue";
import LinkedText from "@/components/LinkedText.vue";
import AuthCard from "@/components/AuthCard.vue";
import Icon from "@/components/Icon.vue";

export default {
  components: { VueTurnstile, LoadingSpinner, LinkedText, AuthCard, Icon },
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
    const turnstileDisabled = isTurnstileDisabled();
    const recapToken = ref(turnstileDisabled ? 'bypass' : '');

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

    return { username, password, error, working, recapToken, turnstileDisabled, register, loginLink };
  }
};
</script>

<template>
  <AuthCard :title="$t('register')" subtitle="Create your free Serble account.">

    <form class="auth-form" @submit.prevent="register">

      <div v-if="error === 1" class="alert alert-danger">
        <Icon name="alert" />{{ $t('username-password-required') }}
      </div>
      <div v-else-if="error === 2" class="alert alert-danger">
        <Icon name="alert" />
        <LinkedText :text="$t('user-exists-trying-to-login')" :to="loginLink" />
      </div>

      <div class="field">
        <label class="field-label" for="reg-username">{{ $t('username') }}</label>
        <input
          id="reg-username"
          type="text"
          class="input"
          :class="{ 'input-invalid': error > 0 }"
          :placeholder="$t('username')"
          v-model="username"
          autocomplete="username"
        />
      </div>

      <div class="field">
        <label class="field-label" for="reg-password">{{ $t('password') }}</label>
        <input
          id="reg-password"
          type="password"
          class="input"
          :class="{ 'input-invalid': error > 0 }"
          placeholder="••••••••••••"
          v-model="password"
          autocomplete="new-password"
        />
      </div>

      <div v-if="!turnstileDisabled" class="captcha-wrap">
        <vue-turnstile
          theme="dark"
          site-key="0x4AAAAAABDes5z9y1_Rb-8A"
          v-model="recapToken"
          action="register"
        />
      </div>

      <button type="submit" class="btn btn-primary btn-block" :disabled="working || !recapToken">
        <LoadingSpinner v-if="working" />
        {{ $t('register') }}
      </button>
    </form>

    <p class="auth-switch">
      <LinkedText :text="$t('want-login-go-here')" :to="loginLink" />
    </p>

  </AuthCard>
</template>

<style scoped>
/* Layout, card and header styles live in AuthCard.vue; fields, inputs, buttons
   and alerts come from components.css. Only what is unique to this page stays. */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.captcha-wrap {
  display: flex;
  justify-content: center;
}

.auth-switch {
  font-size: 0.82rem;
  color: var(--text-dim);
  text-align: center;
  margin: 0;
}

.auth-switch :deep(a) {
  color: var(--accent-light);
  text-decoration: none;
  font-weight: 500;
}

.auth-switch :deep(a:hover) { text-decoration: underline; }
</style>
