<script>
export default {
  name: 'CoinIcon',
  props: {
    size: {
      type: [Number, String],
      default: 22,
    },
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    class="coin-icon"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="8" fill="#f5b50a" />
    <text
      x="8"
      y="8"
      text-anchor="middle"
      dominant-baseline="central"
      font-family="Arial, Helvetica, sans-serif"
      font-weight="700"
      font-size="11"
      fill="#fff"
    >S</text>
  </svg>
</template>

<style scoped>
.coin-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
