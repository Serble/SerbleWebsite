<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPublicItem, getItemHistory, getPublicAppsBatch, getPublicUsersBatch } from '@/assets/js/serble.js';
import { userStore } from '@/assets/js/user.js';
import OfficialBadge from '@/components/OfficialBadge.vue';

const HISTORY_PAGE_SIZE = 10;

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Self-contained, reusable item-info UI: profile, creator/owner (with readable ids + usernames),
// and paginated ownership history. Used on the standalone item page, the inventory side panel and
// the embeddable viewer. Colours come from --d-* CSS vars (default to the site tokens) so a host
// can re-theme it by overriding those vars.
export default {
  name: 'ItemDetails',
  components: { OfficialBadge },
  props: {
    itemId: { type: String, required: true },
  },
  setup(props) {
    const { t } = useI18n();
    const myId = computed(() => userStore.state.user?.id ?? null);

    const loading = ref(true);
    const switching = ref(false);
    const notFound = ref(false);
    const error = ref(false);
    const item = ref(null);

    const appMap = ref({});
    const userMap = ref({});

    const history = ref([]);
    const historyTotal = ref(0);
    const historyOffset = ref(0);
    const historyLoading = ref(false);

    const iconUrl = computed(() => item.value?.iconUrl ?? null);
    const initial = computed(() => (item.value?.name ?? '?').charAt(0).toUpperCase() || '?');

    function describeOwner(type, id) {
      if (!type || !id) return null;
      if (type === 'App') {
        const a = appMap.value[id];
        return { kind: 'app', label: a?.name || a?.readableId || id, readableId: a?.readableId || '', isOfficial: !!a?.isOfficial, id };
      }
      const u = userMap.value[id];
      const isYou = myId.value && id === myId.value;
      const myName = userStore.state.user?.username;
      const name = (isYou && myName) ? myName : (u?.username || u?.readableId || id);
      return { kind: 'user', label: isYou ? `${name} (${t('you')})` : name, readableId: u?.readableId || '', isOfficial: false, id };
    }

    const createdApp = computed(() => describeOwner('App', item.value?.creatorAppId));
    const currentOwner = computed(() => describeOwner(item.value?.ownerType, item.value?.ownerId));

    const historyView = computed(() => history.value.map((e) => ({
      id: e.id,
      kind: e.kind,
      from: describeOwner(e.fromOwnerType, e.fromOwnerId),
      to: describeOwner(e.toOwnerType, e.toOwnerId),
      date: e.dateCreated,
      proposalId: e.proposalId,
    })));

    const historyPage = computed(() => Math.floor(historyOffset.value / HISTORY_PAGE_SIZE) + 1);
    const historyPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / HISTORY_PAGE_SIZE)));
    const canPrev = computed(() => historyOffset.value > 0);
    const canNext = computed(() => historyOffset.value + HISTORY_PAGE_SIZE < historyTotal.value);
    let loadRequestId = 0;
    let historyRequestId = 0;

    async function resolveApps(ids) {
      const missing = ids.filter((id) => id && !appMap.value[id]);
      if (missing.length === 0) return;
      const r = await getPublicAppsBatch(missing);
      if (r.success) appMap.value = { ...appMap.value, ...r.apps };
    }
    async function resolveUsers(ids) {
      const missing = ids.filter((id) => id && !userMap.value[id]);
      if (missing.length === 0) return;
      const r = await getPublicUsersBatch(missing);
      if (r.success) userMap.value = { ...userMap.value, ...r.users };
    }
    function appIdsInEntries(entries) {
      const ids = [];
      for (const e of entries) {
        if (e.fromOwnerType === 'App' && e.fromOwnerId) ids.push(e.fromOwnerId);
        if (e.toOwnerType === 'App' && e.toOwnerId) ids.push(e.toOwnerId);
      }
      return ids;
    }
    function userIdsInEntries(entries) {
      const ids = [];
      for (const e of entries) {
        if (e.fromOwnerType === 'User' && e.fromOwnerId) ids.push(e.fromOwnerId);
        if (e.toOwnerType === 'User' && e.toOwnerId) ids.push(e.toOwnerId);
      }
      return ids;
    }

    async function fetchHistoryPage(itemId, offset) {
      const r = await getItemHistory(itemId, HISTORY_PAGE_SIZE, offset);
      if (r.success) {
        await Promise.all([
          resolveApps(appIdsInEntries(r.entries)),
          resolveUsers(userIdsInEntries(r.entries)),
        ]);
        return { entries: r.entries, total: r.total, offset: r.offset };
      }
      return { entries: [], total: 0, offset };
    }

    async function loadHistory(offset) {
      const requestId = ++historyRequestId;
      const targetItemId = props.itemId;
      historyLoading.value = true;
      const nextHistory = await fetchHistoryPage(targetItemId, offset);
      if (requestId !== historyRequestId || targetItemId !== props.itemId) return;
      history.value = nextHistory.entries;
      historyTotal.value = nextHistory.total;
      historyOffset.value = nextHistory.offset;
      historyLoading.value = false;
    }

    async function load() {
      const requestId = ++loadRequestId;
      historyRequestId += 1;
      const targetItemId = props.itemId;
      const hasContent = !!item.value && !notFound.value && !error.value;
      loading.value = !hasContent;
      switching.value = hasContent;
      historyLoading.value = false;
      notFound.value = false;
      error.value = false;

      const r = await getPublicItem(targetItemId);
      if (requestId !== loadRequestId) return;
      if (!r.success) {
        if (r.flag === 'not-found') notFound.value = true;
        else error.value = true;
        item.value = null;
        history.value = [];
        historyTotal.value = 0;
        historyOffset.value = 0;
        loading.value = false;
        switching.value = false;
        return;
      }

      const appIds = [];
      if (r.item.creatorAppId) appIds.push(r.item.creatorAppId);
      if (r.item.ownerType === 'App' && r.item.ownerId) appIds.push(r.item.ownerId);
      const userIds = [];
      if (r.item.ownerType === 'User' && r.item.ownerId) userIds.push(r.item.ownerId);
      await Promise.all([resolveApps(appIds), resolveUsers(userIds)]);
      if (requestId !== loadRequestId) return;
      const nextHistory = await fetchHistoryPage(targetItemId, 0);
      if (requestId !== loadRequestId) return;
      item.value = r.item;
      history.value = nextHistory.entries;
      historyTotal.value = nextHistory.total;
      historyOffset.value = nextHistory.offset;
      historyLoading.value = false;
      loading.value = false;
      switching.value = false;
    }

    function prevPage() {
      if (canPrev.value && !historyLoading.value) loadHistory(Math.max(0, historyOffset.value - HISTORY_PAGE_SIZE));
    }
    function nextPage() {
      if (canNext.value && !historyLoading.value) loadHistory(historyOffset.value + HISTORY_PAGE_SIZE);
    }

    const copied = ref('');
    async function copy(value, key) {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        copied.value = key;
        setTimeout(() => { if (copied.value === key) copied.value = ''; }, 1200);
      } catch { /* clipboard unavailable */ }
    }

    onMounted(load);
    watch(() => props.itemId, load);

    return {
      loading, switching, notFound, error, item, iconUrl, initial,
      createdApp, currentOwner, historyView, historyTotal, historyLoading,
      historyPage, historyPages, canPrev, canNext, prevPage, nextPage,
      copied, copy, formatDate,
    };
  },
};
</script>

