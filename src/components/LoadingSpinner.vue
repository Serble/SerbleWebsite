<script>
// Shared Group-C loading display: the bare spinning icon, no wrapper or text.
// Used inline inside buttons and refresh controls. Set :spin="false" to render
// the icon without animation (e.g. an idle refresh button).
export default {
  name: 'LoadingSpinner',
  props: {
    // Diameter of the spinner icon in px.
    size: { type: [Number, String], default: 14 },
    // Whether the icon is animating.
    spin: { type: Boolean, default: true },
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="currentColor"
    viewBox="0 0 16 16"
    :class="{ 'loading-spin': spin }"
  >
    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
  </svg>
</template>

<style scoped>
@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

.loading-spin { animation: loading-spin 0.9s linear infinite; }
</style>
