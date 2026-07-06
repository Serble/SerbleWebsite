<script>
import { ref, computed, onMounted, watch } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import {
  getUserTrades, createUserTrade, approveUserTrade, denyUserTrade, cancelUserTrade, getInventory, getUserItems,
} from '@/assets/js/serble.js';
import { parseCoinsToRaw } from '@/assets/js/coins.js';
import CoinAmount from '@/components/CoinAmount.vue';
import ItemCard from '@/components/ItemCard.vue';
import RefreshButton from '@/components/RefreshButton.vue';

// Status → display label + style. The API uses Approved/Denied; users think
// "complete"/"rejected".
const STATUS_META = {
  Pending:    { label: 'Pending',    cls: 'pending' },
  InProgress: { label: 'Processing', cls: 'pending' },
  Approved:   { label: 'Complete',   cls: 'ok' },
  Denied:     { label: 'Rejected',   cls: 'bad' },
  Cancelled:  { label: 'Cancelled',  cls: 'muted' },
  Expired:    { label: 'Expired',    cls: 'muted' },
  Failed:     { label: 'Failed',     cls: 'bad' },
};

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default {
  name: 'TradesPage',
  components: { CoinAmount, ItemCard, RefreshButton },
  setup() {
    ensureLoggedIn();

    const loading = ref(true);
    const error = ref(false);
    const trades = ref([]);
    const tab = ref('incoming'); // incoming | outgoing | all
    const busyId = ref(null);    // trade id currently being acted on

    // Propose form
    const toUser = ref('');
    const offerCoins = ref('');
    const requestCoins = ref('');
    const description = ref('');
    const selectedOfferIds = ref([]);          // item ids chosen to offer
    const selectedOfferItems = ref({});        // id -> item, so chips render across pages/searches
    const submitting = ref(false);
    const formError = ref('');
    const formSuccess = ref('');
    const showForm = ref(false);

    const PICKER_PAGE = 12;

    // Offered-items picker (your inventory) — server-side search + pagination.
    const pickerSearch = ref('');
    const pickerItems = ref([]);
    const pickerPage = ref(0);
    const pickerHasMore = ref(false);
    const pickerLoading = ref(false);
    const pickerLoaded = ref(false);
    let searchTimer = null;

    // Requested-items picker (the recipient's inventory) — so you select what you want instead of
    // typing ids. Loaded for whoever is in the recipient field.
    const reqSearch = ref('');
    const reqItems = ref([]);
    const reqPage = ref(0);
    const reqHasMore = ref(false);
    const reqLoading = ref(false);
    const reqNotFound = ref(false);
    const reqFor = ref('');                     // recipient the picker currently reflects
    const selectedRequestIds = ref([]);
    const selectedRequestItems = ref({});
    let reqSearchTimer = null;
    let recipientTimer = null;

    async function loadTrades() {
      loading.value = true;
      error.value = false;
      const r = await getUserTrades('all');
      if (r.success) trades.value = r.trades;
      else error.value = true;
      loading.value = false;
    }

    async function loadPicker() {
      pickerLoading.value = true;
      const r = await getInventory(PICKER_PAGE, pickerPage.value * PICKER_PAGE, null, pickerSearch.value.trim() || null);
      if (r.success) {
        pickerItems.value = r.items;
        pickerHasMore.value = r.items.length === PICKER_PAGE;
      } else {
        pickerItems.value = [];
        pickerHasMore.value = false;
      }
      pickerLoading.value = false;
      pickerLoaded.value = true;
    }

    function onSearchInput() {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { pickerPage.value = 0; loadPicker(); }, 300);
    }
    function pickerNext() { if (pickerHasMore.value) { pickerPage.value++; loadPicker(); } }
    function pickerPrev() { if (pickerPage.value > 0) { pickerPage.value--; loadPicker(); } }

    // ---- requested-items picker (recipient's inventory) ----
    async function loadReqPicker() {
      const recipient = toUser.value.trim();
      if (!recipient) { reqItems.value = []; reqHasMore.value = false; reqNotFound.value = false; return; }
      reqLoading.value = true;
      reqNotFound.value = false;
      const r = await getUserItems(recipient, PICKER_PAGE, reqPage.value * PICKER_PAGE, reqSearch.value.trim() || null);
      if (r.success) {
        reqItems.value = r.items;
        reqHasMore.value = r.items.length === PICKER_PAGE;
      } else {
        reqItems.value = [];
        reqHasMore.value = false;
        if (r.flag === 'not-found') reqNotFound.value = true;
      }
      reqLoading.value = false;
    }
    function onReqSearchInput() {
      if (reqSearchTimer) clearTimeout(reqSearchTimer);
      reqSearchTimer = setTimeout(() => { reqPage.value = 0; loadReqPicker(); }, 300);
    }
    function reqNext() { if (reqHasMore.value) { reqPage.value++; loadReqPicker(); } }
    function reqPrev() { if (reqPage.value > 0) { reqPage.value--; loadReqPicker(); } }

    // When the recipient changes, reload their items; clear any requested selections that belonged
    // to a different recipient (those items aren't theirs to give).
    watch(toUser, () => {
      if (recipientTimer) clearTimeout(recipientTimer);
      recipientTimer = setTimeout(() => {
        const recipient = toUser.value.trim();
        if (recipient !== reqFor.value) {
          reqFor.value = recipient;
          selectedRequestIds.value = [];
          selectedRequestItems.value = {};
          reqSearch.value = '';
          reqPage.value = 0;
        }
        loadReqPicker();
      }, 400);
    });

    // Load the offered picker the first time the form is opened.
    watch(showForm, (open) => { if (open && !pickerLoaded.value) loadPicker(); });

    onMounted(loadTrades);

    const incoming = computed(() => trades.value.filter(t => t.direction === 'incoming'));
    const outgoing = computed(() => trades.value.filter(t => t.direction === 'outgoing'));
    const pendingIncoming = computed(() => incoming.value.filter(t => t.status === 'Pending').length);

    const visibleTrades = computed(() => {
      if (tab.value === 'incoming') return incoming.value;
      if (tab.value === 'outgoing') return outgoing.value;
      return trades.value;
    });

    // What the caller gives / gets, resolved from the trade's perspective.
    function sides(t) {
      if (t.direction === 'outgoing') {
        return {
          counterparty: t.toUsername,
          giveCoins: t.offeredCoins, giveItems: t.offeredItems,
          getCoins: t.requestedCoins, getItems: t.requestedItems,
        };
      }
      return {
        counterparty: t.fromUsername,
        giveCoins: t.requestedCoins, giveItems: t.requestedItems,
        getCoins: t.offeredCoins, getItems: t.offeredItems,
      };
    }
    function statusMeta(s) { return STATUS_META[s] || { label: s, cls: 'muted' }; }
    function rawStr(v) { return String(v ?? '0'); }

    // Selected items are remembered (with their display data) so the chips stay visible even when
    // the user searches or pages to a different part of their inventory.
    const selectedOfferList = computed(() => selectedOfferIds.value.map(id => selectedOfferItems.value[id]).filter(Boolean));

    function toggleOffer(item) {
      const id = item.id;
      const i = selectedOfferIds.value.indexOf(id);
      if (i >= 0) {
        selectedOfferIds.value.splice(i, 1);
        delete selectedOfferItems.value[id];
      } else {
        selectedOfferIds.value.push(id);
        selectedOfferItems.value[id] = item;
      }
    }
    function removeOffer(id) {
      const i = selectedOfferIds.value.indexOf(id);
      if (i >= 0) selectedOfferIds.value.splice(i, 1);
      delete selectedOfferItems.value[id];
    }
    function isSelected(id) { return selectedOfferIds.value.includes(id); }

    const selectedRequestList = computed(() => selectedRequestIds.value.map(id => selectedRequestItems.value[id]).filter(Boolean));
    function toggleRequest(item) {
      const id = item.id;
      const i = selectedRequestIds.value.indexOf(id);
      if (i >= 0) {
        selectedRequestIds.value.splice(i, 1);
        delete selectedRequestItems.value[id];
      } else {
        selectedRequestIds.value.push(id);
        selectedRequestItems.value[id] = item;
      }
    }
    function removeRequest(id) {
      const i = selectedRequestIds.value.indexOf(id);
      if (i >= 0) selectedRequestIds.value.splice(i, 1);
      delete selectedRequestItems.value[id];
    }
    function isRequestSelected(id) { return selectedRequestIds.value.includes(id); }

    async function submit() {
      formError.value = '';
      formSuccess.value = '';
      if (!toUser.value.trim()) { formError.value = 'Enter the recipient username.'; return; }

      const offeredRaw = offerCoins.value.trim() ? parseCoinsToRaw(offerCoins.value.trim()) : '0';
      const requestedRaw = requestCoins.value.trim() ? parseCoinsToRaw(requestCoins.value.trim()) : '0';
      if (offeredRaw === null || requestedRaw === null) { formError.value = 'Enter a valid coin amount.'; return; }

      const requestedItemIds = selectedRequestIds.value.slice();

      const movesSomething = offeredRaw !== '0' || requestedRaw !== '0'
        || selectedOfferIds.value.length > 0 || requestedItemIds.length > 0;
      if (!movesSomething) { formError.value = 'A trade must include at least some coins or items.'; return; }

      submitting.value = true;
      const r = await createUserTrade(
        toUser.value.trim(), offeredRaw, requestedRaw,
        selectedOfferIds.value.slice(), requestedItemIds, description.value.trim());
      submitting.value = false;

      if (r.success) {
        formSuccess.value = `Trade proposed to ${r.trade.toUsername || toUser.value.trim()}.`;
        toUser.value = ''; offerCoins.value = ''; requestCoins.value = ''; description.value = '';
        selectedOfferIds.value = []; selectedOfferItems.value = {};
        selectedRequestIds.value = []; selectedRequestItems.value = {};
        reqItems.value = []; reqFor.value = '';
        showForm.value = false;
        await loadTrades();
      } else {
        formError.value = r.message || 'Could not create the trade.';
      }
    }

    async function act(t, action) {
      if (busyId.value) return;
      busyId.value = t.id;
      const fn = action === 'approve' ? approveUserTrade : action === 'deny' ? denyUserTrade : cancelUserTrade;
      const r = await fn(t.id);
      busyId.value = null;
      if (!r.success) { alert(r.message || `Could not ${action} the trade.`); return; }
      await loadTrades();
    }

    return {
      loading, error, trades, tab, busyId,
      toUser, offerCoins, requestCoins, description, selectedOfferIds,
      submitting, formError, formSuccess, showForm,
      pickerSearch, pickerItems, pickerPage, pickerHasMore, pickerLoading, pickerLoaded,
      selectedOfferList, onSearchInput, pickerNext, pickerPrev, removeOffer, isSelected,
      reqSearch, reqItems, reqPage, reqHasMore, reqLoading, reqNotFound,
      selectedRequestList, onReqSearchInput, reqNext, reqPrev, toggleRequest, removeRequest, isRequestSelected,
      incoming, outgoing, pendingIncoming, visibleTrades,
      sides, statusMeta, rawStr, toggleOffer, submit, act, formatDate, loadTrades,
    };
  },
};
</script>

