<script>
// Shared loading display: a dark card containing a spinning icon and a
// caption. This is the same "dark box" shown during the OAuth flow and is
// meant to be reused anywhere a full loading screen is needed so every page
// presents an identical loading experience.
import LoadingSpinner from '@/components/LoadingSpinner.vue';

export default {
  name: 'LoadingCard',
  components: { LoadingSpinner },
  props: {
    // Diameter of the spinner icon in px.
    size: { type: Number, default: 36 },
    // Caption under the spinner. Falls back to the translated "loading" string.
    text: { type: String, default: null },
  },
};
</script>

<template>
  <div class="loading-card">
    <LoadingSpinner :size="size" class="text-accent mb-3" />
    <p class="loading-text">{{ text ?? $t('loading') }}</p>
  </div>
</template>

<style scoped>
.loading-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.loading-text {
  color: var(--text-muted);
  margin: 0;
}
</style>
