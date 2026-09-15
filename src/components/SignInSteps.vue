<script setup>
/**
 * The steps of a sign-in or re-authentication session: shows the methods the API says can be used
 * next and submits whichever one the user picks, until the session completes.
 */
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { loginPassword, loginPasskey, loginTotp } from '@/assets/js/serble.js';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

const props = defineProps({
  loginSession: { type: String, required: true },
  methods: { type: Array, required: true },
  username: { type: String, default: '' },
  // Re-authentication steps are sent as the signed-in user.
  asUser: { type: Boolean, default: false },
});
const emit = defineEmits(['complete', 'restart']);
const { t } = useI18n();

const METHOD_ORDER = ['password', 'passkey', 'totp'];

const session = ref(props.loginSession);
const available = ref([...props.methods]);
const method = ref(pickDefault(props.methods));
const password = ref('');
const code = ref('');
const working = ref(false);
const error = ref('');
const progressed = ref(false);
const passwordInput = ref(null);
const codeInput = ref(null);

const sortedMethods = computed(() => METHOD_ORDER.filter(m => available.value.includes(m)));

function pickDefault(methods) {
  return METHOD_ORDER.find(m => methods.includes(m)) ?? '';
}

function choose(next) {
  method.value = next;
  error.value = '';
  nextTick(focusInput);
}

function focusInput() {
  if (method.value === 'password') passwordInput.value?.focus();
  else if (method.value === 'totp') codeInput.value?.focus();
}

watch(() => props.loginSession, (next) => {
  session.value = next;
  available.value = [...props.methods];
  method.value = pickDefault(props.methods);
  progressed.value = false;
});

const ERRORS = {
  'rate-limited': 'too-many-attempts',
  busy: 'server-busy',
  network: 'unknown-error-occured',
  unknown: 'unknown-error-occured',
  cancelled: 'passkey-login-cancelled',
  'webauthn-unavailable': 'passkey-unavailable',
  'passkey-failed': 'passkey-login-failed',
};

function wrongCredentialMessage() {
  if (method.value === 'password') return t('wrong-password');
  if (method.value === 'totp') return t('invalid-code');
  return t('passkey-login-failed');
}

async function submit() {
  if (working.value || !method.value) return;
  error.value = '';

  let result;
  working.value = true;
  if (method.value === 'password') {
    if (!password.value) { working.value = false; return; }
    result = await loginPassword(session.value, password.value, props.asUser);
  } else if (method.value === 'totp') {
    if (!code.value.trim()) { working.value = false; return; }
    result = await loginTotp(session.value, code.value.trim(), props.asUser);
  } else {
    result = await loginPasskey(session.value, props.asUser);
  }
  working.value = false;

  if (result.success && result.complete) {
    emit('complete', result);
    return;
  }

  if (result.success) {
    session.value = result.loginSession;
    available.value = result.methods ?? [];
    password.value = '';
    code.value = '';
    progressed.value = true;
    choose(pickDefault(available.value));
    return;
  }

  if (result.error === 'invalid-session') {
    emit('restart');
    return;
  }

  if (result.error === 'invalid-credentials') {
    error.value = wrongCredentialMessage();
    if (result.methods) available.value = result.methods;
    code.value = '';
    return;
  }

  error.value = t(ERRORS[result.error] ?? 'unknown-error-occured');
}

defineExpose({ focusInput });
</script>

<template>
  <div class="steps">
    <p v-if="progressed" class="steps-note">
      <Icon name="check" :size="13" />{{ $t('sign-in-next-step') }}
    </p>

    <div v-if="sortedMethods.length > 1" class="method-tabs" role="tablist">
      <button
        v-for="m in sortedMethods"
        :key="m"
        type="button"
        role="tab"
        class="method-tab"
        :class="{ active: method === m }"
        :aria-selected="method === m"
        @click="choose(m)"
      >
        {{ $t('method-' + m) }}
      </button>
    </div>

    <div v-if="error" class="alert alert-danger" role="alert">
      <Icon name="alert" />{{ error }}
    </div>

    <form v-if="method === 'password'" class="step-form" @submit.prevent="submit">
      <input class="sr-only" type="text" autocomplete="username" :value="username" tabindex="-1" aria-hidden="true" readonly>
      <div class="field">
        <label class="field-label" for="step-password">{{ $t('password') }}</label>
        <input
          id="step-password"
          ref="passwordInput"
          v-model="password"
          type="password"
          class="input"
          placeholder="************"
          autocomplete="current-password"
          autofocus
        >
      </div>
      <button type="submit" class="btn btn-primary btn-block" :disabled="working || !password">
        <LoadingSpinner v-if="working" />
        {{ $t('next') }}
      </button>
    </form>

    <form v-else-if="method === 'totp'" class="step-form" @submit.prevent="submit">
      <div class="field">
        <label class="field-label" for="step-code">{{ $t('otp-code') }}</label>
        <input
          id="step-code"
          ref="codeInput"
          v-model="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="input code-input"
          :placeholder="$t('otp-code')"
          autofocus
        >
        <p class="field-hint">{{ $t('totp-enter-code') }}</p>
      </div>
      <button type="submit" class="btn btn-primary btn-block" :disabled="working || !code.trim()">
        <LoadingSpinner v-if="working" />
        {{ $t('next') }}
      </button>
    </form>

    <div v-else-if="method === 'passkey'" class="step-form">
      <button type="button" class="btn btn-primary btn-block" :disabled="working" @click="submit">
        <LoadingSpinner v-if="working" />
        <Icon v-else name="lock" />
        {{ $t('use-passkey') }}
      </button>
    </div>

    <p v-else class="alert alert-danger">
      <Icon name="alert" />{{ $t('no-sign-in-methods') }}
    </p>
  </div>
</template>

<style scoped>
.steps,
.step-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.steps-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
}

.method-tabs {
  display: flex;
  gap: var(--space-1);
  padding: 3px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.method-tab {
  flex: 1;
  padding: 6px 8px;
  border: none;
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--text-dim);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
}

.method-tab.active {
  background: var(--surface-raised);
  color: var(--text);
}

.code-input {
  letter-spacing: 0.3em;
  text-align: center;
  font-weight: 700;
}

.field-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  margin: 4px 0 0;
}
</style>