<template>
  <div class="trades-page">
    <div class="head">
      <h3 class="title">Trades</h3>
      <button class="btn primary" @click="showForm = !showForm">{{ showForm ? 'Close' : 'New trade' }}</button>
    </div>
    <p class="subtitle">Propose trades of coins and items to other users, and approve or deny trades sent to you.</p>

    <!-- Propose form -->
    <section v-if="showForm" class="card form">
      <h4 class="card-title">Propose a trade</h4>
      <div v-if="formError" class="banner bad">{{ formError }}</div>

      <label class="field">
        <span class="field-label">Recipient username</span>
        <input v-model="toUser" type="text" placeholder="e.g. alice" />
      </label>

      <div class="two-col">
        <div class="give-col">
          <p class="col-head">You give</p>
          <label class="field">
            <span class="field-label">Coins</span>
            <input v-model="offerCoins" type="text" inputmode="decimal" placeholder="0" />
          </label>
          <p class="field-label">Items from your inventory</p>

          <!-- Chips for items already chosen (persist across search/pages). -->
          <div v-if="selectedOfferList.length" class="chips">
            <span v-for="it in selectedOfferList" :key="it.id" class="chip" :title="it.name">
              {{ it.name }}
              <button type="button" class="chip-x" @click="removeOffer(it.id)" aria-label="Remove">×</button>
            </span>
          </div>

          <input class="picker-search" type="search" v-model="pickerSearch" @input="onSearchInput"
                 placeholder="Search your items…" />

          <div v-if="pickerLoading" class="hint">Loading…</div>
          <template v-else>
            <div v-if="pickerItems.length" class="pick-grid">
              <button v-for="it in pickerItems" :key="it.id" type="button"
                      class="pick" :class="{ on: isSelected(it.id) }" @click="toggleOffer(it)">
                <ItemCard :item="it" :minimal="true" />
              </button>
            </div>
            <p v-else-if="pickerSearch.trim()" class="hint">No items match “{{ pickerSearch.trim() }}”.</p>
            <p v-else class="hint">You own no items to offer.</p>

            <div v-if="pickerItems.length && (pickerPage > 0 || pickerHasMore)" class="pager">
              <button type="button" class="pg-btn" :disabled="pickerPage === 0" @click="pickerPrev">‹ Prev</button>
              <span class="pg-info">Page {{ pickerPage + 1 }}</span>
              <button type="button" class="pg-btn" :disabled="!pickerHasMore" @click="pickerNext">Next ›</button>
            </div>
          </template>
        </div>

        <div class="get-col">
          <p class="col-head">You get</p>
          <label class="field">
            <span class="field-label">Coins</span>
            <input v-model="requestCoins" type="text" inputmode="decimal" placeholder="0" />
          </label>

          <p class="field-label">Items from {{ toUser.trim() ? `${toUser.trim()}'s` : 'their' }} inventory</p>

          <!-- Chips for requested items already chosen. -->
          <div v-if="selectedRequestList.length" class="chips">
            <span v-for="it in selectedRequestList" :key="it.id" class="chip" :title="it.name">
              {{ it.name }}
              <button type="button" class="chip-x" @click="removeRequest(it.id)" aria-label="Remove">×</button>
            </span>
          </div>

          <p v-if="!toUser.trim()" class="hint">Enter a recipient above to browse and pick their items.</p>
          <template v-else>
            <input class="picker-search" type="search" v-model="reqSearch" @input="onReqSearchInput"
                   placeholder="Search their items…" />
            <div v-if="reqLoading" class="hint">Loading…</div>
            <template v-else>
              <p v-if="reqNotFound" class="hint">No user “{{ toUser.trim() }}” found.</p>
              <div v-else-if="reqItems.length" class="pick-grid">
                <button v-for="it in reqItems" :key="it.id" type="button"
                        class="pick" :class="{ on: isRequestSelected(it.id) }" @click="toggleRequest(it)">
                  <ItemCard :item="it" :minimal="true" />
                </button>
              </div>
              <p v-else-if="reqSearch.trim()" class="hint">No items match “{{ reqSearch.trim() }}”.</p>
              <p v-else class="hint">This user has no items.</p>

              <div v-if="reqItems.length && (reqPage > 0 || reqHasMore)" class="pager">
                <button type="button" class="pg-btn" :disabled="reqPage === 0" @click="reqPrev">‹ Prev</button>
                <span class="pg-info">Page {{ reqPage + 1 }}</span>
                <button type="button" class="pg-btn" :disabled="!reqHasMore" @click="reqNext">Next ›</button>
              </div>
            </template>
          </template>
        </div>
      </div>

      <label class="field">
        <span class="field-label">Note (optional)</span>
        <input v-model="description" type="text" maxlength="256" placeholder="What's this trade for?" />
      </label>

      <button class="btn primary" :disabled="submitting" @click="submit">
        {{ submitting ? 'Sending…' : 'Send trade' }}
      </button>
    </section>
    <div v-if="formSuccess" class="banner ok">{{ formSuccess }}</div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'incoming' }" @click="tab = 'incoming'">
        Incoming<span v-if="pendingIncoming" class="count">{{ pendingIncoming }}</span>
      </button>
      <button class="tab" :class="{ active: tab === 'outgoing' }" @click="tab = 'outgoing'">Sent</button>
      <button class="tab" :class="{ active: tab === 'all' }" @click="tab = 'all'">All</button>
      <RefreshButton small class="trades-refresh" :loading="loading" @click="loadTrades" title="Refresh" />
    </div>

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state bad">Couldn't load your trades.</div>
    <div v-else-if="visibleTrades.length === 0" class="state">No trades here yet.</div>

    <ul v-else class="trade-list">
      <li v-for="t in visibleTrades" :key="t.id" class="trade">
        <div class="trade-top">
          <div class="who">
            <span class="dir">{{ t.direction === 'incoming' ? 'From' : 'To' }}</span>
            <strong>{{ sides(t).counterparty }}</strong>
            <span v-if="t.isGift" class="gift-tag">gift</span>
          </div>
          <span class="badge" :class="statusMeta(t.status).cls">{{ statusMeta(t.status).label }}</span>
        </div>

        <div class="swap">
          <div class="swap-col">
            <p class="swap-head">You give</p>
            <p v-if="rawStr(sides(t).giveCoins) !== '0'" class="coins"><CoinAmount :value="rawStr(sides(t).giveCoins)" /> coins</p>
            <ItemCard v-for="it in sides(t).giveItems" :key="it.id" :item="it" :minimal="true" />
            <p v-if="rawStr(sides(t).giveCoins) === '0' && sides(t).giveItems.length === 0" class="nothing">nothing</p>
          </div>
          <div class="swap-arrow">⇄</div>
          <div class="swap-col">
            <p class="swap-head">You get</p>
            <p v-if="rawStr(sides(t).getCoins) !== '0'" class="coins"><CoinAmount :value="rawStr(sides(t).getCoins)" /> coins</p>
            <ItemCard v-for="it in sides(t).getItems" :key="it.id" :item="it" :minimal="true" />
            <p v-if="rawStr(sides(t).getCoins) === '0' && sides(t).getItems.length === 0" class="nothing">nothing</p>
          </div>
        </div>

        <p v-if="t.description" class="note">“{{ t.description }}”</p>
        <p v-if="t.status === 'Failed' && t.failureReason" class="fail">{{ t.failureReason }}</p>

        <div class="trade-foot">
          <span class="time">{{ formatDate(t.createdAt) }}</span>
          <div class="actions">
            <template v-if="t.status === 'Pending' && t.direction === 'incoming'">
              <button class="btn small primary" :disabled="busyId === t.id" @click="act(t, 'approve')">Approve</button>
              <button class="btn small bad" :disabled="busyId === t.id" @click="act(t, 'deny')">Deny</button>
            </template>
            <template v-else-if="t.status === 'Pending' && t.direction === 'outgoing'">
              <button class="btn small ghost" :disabled="busyId === t.id" @click="act(t, 'cancel')">Cancel</button>
            </template>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.trades-page { max-width: 760px; margin: 0 auto; padding: 40px 24px 60px; }
