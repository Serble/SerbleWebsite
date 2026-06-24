<script>
let coinIconUid = 0;

export default {
  name: 'CoinIcon',
  props: {
    size: {
      type: [Number, String],
      default: 22,
    },
  },
  data() {
    return { faceId: `serbleCoinFace-${++coinIconUid}` };
  },
};
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    class="coin-icon"
    role="img"
    aria-label="Serble coin"
  >
    <defs>
      <radialGradient :id="faceId" cx="38%" cy="32%" r="75%">
        <stop offset="0%" stop-color="#ffe48a" />
        <stop offset="55%" stop-color="#fbc02d" />
        <stop offset="100%" stop-color="#e8950a" />
      </radialGradient>
    </defs>

    <!-- Coin body -->
    <circle cx="32" cy="32" r="31" fill="#c0820b" />
    <circle cx="32" cy="32" r="28.5" :fill="`url(#${faceId})`" />
    <!-- Raised inner rim -->
    <circle cx="32" cy="32" r="25.5" fill="none" stroke="#ffe9a6" stroke-width="1.6" opacity="0.7" />
    <circle cx="32" cy="32" r="25.5" fill="none" stroke="#b8780a" stroke-width="0.8" opacity="0.5" />

    <!-- Serble power symbol, engraved -->
    <g fill="none" stroke="#8a5806" stroke-width="4.6" stroke-linecap="round" opacity="0.92">
      <path d="M 38.359 21.824 A 12 12 0 1 1 25.641 21.824" />
      <line x1="32" y1="14.5" x2="32" y2="32" />
    </g>
    <!-- Highlight pass for an embossed look -->
    <g fill="none" stroke="#fff4d6" stroke-width="2.2" stroke-linecap="round" opacity="0.85">
      <path d="M 38.359 21.824 A 12 12 0 1 1 25.641 21.824" />
      <line x1="32" y1="14.5" x2="32" y2="32" />
    </g>
  </svg>
</template>

<style scoped>
.coin-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
</style>
