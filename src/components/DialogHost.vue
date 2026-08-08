<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { dialogState, resolveDialog } from '@/assets/js/dialog.js';

const confirmBtn = ref(null);
// Restores focus to whatever the user was on before the dialog opened.
let lastFocused = null;

function cancel() {
  if (dialogState.open) resolveDialog(false);
}

function accept() {
  resolveDialog(true);
}

function onKeydown(e) {
  if (!dialogState.open) return;

  if (e.key === 'Escape') {
    e.preventDefault();
    cancel();
    return;
  }

  // Keep Tab inside the dialog — without this, focus walks off into the page
  // behind the backdrop, which is invisible but still interactive.
  if (e.key === 'Tab') {
    const focusable = e.currentTarget.querySelectorAll?.('button, [href], input, select, textarea');
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

watch(() => dialogState.open, async (isOpen) => {
  if (isOpen) {
    lastFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    await nextTick();
    confirmBtn.value?.focus();
  } else {
    document.body.style.overflow = '';
    lastFocused?.focus?.();
    lastFocused = null;
  }
});

function onGlobalKey(e) {
  if (e.key === 'Escape') cancel();
}

onMounted(() => document.addEventListener('keydown', onGlobalKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="dialogState.open"
      class="dialog-backdrop"
      @click.self="cancel"
      @keydown="onKeydown"
    >
      <div
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-label="dialogState.title || dialogState.message"
      >
        <h2 v-if="dialogState.title" class="dialog-title">{{ dialogState.title }}</h2>
        <p class="dialog-message">{{ dialogState.message }}</p>

        <div class="dialog-actions">
          <button
            v-if="dialogState.kind === 'confirm'"
            class="btn btn-ghost"
            @click="cancel"
          >
            {{ dialogState.cancelLabel }}
          </button>
          <button
            ref="confirmBtn"
            class="btn"
            :class="dialogState.danger ? 'btn-danger' : 'btn-primary'"
            @click="accept"
          >
            {{ dialogState.confirmLabel }}
          </button>
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
  max-width: 420px;
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
  overflow-wrap: anywhere;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
