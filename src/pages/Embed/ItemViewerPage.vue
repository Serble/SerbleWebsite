<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { getInventory, getPublicAppsBatch, checkLogin, getAuthToken } from '@/assets/js/serble.js';
import { setLocalStorage } from '@/assets/js/utils.js';
import { userStore, authReadyPromise } from '@/assets/js/user.js';
import ItemCard from '@/components/ItemCard.vue';
import ItemDetails from '@/components/ItemDetails.vue';

// An embeddable, self-contained item viewer. It runs on the user's own Serble session, so an app
// can iframe it without holding any OAuth scopes — Serble (not the app) reads the inventory.
//
// Query params:
//   app=<appId>   only show items created by this app (the common case for an app embedding it)
//   theme=light   light palette (default: dark)
//   accent=RRGGBB override the accent colour
//   title=...     custom heading
export default {
  name: 'EmbedItemViewer',
  components: { ItemCard, ItemDetails },
  setup() {
    const route = useRoute();
    const origin = window.location.origin;

    const appFilter = computed(() => {
      const a = route.query.app;
      return a ? String(a) : null;
    });

    // --- theming (so it looks right inside any host) ---
    const rootStyle = computed(() => {
      const light = route.query.theme === 'light';
      const accent = route.query.accent ? `#${String(route.query.accent).replace(/^#/, '')}` : '#5865f2';
      return light
        ? { '--e-bg': '#ffffff', '--e-surface': '#f5f6f8', '--e-text': '#1a1a1a', '--e-muted': '#6b7280', '--e-border': '#e3e3e6', '--e-accent': accent }
        : { '--e-bg': '#0e0f13', '--e-surface': '#181a20', '--e-text': '#e8e8ea', '--e-muted': '#9aa0ac', '--e-border': '#2a2d36', '--e-accent': accent };
    });

    // --- auth ---
    const loggedIn = ref(false);
    const authChecked = ref(false);

    // --- data ---
    const PAGE = 24;
    const loading = ref(false);
    const loadingMore = ref(false);
    const hasMore = ref(false);
    const offset = ref(0);
    const error = ref(false);
    const items = ref([]);
    const appMap = ref({});
    const search = ref('');
    let searchTimer = null;
    const selected = ref(null);

    const filterAppName = computed(() => {
      const id = appFilter.value;
      if (!id) return null;
      return appMap.value[id]?.name || null;
    });
    const heading = computed(() => {
      if (route.query.title) return String(route.query.title);
      if (filterAppName.value) return `Your ${filterAppName.value} items`;
      return 'Your items';
    });
    const isEmpty = computed(() => !loading.value && !error.value && items.value.length === 0);

    // Resolve creator-app names for a set of items (merged into appMap), used for the heading.
    async function resolveApps(list) {
      const ids = new Set(list.map(i => i.creatorAppId).filter(Boolean));
      if (appFilter.value) ids.add(appFilter.value);
      const unresolved = [...ids].filter(id => !appMap.value[id]);
      if (unresolved.length === 0) return;
      const ar = await getPublicAppsBatch(unresolved);
      if (ar.success) appMap.value = { ...appMap.value, ...ar.apps };
    }

    async function load() {
      loading.value = true;
      error.value = false;
      offset.value = 0;
      const r = await getInventory(PAGE, 0, appFilter.value, search.value.trim() || null);
      if (r.success) {
        items.value = r.items;
        offset.value = r.items.length;
        hasMore.value = r.items.length === PAGE;
        await resolveApps(r.items);
      } else {
        error.value = true;
      }
      loading.value = false;
    }

    async function loadMore() {
      if (loadingMore.value || !hasMore.value) return;
      loadingMore.value = true;
      const r = await getInventory(PAGE, offset.value, appFilter.value, search.value.trim() || null);
      if (r.success) {
        items.value = items.value.concat(r.items);
        offset.value += r.items.length;
        hasMore.value = r.items.length === PAGE;
        await resolveApps(r.items);
      }
      loadingMore.value = false;
    }

    function onSearchInput() {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(load, 300);
    }

    async function refreshAuthAndLoad() {
      const user = await checkLogin();
      userStore.updateUser(user || null);
      loggedIn.value = !!user;
      authChecked.value = true;
      if (loggedIn.value) await load();
    }

    // Open Serble login in a top-level popup; it hands the session back via the bridge page
    // (see AuthBridgePage). This sidesteps cross-site iframe storage partitioning.
    function connect() {
      const url = `${origin}/login?return_url=${encodeURIComponent('/embed/bridge')}`;
      window.open(url, 'serble-connect', 'width=480,height=720,menubar=no,toolbar=no');
    }

    function onMessage(e) {
      if (e.origin !== origin) return;
      if (e.data?.type !== 'serble-embed-auth' || !e.data.token) return;
      setLocalStorage('access_token', e.data.token);
      refreshAuthAndLoad();
    }

    function openItem(item) { selected.value = item; }
    function closeItem() { selected.value = null; }

    function openFullPage(item) {
      window.open(`${origin}/items/${encodeURIComponent(item.id)}`, '_blank', 'noopener');
    }

    // Tell the host how tall we are so it can size the iframe to fit (no scrollbars-in-scrollbars).
    const rootEl = ref(null);
    let ro = null;
    function postHeight() {
      const h = rootEl.value?.scrollHeight;
      if (h) window.parent?.postMessage({ type: 'serble-embed-resize', height: h }, '*');
    }

    onMounted(async () => {
      window.addEventListener('message', onMessage);
      await authReadyPromise;
      loggedIn.value = !!userStore.state.user;
      authChecked.value = true;
      if (loggedIn.value) await load();
      if (rootEl.value && 'ResizeObserver' in window) {
        ro = new ResizeObserver(postHeight);
        ro.observe(rootEl.value);
      }
      postHeight();
    });
    onUnmounted(() => {
      window.removeEventListener('message', onMessage);
      if (ro) ro.disconnect();
    });

    return {
      rootEl, rootStyle, loggedIn, authChecked, loading, loadingMore, hasMore, error,
      items, isEmpty, heading, filterAppName, search, selected,
      load, loadMore, onSearchInput, connect, openItem, closeItem, openFullPage,
    };
  },
};
</script>

