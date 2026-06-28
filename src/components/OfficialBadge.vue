<script>
export default {
  name: 'OfficialBadge',
  props: {
    label: {
      type: String,
      default: null,
    },
    // Render just the tick (no pill/text) — for tight spots like the inventory creator line.
    iconOnly: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    text() {
      return this.label ?? this.$t('official');
    },
  },
};
</script>

<template>
  <span class="official-badge" :class="{ 'icon-only': iconOnly }" :title="$t('official-app-tooltip')">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.011a2.89 2.89 0 0 0-2.924 2.924l.01.89-.636.622a2.89 2.89 0 0 0 0 4.134l.637.622-.011.89a2.89 2.89 0 0 0 2.924 2.924l.89-.01.622.636a2.89 2.89 0 0 0 4.134 0l.622-.637.89.011a2.89 2.89 0 0 0 2.924-2.924l-.01-.89.636-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.011-.89a2.89 2.89 0 0 0-2.924-2.924l-.89.01zm.287 5.984-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7 8.793l2.646-2.647a.5.5 0 0 1 .708.708"/>
    </svg>
    <span v-if="!iconOnly">{{ text }}</span>
  </span>
</template>

<style scoped>
.official-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #2c5282;
  color: #90cdf4;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  padding: 3px 8px;
  border-radius: 999px;
  vertical-align: middle;
  white-space: nowrap;
}

.official-badge svg {
  flex-shrink: 0;
}

/* Tick only — no pill, just the coloured checkmark. */
.official-badge.icon-only {
  background-color: transparent;
  padding: 0;
  color: #3b82f6;
}
</style>
