<script>
// Dedicated preview page for the shared loading components. Renders each group's
// loading display permanently (they never resolve) so the loading screens can be
// inspected and tested without racing against real network requests.
import LoadingCard from '@/components/LoadingCard.vue';
import LoadingBlock from '@/components/LoadingBlock.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

export default {
  components: { LoadingCard, LoadingBlock, LoadingSpinner },
};
</script>

<template>
  <div class="loading-preview">
    <section class="preview-group">
      <h3 class="preview-label">LoadingCard — dark box (OAuth / consent flows)</h3>
      <LoadingCard />
    </section>

    <section class="preview-group">
      <h3 class="preview-label">LoadingBlock — centered block (in-page lists)</h3>
      <LoadingBlock />
    </section>

    <section class="preview-group">
      <h3 class="preview-label">LoadingSpinner — inline icon (buttons / refresh)</h3>
      <div class="preview-inline">
        <LoadingSpinner :size="14" />
        <LoadingSpinner :size="24" />
        <LoadingSpinner :size="36" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.loading-preview {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 40px 20px;
}

.preview-group {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.preview-label {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0;
  text-align: center;
}

.preview-inline {
  display: flex;
  align-items: center;
  gap: 20px;
  color: var(--accent, var(--text));
}
</style>
