<script>
// Shared icon refresh button. Sits on a filled foreground surface (like a card),
// matching the reference button next to "Transaction History" on the balance
// page. While `loading` is true the button is disabled and the icon spins.
import LoadingSpinner from '@/components/LoadingSpinner.vue';

export default {
  name: 'RefreshButton',
  components: { LoadingSpinner },
  props: {
    // Disables the button and spins the icon while a refresh is in flight.
    loading: { type: Boolean, default: false },
    // Compact 32px variant (default is 38px).
    small: { type: Boolean, default: false },
    // Tooltip / accessible label.
    title: { type: String, default: null },
  },
  emits: ['click'],
};
</script>

<template>
  <button
    type="button"
    class="refresh-button"
    :class="{ small }"
    :disabled="loading"
    :title="title"
    :aria-label="title"
    @click="$emit('click')"
  >
    <LoadingSpinner :size="small ? 14 : 15" :spin="loading" />
  </button>
</template>

<style scoped>
.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.refresh-button:hover:not(:disabled) {
  background: var(--border);
  color: var(--text);
}

.refresh-button:disabled { opacity: 0.6; cursor: not-allowed; }

.refresh-button.small {
  width: 32px;
  height: 32px;
}
</style>