<template>
  <div class="embed" :style="rootStyle" ref="rootEl">
    <!-- Not signed in -->
    <div v-if="authChecked && !loggedIn" class="state connect">
      <svg width="34" height="34" viewBox="0 0 16 16" fill="currentColor" class="state-icon">
        <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zM10 2.704 4.25 5.16 1.5 4.06v7.6l6.5 2.6 6.5-2.6V4.06z"/>
      </svg>
      <p class="state-title">View your items here</p>
      <p class="state-text">Connect your Serble account to see and manage your items without leaving this app.</p>
      <button class="btn" @click="connect">Connect Serble account</button>
    </div>

    <!-- Signed in -->
    <template v-else-if="loggedIn">
      <div class="head">
        <h2 class="title">{{ heading }}</h2>
        <button class="icon-btn" :disabled="loading" @click="load" title="Refresh">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" :class="{ spin: loading }">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
        </button>
      </div>

      <input class="search" type="search" v-model="search" @input="onSearchInput" placeholder="Search your items…" />

      <div v-if="loading" class="state">Loading…</div>
      <div v-else-if="error" class="state err">Couldn't load your items.</div>
      <div v-else-if="isEmpty && search.trim()" class="state">No items match “{{ search.trim() }}”.</div>
      <div v-else-if="isEmpty" class="state">
        <p class="state-title">No items yet</p>
        <p class="state-text">Items you own{{ filterAppName ? ` from ${filterAppName}` : '' }} will show up here.</p>
      </div>

      <template v-else>
        <div class="grid">
          <button v-for="it in items" :key="it.id" class="tile" @click="openItem(it)">
            <ItemCard :item="it" :minimal="true" />
          </button>
        </div>
        <div v-if="hasMore" class="more">
          <button class="btn ghost" :disabled="loadingMore" @click="loadMore">
            {{ loadingMore ? 'Loading…' : 'Load more' }}
          </button>
        </div>
      </template>
    </template>

    <div v-else class="state">Loading…</div>

    <!-- Detail drawer — reuses the shared ItemDetails component, re-themed to the embed palette. -->
    <div v-if="selected" class="drawer-backdrop" @click.self="closeItem">
      <div class="drawer">
        <button class="drawer-close" @click="closeItem" aria-label="Close">&times;</button>
        <ItemDetails :item-id="selected.id" class="embed-details" />
        <button class="btn ghost" @click="openFullPage(selected)">Open full item page ↗</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.embed {
  background: var(--e-bg);
  color: var(--e-text);
  font-family: system-ui, sans-serif;
  padding: 16px;
  min-height: 120px;
  box-sizing: border-box;
}

