<script>
// The shared spinner: a faint ring with a quarter arc running round it. Used inline in buttons
// and on its own in loading blocks. Drawn on the same 24 grid and stroke rule as Icon, so it
// matches the icons beside it and turns about its exact centre. Set :spin="false" for a still
// ring.
import { strokeFor } from '@/assets/js/icons.js';

export default {
  name: 'LoadingSpinner',
  props: {
    // Diameter of the spinner in px.
    size: { type: [Number, String], default: 16 },
    // Whether the spinner is animating.
    spin: { type: Boolean, default: true },
  },
  computed: {
    px() { return Number(this.size); },
    strokeWidth() { return strokeFor(this.px); },
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="px"
    :height="px"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    class="loading-spinner"
    :class="{ 'loading-spin': spin }"
    :style="{ verticalAlign: `calc(0.349em - ${px / 2}px)` }"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" opacity="0.25" />
    <path d="M12 3a9 9 0 0 1 9 9" />
  </svg>
</template>

<style scoped>
.loading-spinner {
  display: inline-block;
  flex-shrink: 0;
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-spin { animation: loading-spin 0.8s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .loading-spin { animation-duration: 2.4s; }
}
</style>
