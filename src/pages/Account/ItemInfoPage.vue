<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ItemDetails from '@/components/ItemDetails.vue';
import Icon from '@/components/Icon.vue';

// Standalone, shareable item page at /items/:id. The actual item UI lives in the reusable
// ItemDetails component (also used by the inventory side panel and the embeddable viewer).
export default {
  name: 'ItemInfoPage',
  components: { ItemDetails, Icon },
  setup() {
    const route = useRoute();
    const itemId = computed(() => String(route.params.id || ''));
    return { itemId };
  },
};
</script>

<template>
  <div class="item-page">
    <router-link :to="{ name: 'Inventory' }" class="back-link"><Icon name="arrowLeft" /> {{ $t('inventory') }}</router-link>
    <ItemDetails :item-id="itemId" />
  </div>
</template>

<style scoped>
.item-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px 60px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: none;
}
.back-link:hover { color: var(--text); }

@media (max-width: 768px), (pointer: coarse) {
  .back-link { min-height: 44px; margin-bottom: 8px; }
}
</style>