.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.title { font-size: 1.05rem; font-weight: 700; margin: 0; }

.icon-btn {
  background: transparent; border: 1px solid var(--e-border); border-radius: 8px;
  color: var(--e-muted); width: 30px; height: 30px; display: flex; align-items: center;
  justify-content: center; cursor: pointer;
}
.icon-btn:hover:not(:disabled) { color: var(--e-text); }
.icon-btn:disabled { opacity: .5; cursor: default; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .9s linear infinite; }

.search {
  width: 100%; box-sizing: border-box; padding: 8px 10px; margin: 0 0 12px;
  border: 1px solid var(--e-border); border-radius: 8px; background: var(--e-surface); color: var(--e-text);
}
.more { display: flex; justify-content: center; margin-top: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.tile {
  display: block; padding: 0; border: 0; background: transparent; cursor: pointer;
  text-align: left; border-radius: 12px;
}
.tile :deep(.item-card) {
  background: var(--e-surface); border-color: var(--e-border); color: var(--e-text);
}
.tile:hover :deep(.item-card) { border-color: var(--e-accent); }
.tile:focus-visible { outline: 2px solid var(--e-accent); outline-offset: 2px; }

.state { padding: 28px 16px; text-align: center; color: var(--e-muted); }
.state.err { color: #e25555; }
.state.connect {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  background: var(--e-surface); border: 1px solid var(--e-border); border-radius: 14px; padding: 32px 20px;
}
.state-icon { color: var(--e-muted); }
.state-title { font-weight: 700; margin: 4px 0 0; color: var(--e-text); }
.state-text { font-size: .85rem; color: var(--e-muted); margin: 0; }

.btn {
  margin-top: 8px; padding: 9px 16px; border: 0; border-radius: 9px; cursor: pointer;
  font-weight: 600; background: var(--e-accent); color: #fff;
}
.btn:hover { filter: brightness(1.08); }
.btn.ghost { background: transparent; color: var(--e-text); border: 1px solid var(--e-border); width: 100%; }

/* Drawer */
.drawer-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.5);
  display: flex; justify-content: flex-end; z-index: 50;
}
.drawer {
  width: min(380px, 92vw); height: 100%; overflow-y: auto;
  background: var(--e-bg); border-left: 1px solid var(--e-border);
  padding: 20px; box-sizing: border-box; position: relative;
}
.drawer-close {
  position: absolute; top: 10px; right: 12px; background: transparent; border: 0;
  color: var(--e-muted); font-size: 1.6rem; line-height: 1; cursor: pointer; z-index: 1;
}

/* Re-theme the shared ItemDetails component to the embed's palette. */
.embed-details {
  --d-text: var(--e-text);
  --d-muted: var(--e-muted);
  --d-faint: var(--e-muted);
  --d-border: var(--e-border);
  --d-surface: var(--e-surface);
  --d-accent: var(--e-accent);
}
</style>
