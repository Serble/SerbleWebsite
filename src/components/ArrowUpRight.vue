<script>
export default {
  name: 'ArrowUpRight',
  props: {
    size: {
      type: [Number, String],
      default: 20,
    },
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.25"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="arrow-up-right"
    aria-hidden="true"
  >
    <path d="M8 16 16 8" />
    <path d="M9 8h7v7" />
  </svg>
</template>

<style scoped>
.arrow-up-right {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
