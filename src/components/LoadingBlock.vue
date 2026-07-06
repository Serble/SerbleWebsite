<script>
// Shared Group-B loading display: a centered, card-less block with a spinner
// and optional caption. Used for in-page/list loading states (OAuth apps,
// authorized apps, edit app, etc.). Keeps the distinct "state-block" look.
export default {
  name: 'LoadingBlock',
  props: {
    // Diameter of the spinner icon in px.
    size: { type: Number, default: 32 },
    // Caption under the spinner. Falls back to the translated "loading" string.
    // Pass an empty string to hide the caption entirely.
    text: { type: String, default: null },
    // Vertical padding of the block (matches per-page variants, e.g. 64 or 80).
    padding: { type: Number, default: 64 },
  },
};
</script>

<template>
  <div class="loading-block" :style="{ padding: `${padding}px 20px` }">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
      fill="currentColor"
      viewBox="0 0 16 16"
      class="loading-spin text-primary"
    >
      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
    </svg>
    <p v-if="text !== ''" class="loading-block-text">{{ text ?? $t('loading') }}</p>
  </div>
</template>

<style scoped>
.loading-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  color: var(--text-dim);
}

.loading-block-text {
  margin: 0;
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-spin { animation: loading-spin 0.9s linear infinite; }
</style>
