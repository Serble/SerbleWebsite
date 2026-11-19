<script setup>
import { computed } from 'vue';
import { ICONS, strokeFor } from '@/assets/js/icons.js';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 16 },
  /**
   * Icons are decorative by default and hidden from screen readers. Pass a
   * label when the icon is the only content of a control.
   */
  label: { type: String, default: '' },
});

const icon = computed(() => ICONS[props.name] ?? []);
const solid = computed(() => !Array.isArray(icon.value));
const px = computed(() => Number(props.size));
// Laid out inline, sit the icon's middle on the middle of the capital letters beside it: Plex Sans
// and Plex Mono both have a 0.698em cap height, so that is 0.349em above the baseline. In a flex
// row vertical-align is ignored and align-items: center puts the icon on the middle of the line
// box, 0.375em above the baseline in Plex, which is within 0.4px of the same spot.
const style = computed(() => ({ verticalAlign: `calc(0.349em - ${px.value / 2}px)` }));
</script>

<template>
  <svg
    v-if="solid"
    xmlns="http://www.w3.org/2000/svg"
    :width="px"
    :height="px"
    :viewBox="icon.viewBox"
    fill="currentColor"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
    :data-icon="name"
    :style="style"
    class="icon"
  >
    <path v-for="(d, i) in icon.fill" :key="i" :d="d" />
  </svg>
  <svg
    v-else
    xmlns="http://www.w3.org/2000/svg"
    :width="px"
    :height="px"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeFor(px)"
    stroke-linecap="round"
    stroke-linejoin="round"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
    :data-icon="name"
    :style="style"
    class="icon"
  >
    <path v-for="(d, i) in icon" :key="i" :d="d" />
  </svg>
</template>

<style scoped>
.icon {
  display: inline-block;
  flex-shrink: 0;
}
</style>
