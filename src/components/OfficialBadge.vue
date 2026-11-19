<script>
import Icon from '@/components/Icon.vue';

export default {
  name: 'OfficialBadge',
  components: { Icon },
  props: {
    label: {
      type: String,
      default: null,
    },
    // Render just the tick (no pill/text) - for tight spots like the inventory creator line.
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
    <Icon name="verified" :size="13" />
    <span v-if="!iconOnly">{{ text }}</span>
  </span>
</template>

<style scoped>
.official-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-light);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1;
  vertical-align: middle;
  white-space: nowrap;
}

/* Tick only - no pill, just the coloured checkmark. */
.official-badge.icon-only {
  color: var(--accent-light);
}
</style>
