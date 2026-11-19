<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getInventory } from '@/assets/js/serble.js';
import ItemCard from '@/components/ItemCard.vue';
import ItemDetails from '@/components/ItemDetails.vue';
import RefreshButton from '@/components/RefreshButton.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { ItemCard, ItemDetails, RefreshButton, Icon },
  setup() {
    ensureLoggedIn();

    const PAGE_SIZE = 50;
    const loading = ref(true);
    const error = ref(false);
    const loadingMore = ref(false);
    const hasMore = ref(false);
    const items = ref([]);
    const offset = ref(0);
    const search = ref('');
    let searchTimer = null;

    const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0);
    const searchTerm = computed(() => search.value.trim() || null);

    async function load() {
      loading.value = true;
      error.value = false;
      offset.value = 0;
      const r = await getInventory(PAGE_SIZE, 0, null, searchTerm.value);
      if (r.success) {
        items.value = r.items;
        offset.value = r.items.length;
        hasMore.value = r.items.length === PAGE_SIZE;
      } else {
        error.value = true;
      }
      loading.value = false;
    }

    async function loadMore() {
      if (loadingMore.value || !hasMore.value) return;
      loadingMore.value = true;
      const r = await getInventory(PAGE_SIZE, offset.value, null, searchTerm.value);
      if (r.success) {
        items.value = items.value.concat(r.items);
        offset.value += r.items.length;
        hasMore.value = r.items.length === PAGE_SIZE;
      }
      loadingMore.value = false;
    }

    // Debounced server-side search so large inventories stay responsive.
    function onSearchInput() {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(load, 300);
    }

    // Side panel - selecting an item opens an overlay drawer with its full info, so the grid
    // never reflows and we don't navigate away.
    const selectedId = ref(null);
    function openItem(id) { selectedId.value = id; }
    function closePanel() { selectedId.value = null; }
    function onKey(e) { if (e.key === 'Escape') closePanel(); }

    onMounted(() => { load(); window.addEventListener('keydown', onKey); });
    onUnmounted(() => window.removeEventListener('keydown', onKey));

    return {
      loading, error, loadingMore, hasMore, items, isEmpty, search, load, loadMore, onSearchInput,
      selectedId, openItem, closePanel,
    };
  },
};
</script>

<template>
  <div class="inv-page">
    <div class="inv-header">
      <h3 class="inv-title">{{ $t('inventory') }}</h3>
      <RefreshButton :loading="loading" @click="load" :title="$t('reload')" />
    </div>

    <p class="inv-subtitle">{{ $t('inventory-subtitle') }}</p>

    <!-- Two-column layout: the grid and a docked detail panel. Selecting another item just swaps
         the panel content - no need to close first. -->
    <div class="inv-layout" :class="{ 'has-selection': selectedId }">
      <div class="inv-main">
        <input class="inv-search" type="search" v-model="search" @input="onSearchInput"
               :placeholder="$t('search-your-items')" />

        <div v-if="loading" class="inv-state">{{ $t('loading') }}</div>
        <div v-else-if="error" class="inv-state inv-error">{{ $t('unknown-error') }}</div>
        <div v-else-if="isEmpty && search.trim()" class="inv-state">{{ $t('no-items-match', { query: search.trim() }) }}</div>
        <div v-else-if="isEmpty" class="inv-empty">
          <Icon name="box" :size="40" class="inv-empty-icon" />
          <p class="inv-empty-title">{{ $t('inventory-empty-title') }}</p>
          <p class="inv-empty-text">{{ $t('inventory-empty-text') }}</p>
        </div>

        <template v-else>
          <div class="inv-grid">
            <button
              v-for="it in items"
              :key="it.id"
              type="button"
              class="inv-item-link"
              :class="{ active: selectedId === it.id }"
              @click="openItem(it.id)"
            >
              <ItemCard :item="it" :minimal="true" :show-creator-official-badge="true" />
            </button>
          </div>
          <div v-if="hasMore" class="inv-more">
            <button class="inv-more-btn" :disabled="loadingMore" @click="loadMore">
              {{ loadingMore ? $t('loading') : $t('load-more') }}
            </button>
          </div>
        </template>
      </div>

      <!-- Docked detail panel -->
      <aside class="inv-panel">
        <div v-if="selectedId" class="panel-inner">
          <div class="panel-bar">
            <router-link :to="{ name: 'ItemInfo', params: { id: selectedId } }" class="panel-link">
              {{ $t('open-full-page') }} &nearr;
            </router-link>
            <button class="panel-close" :title="$t('close')" @click="closePanel" :aria-label="$t('close')">&times;</button>
          </div>
          <ItemDetails :item-id="selectedId" />
        </div>
        <div v-else class="panel-empty">
          <Icon name="box" :size="34" />
          <p>{{ $t('select-item-hint') }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.inv-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* Two-column docked layout */
.inv-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  align-items: start;
}
@media (min-width: 920px) {
  .inv-layout { grid-template-columns: minmax(0, 1fr) 380px; }
}
.inv-main { min-width: 0; }

.inv-panel { min-width: 0; }
@media (min-width: 920px) {
  .inv-panel {
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
  }
}
.panel-inner { padding: 16px 18px 24px; }
.panel-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-link {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--accent);
  text-decoration: none;
}
.panel-close {
  background: transparent;
  border: 0;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.panel-close:hover { color: var(--text); }
.panel-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  color: var(--text-faint);
  padding: 48px 20px;
}
.panel-empty p { margin: 0; font-size: 0.85rem; }
/* On narrow screens the empty placeholder reserves no space - the panel only appears once an
   item is selected, rendering below the grid. */
@media (max-width: 919px) {
  .panel-empty { display: none; }
  .inv-layout:not(.has-selection) .inv-panel { display: none; }
}

.inv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.inv-title {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.inv-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 16px;
}

.inv-search {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  margin: 0 0 20px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-sunken);
  color: var(--text);
  font-size: 0.95rem;
}
.inv-search:focus { outline: 2px solid var(--accent); outline-offset: 1px; }

.inv-state {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.inv-error { color: var(--danger); }

.inv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 20px;
  text-align: center;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.inv-empty-icon { color: var(--text-faint); margin-bottom: 4px; }
.inv-empty-title { font-size: 1rem; font-weight: 700; color: var(--text); margin: 0; }
.inv-empty-text { font-size: 0.85rem; color: var(--text-muted); margin: 0; }

.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.inv-item-link {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  text-decoration: none;
  border-radius: var(--radius);
  cursor: pointer;
}
.inv-item-link:hover :deep(.item-card),
.inv-item-link.active :deep(.item-card) {
  border-color: var(--border-strong);
  background: var(--surface);
}
.inv-item-link.active :deep(.item-card) {
  outline: 2px solid var(--accent);
}
.inv-item-link:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.inv-more {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
.inv-more-btn {
  padding: 10px 24px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
  cursor: pointer;
}
.inv-more-btn:hover:not(:disabled) { border-color: var(--border-strong); }
.inv-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