.head { display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0; }
.subtitle { font-size: 0.85rem; color: var(--text-muted); margin: 6px 0 20px; }

.card {
  background: var(--surface-sunken); border: 1px solid var(--border);
  border-radius: 14px; padding: 18px 20px; margin-bottom: 20px;
}
.card-title { margin: 0 0 12px; font-size: 1rem; font-weight: 700; color: var(--text); }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 8px 0; }
@media (max-width: 560px) { .two-col { grid-template-columns: 1fr; } }
.col-head { font-weight: 700; font-size: 0.85rem; color: var(--text); margin: 0 0 6px; }
.field { display: block; margin-bottom: 12px; }
.field-label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
.field input {
  width: 100%; padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px;
  background: var(--surface); color: var(--text); box-sizing: border-box;
}
.hint { font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 0; }

.pick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.pick { padding: 0; border: 2px solid transparent; background: transparent; border-radius: 14px; cursor: pointer; }
.pick.on { border-color: var(--accent); }

.picker-search {
  width: 100%; padding: 8px 10px; margin: 0 0 8px; box-sizing: border-box;
  border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text);
}
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 4px; max-width: 100%;
  background: color-mix(in srgb, var(--accent) 16%, var(--surface)); color: var(--text);
  border: 1px solid var(--border); border-radius: 999px; padding: 3px 6px 3px 10px; font-size: 0.8rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.chip-x { border: 0; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 1rem; line-height: 1; padding: 0 2px; }
