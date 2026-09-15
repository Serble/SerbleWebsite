<script setup>
/**
 * Asks the signed-in user to complete one of their sign-in flows again before a credential change.
 * Opened by withReauth() in serble.js through reauth.js.
 */
import { inject, ref, watch } from 'vue';
import { loginCancel, reauthStart } from '@/assets/js/serble.js';
import { reauthState, settleReauth } from '@/assets/js/reauth.js';
import SignInSteps from '@/components/SignInSteps.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

const userStore = inject('userStore', null);

const session = ref(null);
const error = ref('');
const loading = ref(false);

async function start() {
  loading.value = true;
  error.value = '';
  session.value = null;
  const result = await reauthStart();
  loading.value = false;
  if (!result.success) {
    error.value = result.error === 'rate-limited' ? 'too-many-attempts' : 'unknown-error-occured';
    return;
  }
  session.value = { loginSession: result.loginSession, methods: result.methods ?? [] };
}

function cancel() {
  if (session.value) loginCancel(session.value.loginSession);
  session.value = null;
  settleReauth(null);
}

function complete(result) {
  session.value = null;
  settleReauth(result.reauthToken);
}

function onKeydown(event) {
  if (event.key === 'Escape') cancel();
}

watch(() => reauthState.open, (open) => {
  if (open) start();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="reauthState.open" class="dialog-backdrop" @keydown="onKeydown">
      <div class="dialog" role="dialog" aria-modal="true" :aria-label="$t('reauth-title')">
        <h2 class="dialog-title">{{ $t('reauth-title') }}</h2>
        <p class="dialog-message">{{ $t('reauth-hint') }}</p>

        <p v-if="loading" class="dialog-state"><LoadingSpinner :size="14" />{{ $t('loading') }}</p>
        <div v-else-if="error" class="alert alert-danger"><Icon name="alert" />{{ $t(error) }}</div>
        <SignInSteps
          v-else-if="session"
          :login-session="session.loginSession"
          :methods="session.methods"
          :username="userStore?.state?.user?.username ?? ''"
          as-user
          @complete="complete"
          @restart="start"
        />

        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" @click="cancel">{{ $t('cancel') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--overlay);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
}

.dialog {
  width: 100%;
  max-width: 400px;
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dialog-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.dialog-message {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.dialog-state {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
  margin: 0;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
}
</style>
