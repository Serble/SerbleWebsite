<script>
// Shared loading display: a dark card containing a spinning icon and a
// caption. This is the same "dark box" shown during the OAuth flow and is
// meant to be reused anywhere a full loading screen is needed so every page
// presents an identical loading experience.
export default {
  name: 'LoadingCard',
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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      :width="size"
      :height="size"
      fill="currentColor"
      viewBox="0 0 16 16"
      class="loading-spin text-primary mb-3"
    >
      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
    </svg>
    <p class="loading-text">{{ text ?? $t('loading') }}</p>
  </div>
</template>

<style scoped>
.loading-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
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

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-spin { animation: loading-spin 0.9s linear infinite; }
</style>
