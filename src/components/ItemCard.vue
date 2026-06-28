<script>
import { computed } from 'vue';

// A single tradeable / inventory item tile. Purely presentational.
//  - default: icon + name + (optional) description — used on the trade consent screen.
//  - minimal: icon + name only — used on the inventory grid, where each tile links to the
//    item's info page for the full detail + ownership history.
export default {
  name: 'ItemCard',
  props: {
    // { id, name, description?, iconUrl? }
    item: { type: Object, required: true },
    // Strip to the bare minimum (icon + name, single line).
    minimal: { type: Boolean, default: false },
  },
  setup(props) {
    const name = computed(() => props.item?.name ?? 'Unknown item');
    const description = computed(() => props.item?.description ?? '');
    const iconUrl = computed(() => props.item?.iconUrl ?? null);
    const initial = computed(() => name.value.charAt(0).toUpperCase() || '?');
    return { name, description, iconUrl, initial };
  },
};
</script>

<template>
  <div class="item-card" :class="{ minimal }" :title="minimal ? name : (description || name)">
    <div class="item-icon">
      <img v-if="iconUrl" :src="iconUrl" :alt="name" class="item-icon-img" loading="lazy" />
      <span v-else class="item-icon-placeholder">{{ initial }}</span>
    </div>
    <div class="item-body">
      <p class="item-name">{{ name }}</p>
      <p v-if="!minimal && description" class="item-desc">{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.item-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: left;
}

.item-card.minimal {
  align-items: center;
  padding: 10px;
}

.item-icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-light);
  border: 1px solid var(--border);
}

.item-card.minimal .item-icon {
  width: 38px;
  height: 38px;
}

.item-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-icon-placeholder {
  font-weight: 700;
  font-size: 18px;
  color: var(--accent);
}

.item-body {
  min-width: 0;
  flex: 1 1 auto;
}

.item-name {
  margin: 0;
  font-weight: 600;
  color: var(--text);
  line-height: 1.25;
  word-break: break-word;
}

.item-card.minimal .item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-desc {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