<template>
  <div class="item-details" :class="{ 'is-switching': switching }">
    <div v-if="loading && !item" class="state">{{ $t('loading') }}</div>
    <div v-else-if="notFound" class="state state-error">{{ $t('not-found') }}</div>
    <div v-else-if="error" class="state state-error">{{ $t('unknown-error') }}</div>

    <template v-else-if="item">
      <div class="item-content">
        <!-- Header -->
        <div class="item-head">
          <div class="head-icon">
            <img v-if="iconUrl" :src="iconUrl" :alt="item.name" class="head-icon-img" />
            <span v-else class="head-icon-placeholder">{{ initial }}</span>
          </div>
          <div class="head-text">
            <h2 class="head-name">{{ item.name }}</h2>
            <code class="head-fp" :title="$t('readable-id-label')">{{ item.readableId }}</code>
          </div>
        </div>

        <p v-if="item.description" class="item-description">{{ item.description }}</p>

        <!-- Details -->
        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">{{ $t('created-by') }}</span>
            <span class="detail-value">
              <template v-if="createdApp">
                <span class="owner-stack">
                  <span class="owner-main">
                    <span class="owner-name">{{ createdApp.label }}</span>
                    <OfficialBadge v-if="createdApp.isOfficial" icon-only />
                  </span>
                  <code v-if="createdApp.readableId" class="owner-fp" :title="$t('readable-id-label')">{{ createdApp.readableId }}</code>
                </span>
              </template>
              <span v-else>—</span>
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ $t('current-owner') }}</span>
            <span class="detail-value">
              <template v-if="currentOwner">
                <span class="owner-stack">
                  <span class="owner-main">
                    <span class="owner-name">{{ currentOwner.label }}</span>
                    <OfficialBadge v-if="currentOwner.isOfficial" icon-only />
                  </span>
                  <code v-if="currentOwner.kind === 'app' && currentOwner.readableId" class="owner-fp" :title="$t('readable-id-label')">{{ currentOwner.readableId }}</code>
                </span>
              </template>
              <span v-else>—</span>
            </span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ $t('created-on') }}</span>
            <span class="detail-value">{{ formatDate(item.dateCreated) }}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ $t('readable-id-label') }}</span>
            <code class="detail-value mono">{{ item.readableId }}</code>
          </div>

          <div class="detail-row">
            <span class="detail-label">{{ $t('id') }}</span>
            <button class="copy-id" :title="$t('copy-id')" @click="copy(item.id, 'itemId')">
              {{ copied === 'itemId' ? $t('copied') : item.id }}
            </button>
          </div>
        </div>

        <!-- Ownership history -->
        <div class="history">
          <div class="history-head">
            <h3 class="history-title">{{ $t('ownership-history') }}</h3>
            <span class="history-count">{{ historyTotal }}</span>
          </div>

          <div v-if="historyLoading" class="state">{{ $t('loading') }}</div>
          <div v-else-if="historyView.length === 0" class="state">{{ $t('no-history') }}</div>

          <ol v-else class="history-list">
            <li v-for="e in historyView" :key="e.id" class="history-item">
              <span class="kind-badge" :class="e.kind === 'Created' ? 'kind-created' : 'kind-trade'">
                {{ e.kind === 'Created' ? $t('kind-created') : $t('kind-trade') }}
              </span>
              <div class="history-body">
                <div class="history-flow">
                  <template v-if="e.kind === 'Created'">
                    <span>{{ $t('minted-by') }}</span>
                    <span class="flow-owner">{{ e.to?.label }}</span>
                    <OfficialBadge v-if="e.to?.isOfficial" icon-only />
                  </template>
                  <template v-else>
                    <span class="flow-owner">{{ e.from?.label ?? '—' }}</span>
                    <OfficialBadge v-if="e.from?.isOfficial" icon-only />
                    <span class="flow-arrow">&rarr;</span>
                    <span class="flow-owner">{{ e.to?.label ?? '—' }}</span>
                    <OfficialBadge v-if="e.to?.isOfficial" icon-only />
                  </template>
                </div>
                <div class="history-meta">
                  <span>{{ formatDate(e.date) }}</span>
                  <span v-if="e.proposalId" class="history-proposal" :title="e.proposalId">· {{ $t('proposal') }}</span>
                </div>
              </div>
            </li>
          </ol>

          <div v-if="historyPages > 1" class="pager">
            <button class="pager-btn" :disabled="!canPrev || historyLoading" @click="prevPage">&larr; {{ $t('previous') }}</button>
            <span class="pager-info">{{ $t('page-indicator', { current: historyPage, total: historyPages }) }}</span>
            <button class="pager-btn" :disabled="!canNext || historyLoading" @click="nextPage">{{ $t('next') }} &rarr;</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="switching" class="item-loading-overlay" aria-hidden="true">
      <div class="loading-pill">{{ $t('loading') }}</div>
    </div>
  </div>
