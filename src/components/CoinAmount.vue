<script>
import { computed } from 'vue';
import { splitCoinParts } from '@/assets/js/coins.js';

// Renders a fixed-point coin amount with the fractional part muted (it doesn't
// really matter to the reader). `value` is the raw fixed-point integer string.
export default {
  name: 'CoinAmount',
  props: {
    value: { type: [String, Number], default: '0' },
    // Optional sign/prefix rendered before the whole part (e.g. '+', '-').
    sign: { type: String, default: '' },
  },
  setup(props) {
    const parts = computed(() => splitCoinParts(props.value));
    return { parts };
  },
};
</script>

<template><span class="coin-amount-display">{{ sign }}{{ parts.whole }}<span v-if="parts.frac" class="coin-frac">.{{ parts.frac }}</span></span></template>

<style scoped>
/* Muted relative to the surrounding text colour so it works on white, red and
   green amounts alike. */
.coin-frac {
  opacity: 0.5;
  font-weight: inherit;
}
</style>
