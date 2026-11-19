<script>
// Shared Group-B loading display: a centered, card-less block with a spinner
// and optional caption. Used for in-page/list loading states (OAuth apps,
// authorized apps, edit app, etc.). Keeps the distinct "state-block" look.
import LoadingSpinner from '@/components/LoadingSpinner.vue';

export default {
  name: 'LoadingBlock',
  components: { LoadingSpinner },
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
    <LoadingSpinner :size="size" class="text-accent" />
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
</style>