</template>

<style scoped>
/* Theming contract: hosts may override these to re-skin the component (the embed maps them to
   its own palette). They default to the site design tokens. */
.item-details {
  --d-text: var(--text, #1a1a1a);
  --d-muted: var(--text-muted, #6b7280);
  --d-faint: var(--text-faint, #9aa0ac);
  --d-border: var(--border, #e3e3e6);
  --d-surface: var(--surface-sunken, #f5f6f8);
  --d-accent: var(--accent, #5865f2);
  --d-danger: var(--danger, #e25555);
  position: relative;
  color: var(--d-text);
}
.item-content {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.item-details.is-switching .item-content {
  opacity: 0.45;
  transform: translateY(4px);
}
.item-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12px;
  pointer-events: none;
}
.loading-pill {
  border: 1px solid var(--d-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--d-surface) 88%, transparent);
  color: var(--d-muted);
  font-size: 0.78rem;
  font-weight: 600;
  padding: 6px 12px;
  backdrop-filter: blur(4px);
}

.state { padding: 32px; text-align: center; color: var(--d-muted); }
.state-error { color: var(--d-danger); }

.item-head { display: flex; align-items: center; gap: 16px; }
.head-icon {
  flex: 0 0 auto; width: 64px; height: 64px; border-radius: 14px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--d-accent) 14%, transparent); border: 1px solid var(--d-border);
}
.head-icon-img { width: 100%; height: 100%; object-fit: cover; }
.head-icon-placeholder { font-weight: 800; font-size: 28px; color: var(--d-accent); }
.head-text { min-width: 0; }
.head-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--d-text); word-break: break-word; }
.head-fp { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8rem; color: var(--d-faint); }

.item-description { margin: 18px 0 0; color: var(--d-muted); line-height: 1.5; }

.detail-grid { margin-top: 22px; border: 1px solid var(--d-border); border-radius: 12px; overflow: hidden; }
.detail-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-bottom: 1px solid var(--d-border); }
.detail-row:last-child { border-bottom: none; }
.detail-label {
  flex: 0 0 120px; font-size: 0.74rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--d-faint);
}
.detail-value {
  flex: 1 1 auto; min-width: 0; display: inline-flex; align-items: flex-start; gap: 6px;
  color: var(--d-text); word-break: break-word;
}
.detail-value.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85rem; }
.owner-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.owner-main {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
.owner-name { font-weight: 600; }
.owner-fp {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; color: var(--d-faint);
  background: var(--d-surface); border: 1px solid var(--d-border); border-radius: 5px; padding: 1px 6px;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}
.copy-id {
  flex: 1 1 auto; text-align: left; padding: 4px 8px; border: 1px solid var(--d-border); border-radius: 6px;
  background: var(--d-surface); color: var(--d-muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem; word-break: break-all; cursor: pointer;
}
.copy-id:hover { color: var(--d-text); }

.history { margin-top: 28px; }
.history-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.history-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--d-text); }
.history-count {
  font-size: 0.72rem; font-weight: 700; color: var(--d-muted); background: var(--d-surface);
  border: 1px solid var(--d-border); border-radius: 999px; padding: 1px 8px;
}
.history-list { list-style: none; margin: 0; padding: 0; }
.history-item {
  display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: 1px solid var(--d-border);
  border-radius: 10px; margin-bottom: 8px; background: var(--d-surface);
}
.kind-badge {
  flex: 0 0 auto; font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 3px 8px; border-radius: 6px;
}
.kind-created { background: #1f4d2e; color: #86efac; }
.kind-trade { background: #2c4a6b; color: #93c5fd; }
.history-body { min-width: 0; flex: 1 1 auto; }
.history-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: var(--d-text); font-size: 0.9rem; }
.flow-owner { font-weight: 600; word-break: break-word; }
.flow-arrow { color: var(--d-faint); }
.history-meta { margin-top: 2px; font-size: 0.75rem; color: var(--d-faint); }
.history-proposal { cursor: help; }

.pager { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
.pager-btn {
  padding: 6px 14px; border: 1px solid var(--d-border); border-radius: 8px; background: transparent;
  color: var(--d-text); font-weight: 600; font-size: 0.85rem; cursor: pointer;
}
.pager-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pager-info { font-size: 0.8rem; color: var(--d-muted); }
</style>
