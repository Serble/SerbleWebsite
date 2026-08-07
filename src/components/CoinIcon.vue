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
  <!-- Single source of truth for the artwork: /public/images/coin.svg, which is also the
       hotlinkable asset documented on /coin. -->
  <img
    src="/images/coin.svg"
    alt="Serble coin"
    :width="size"
    :height="size"
    class="coin-icon"
  >
</template>

<style scoped>
.coin-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