.chip-x:hover { color: var(--text); }
.pager { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 10px; }
.pg-btn { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 8px; padding: 5px 12px; cursor: pointer; font-size: 0.85rem; }
.pg-btn:disabled { opacity: 0.5; cursor: default; }
.pg-info { font-size: 0.8rem; color: var(--text-muted); }

.btn {
  border: 0; border-radius: 9px; padding: 9px 16px; font-weight: 600; cursor: pointer;
  background: var(--surface); color: var(--text); border: 1px solid var(--border);
}
.btn.primary { background: var(--accent); color: #fff; border-color: transparent; }
.btn.bad { background: var(--danger); color: #fff; border-color: transparent; }
.btn.ghost { background: transparent; }
.btn.small { padding: 6px 12px; font-size: 0.85rem; }
.btn:disabled { opacity: 0.55; cursor: default; }

.banner { padding: 9px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 0.88rem; }
.banner.bad, .state.bad, .fail { color: var(--danger); }
.banner.bad { background: color-mix(in srgb, var(--danger) 12%, transparent); }
.banner.ok { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--text); margin-bottom: 16px; }

.tabs { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.tab {
  background: transparent; border: 0; padding: 10px 14px; cursor: pointer; color: var(--text-muted);
  font-weight: 600; border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tab.active { color: var(--text); border-bottom-color: var(--accent); }
.count {
  display: inline-block; margin-left: 6px; background: var(--accent); color: #fff;
  border-radius: 999px; font-size: 0.72rem; padding: 1px 7px; font-weight: 700;
}
.trades-refresh { margin-left: auto; }

.state { padding: 36px; text-align: center; color: var(--text-muted); }

.trade-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.trade { background: var(--surface-sunken); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px; }
.trade-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.who { display: flex; align-items: center; gap: 6px; color: var(--text); }
.who .dir { color: var(--text-muted); font-size: 0.82rem; }
.gift-tag { font-size: 0.72rem; background: var(--accent); color: #fff; border-radius: 999px; padding: 1px 8px; }

.badge { font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 999px; }
.badge.ok { background: color-mix(in srgb, #2ea043 22%, transparent); color: #2ea043; }
.badge.bad { background: color-mix(in srgb, var(--danger) 18%, transparent); color: var(--danger); }
.badge.pending { background: color-mix(in srgb, #d29922 24%, transparent); color: #d29922; }
.badge.muted { background: var(--surface); color: var(--text-muted); }

.swap { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: start; }
.swap-col { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.swap-head { font-size: 0.76rem; color: var(--text-muted); margin: 0; text-transform: uppercase; letter-spacing: 0.03em; }
.swap-arrow { align-self: center; color: var(--text-muted); font-size: 1.2rem; }
.coins { margin: 0; font-weight: 700; color: var(--text); }
.nothing { margin: 0; color: var(--text-muted); font-size: 0.85rem; }

.note { font-style: italic; color: var(--text-muted); font-size: 0.85rem; margin: 10px 0 0; }
.fail { font-size: 0.82rem; margin: 8px 0 0; }
.trade-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.time { font-size: 0.78rem; color: var(--text-muted); }
.actions { display: flex; gap: 8px; }
</style>
