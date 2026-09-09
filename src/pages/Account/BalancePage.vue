<script>
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getBalance, transferCoins, getTransactions } from '@/assets/js/serble.js';
import { parseCoinsToRaw, isValidCoinAmount, formatCoins } from '@/assets/js/coins.js';
import CoinIcon from '@/components/CoinIcon.vue';
import CoinAmount from '@/components/CoinAmount.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import RefreshButton from '@/components/RefreshButton.vue';
import Icon from '@/components/Icon.vue';

function toDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// The API returns coin amounts as fixed-point integers that can exceed Number
// precision, so every total is summed as a BigInt and handed to CoinAmount as a
// raw string.
function sumRaw(values) {
  let total = 0n;
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (/^\d+$/.test(s)) total += BigInt(s);
  }
  return total.toString();
}

export default {
  components: { CoinIcon, CoinAmount, LoadingSpinner, RefreshButton, Icon },
  setup() {
    ensureLoggedIn();

    const { t } = useI18n();
    const loading = ref(true);
    const error = ref(false);
    const coins = ref('0');
    const balanceId = ref('');

    // Send-coins form
    const recipient = ref('');
    const amount = ref('');
    const description = ref('');
    const sending = ref(false);
    const sendError = ref('');
    const sendSuccess = ref('');

    // Transaction history
    const TX_PAGE_SIZE = 50;
    const txLoading = ref(true);
    const txError = ref(false);
    const txLoadingMore = ref(false);
    const txHasMore = ref(false);
    const transactions = ref([]);
    const txFilter = ref('all');
    const expandedId = ref('');

    async function load() {
      loading.value = true;
      error.value = false;
      const r = await getBalance();
      loading.value = false;
      if (r.success) {
        coins.value = String(r.balance?.coins ?? '0');
        balanceId.value = String(r.balance?.id ?? '');
      } else {
        error.value = true;
      }
    }

    async function loadTransactions() {
      txLoading.value = true;
      txError.value = false;
      expandedId.value = '';
      const r = await getTransactions(TX_PAGE_SIZE, 0);
      txLoading.value = false;
      if (r.success) {
        const list = Array.isArray(r.transactions) ? r.transactions : [];
        transactions.value = list;
        // If we got a full page back there may be more to load.
        txHasMore.value = list.length === TX_PAGE_SIZE;
      } else {
        txError.value = true;
        txHasMore.value = false;
      }
    }

    async function loadMoreTransactions() {
      if (txLoadingMore.value || !txHasMore.value) return;
      txLoadingMore.value = true;
      const r = await getTransactions(TX_PAGE_SIZE, transactions.value.length);
      txLoadingMore.value = false;
      if (r.success) {
        const list = Array.isArray(r.transactions) ? r.transactions : [];
        transactions.value = transactions.value.concat(list);
        txHasMore.value = list.length === TX_PAGE_SIZE;
      } else {
        txError.value = true;
      }
    }

    async function send() {
      sendError.value = '';
      sendSuccess.value = '';

      const recip = recipient.value.trim();
      const amt = amount.value.trim();
      if (!recip) {
        sendError.value = t('trade-err-recipient');
        return;
      }
      if (!isValidCoinAmount(amt)) {
        sendError.value = t('enter-amount');
        return;
      }
      const rawAmount = parseCoinsToRaw(amt);

      sending.value = true;
      const r = await transferCoins(recip, rawAmount, description.value.trim());
      sending.value = false;

      if (r.success) {
        const newCoins = r.data?.fromBalance?.coins;
        if (newCoins != null) coins.value = String(newCoins);
        sendSuccess.value = t('coins-sent');
        recipient.value = '';
        amount.value = '';
        description.value = '';
        load();
        loadTransactions();
      } else if (r.error === 404) {
        sendError.value = t('recipient-not-found');
      } else if (r.error === 400) {
        // The server's own message is more specific when it sends one, but it
        // only ever comes back in English.
        sendError.value = r.message || t('transfer-failed');
      } else if (r.error === 403) {
        sendError.value = t('no-permission-send-coins');
      } else {
        sendError.value = t('something-went-wrong');
      }
    }

    // 'sent' | 'received' | '' while the balance id is still unknown, in which
    // case the row stays neutral rather than guessing a direction.
    function direction(tx) {
      if (!balanceId.value) return '';
      if (tx.fromBalanceId === balanceId.value) return 'sent';
      if (tx.toBalanceId === balanceId.value) return 'received';
      return '';
    }

    function dayLabel(date) {
      const now = new Date();
      if (sameDay(date, now)) return t('today');
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (sameDay(date, yesterday)) return t('yesterday');
      return date.toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    }

    function timeLabel(date) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }

    // One view model per transaction, so the template never has to reach into
    // the raw API shape or format anything itself.
    const txView = computed(() => transactions.value.map((tx) => {
      const date = toDate(tx.dateCreated);
      const dir = direction(tx);
      return {
        id: String(tx.id ?? ''),
        dir,
        amount: String(tx.amount ?? '0'),
        amountTitle: formatCoins(tx.amount),
        note: (tx.description ?? '').trim(),
        fromBalanceId: tx.fromBalanceId ?? '',
        toBalanceId: tx.toBalanceId ?? '',
        date,
        dayKey: date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : 'unknown',
        dayLabel: date ? dayLabel(date) : t('unknown'),
        time: date ? timeLabel(date) : '',
        fullDate: date ? date.toLocaleString() : t('unknown'),
      };
    }));

    const filteredTx = computed(() => (
      txFilter.value === 'all'
        ? txView.value
        : txView.value.filter((tx) => tx.dir === txFilter.value)
    ));

    // The list arrives newest first, so grouping in order keeps that ordering.
    const txDays = computed(() => {
      const days = [];
      let current = null;
      for (const tx of filteredTx.value) {
        if (!current || current.key !== tx.dayKey) {
          current = { key: tx.dayKey, label: tx.dayLabel, items: [] };
          days.push(current);
        }
        current.items.push(tx);
      }
      return days;
    });

    const totalReceived = computed(() => sumRaw(
      txView.value.filter((tx) => tx.dir === 'received').map((tx) => tx.amount)
    ));
    const totalSent = computed(() => sumRaw(
      txView.value.filter((tx) => tx.dir === 'sent').map((tx) => tx.amount)
    ));

    const emptyMessage = computed(() => {
      if (txView.value.length === 0) return t('no-transactions');
      if (txFilter.value === 'sent') return t('no-transactions-sent');
      if (txFilter.value === 'received') return t('no-transactions-received');
      return t('no-transactions');
    });

    function toggleExpanded(id) {
      expandedId.value = expandedId.value === id ? '' : id;
    }

    const copied = ref('');
    let copyTimer = null;
    async function copy(value, key) {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        return; // Clipboard unavailable; the value is still selectable.
      }
      copied.value = key;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied.value = ''; }, 2000);
    }

    onMounted(() => {
      load();
      loadTransactions();
    });

    return {
      loading, error, coins, balanceId, load,
      recipient, amount, description, sending, sendError, sendSuccess, send,
      txLoading, txError, transactions, loadTransactions,
      txLoadingMore, txHasMore, loadMoreTransactions,
      txFilter, txDays, filteredTx, totalReceived, totalSent, emptyMessage,
      expandedId, toggleExpanded, copied, copy,
    };
  }
};
</script>

<template>
  <div class="balance-page">
    <div class="balance-header">
      <h3 class="balance-title">{{ $t('your-balance') }}</h3>
      <RefreshButton :loading="loading" @click="load" :title="$t('reload')" />
    </div>

    <div class="balance-card">
      <div v-if="loading" class="balance-state">{{ $t('loading') }}</div>
      <div v-else-if="error" class="balance-state balance-error">{{ $t('unknown-error') }}</div>
      <template v-else>
        <CoinIcon :size="64" class="coin-badge-icon" />
        <div class="coin-amount"><CoinAmount :value="coins" /></div>
        <div class="coin-label">{{ $t('coins') }}</div>

        <button
          v-if="balanceId"
          type="button"
          class="id-chip balance-id-chip"
          :class="{ copied: copied === 'balanceId' }"
          :title="$t('copy-value')"
          @click="copy(balanceId, 'balanceId')"
        >
          <span class="id-chip-label">{{ $t('your-balance-id') }}</span>
          <code class="id-chip-value">{{ balanceId }}</code>
          <Icon :name="copied === 'balanceId' ? 'check' : 'copy'" :size="12" />
          <span class="sr-only">{{ copied === 'balanceId' ? $t('copied') : $t('copy-value') }}</span>
        </button>
      </template>
    </div>

    <!-- -- Send coins -- -->
    <div class="panel">
      <h4 class="panel-title">{{ $t('send-coins') }}</h4>
      <p class="panel-subtitle">{{ $t('send-coins-subtitle') }}</p>

      <div class="form-grid">
        <label class="field">
          <span class="field-label">{{ $t('recipient') }}</span>
          <input
            type="text"
            class="input"
            :placeholder="$t('recipient-placeholder')"
            v-model="recipient"
            :disabled="sending"
          >
        </label>

        <label class="field">
          <span class="field-label">{{ $t('amount') }}</span>
          <input
            type="text"
            inputmode="decimal"
            class="input"
            placeholder="0"
            v-model="amount"
            :disabled="sending"
          >
        </label>

        <label class="field field-full">
          <span class="field-label">{{ $t('note-optional') }}</span>
          <input
            type="text"
            class="input"
            maxlength="256"
            :placeholder="$t('note-placeholder')"
            v-model="description"
            :disabled="sending"
          >
        </label>
      </div>

      <p v-if="sendError" class="form-message form-error">{{ sendError }}</p>
      <p v-if="sendSuccess" class="form-message form-success">{{ sendSuccess }}</p>

      <button class="send-btn" :disabled="sending" @click="send">
        <LoadingSpinner v-if="sending" class="me-1" />
        <Icon v-else name="send" class="me-1" />
        {{ $t('send') }}
      </button>
    </div>

    <!-- -- Transaction history -- -->
    <div class="panel">
      <div class="panel-head">
        <h4 class="panel-title">{{ $t('transaction-history') }}</h4>
        <RefreshButton small :loading="txLoading" @click="loadTransactions" :title="$t('reload')" />
      </div>

      <div v-if="txLoading" class="tx-state">{{ $t('loading') }}</div>
      <div v-else-if="txError" class="tx-state tx-error">{{ $t('unknown-error') }}</div>
      <div v-else-if="transactions.length === 0" class="tx-state">{{ $t('no-transactions') }}</div>

      <template v-else>
        <!-- Totals across everything loaded so far, not the whole account. -->
        <div class="tx-summary">
          <div class="tx-stat tx-stat-in">
            <span class="tx-stat-label">{{ $t('total-received') }}</span>
            <span class="tx-stat-value"><CoinAmount :value="totalReceived" sign="+" /></span>
          </div>
          <div class="tx-stat tx-stat-out">
            <span class="tx-stat-label">{{ $t('total-sent') }}</span>
            <span class="tx-stat-value"><CoinAmount :value="totalSent" sign="-" /></span>
          </div>
        </div>
        <p class="tx-summary-note">{{ $t('tx-summary-note', { n: transactions.length }) }}</p>

        <div class="tx-filter" role="group" :aria-label="$t('transaction-history')">
          <button
            type="button"
            class="tx-filter-btn"
            :class="{ on: txFilter === 'all' }"
            :aria-pressed="txFilter === 'all'"
            @click="txFilter = 'all'"
          >{{ $t('tx-filter-all') }}</button>
          <button
            type="button"
            class="tx-filter-btn"
            :class="{ on: txFilter === 'received' }"
            :aria-pressed="txFilter === 'received'"
            @click="txFilter = 'received'"
          >{{ $t('received') }}</button>
          <button
            type="button"
            class="tx-filter-btn"
            :class="{ on: txFilter === 'sent' }"
            :aria-pressed="txFilter === 'sent'"
            @click="txFilter = 'sent'"
          >{{ $t('sent') }}</button>
        </div>

        <p v-if="filteredTx.length === 0" class="tx-state">{{ emptyMessage }}</p>

        <div v-for="day in txDays" :key="day.key" class="tx-day">
          <p class="tx-day-label">{{ day.label }}</p>

          <ul class="tx-list">
            <li v-for="tx in day.items" :key="tx.id" class="tx-item">
              <button
                type="button"
                class="tx-row"
                :aria-expanded="expandedId === tx.id"
                :aria-controls="`tx-details-${tx.id}`"
                @click="toggleExpanded(tx.id)"
              >
                <span class="tx-icon" :class="`tx-${tx.dir || 'unknown'}`">
                  <Icon :name="tx.dir === 'sent' ? 'arrowUpRight' : 'arrowDownLeft'" :size="15" />
                </span>

                <span class="tx-body">
                  <span class="tx-top">
                    <span class="tx-type">
                      {{ tx.dir === 'sent' ? $t('sent') : tx.dir === 'received' ? $t('received') : $t('transaction') }}
                    </span>
                    <span class="tx-time">{{ tx.time }}</span>
                  </span>
                  <span class="tx-note" :class="{ 'tx-note-empty': !tx.note }">
                    {{ tx.note || $t('no-note') }}
                  </span>
                </span>

                <span class="tx-right">
                  <span class="tx-amount" :class="`tx-amount-${tx.dir || 'unknown'}`" :title="tx.amountTitle">
                    <CoinAmount :value="tx.amount" :sign="tx.dir === 'sent' ? '-' : tx.dir === 'received' ? '+' : ''" />
                  </span>
                  <Icon
                    name="chevronDown"
                    :size="11"
                    class="tx-chevron"
                    :class="{ open: expandedId === tx.id }"
                  />
                </span>
              </button>

              <div v-show="expandedId === tx.id" :id="`tx-details-${tx.id}`" class="tx-details">
                <dl class="tx-detail-list">
                  <div class="tx-detail">
                    <dt class="tx-detail-label">{{ $t('date-and-time') }}</dt>
                    <dd class="tx-detail-value">{{ tx.fullDate }}</dd>
                  </div>

                  <div class="tx-detail">
                    <dt class="tx-detail-label">{{ $t('amount') }}</dt>
                    <dd class="tx-detail-value">{{ tx.amountTitle }} {{ $t('coins-lower') }}</dd>
                  </div>

                  <div class="tx-detail tx-detail-full">
                    <dt class="tx-detail-label">{{ $t('note') }}</dt>
                    <dd class="tx-detail-value" :class="{ 'tx-detail-empty': !tx.note }">
                      {{ tx.note || $t('no-note') }}
                    </dd>
                  </div>

                  <div class="tx-detail">
                    <dt class="tx-detail-label">{{ $t('from') }}</dt>
                    <dd class="tx-detail-value">
                      <span v-if="tx.fromBalanceId === balanceId" class="tx-you">{{ $t('you') }}</span>
                      <button
                        v-else-if="tx.fromBalanceId"
                        type="button"
                        class="id-chip"
                        :class="{ copied: copied === `from-${tx.id}` }"
                        :title="$t('copy-value')"
                        @click="copy(tx.fromBalanceId, `from-${tx.id}`)"
                      >
                        <code class="id-chip-value">{{ tx.fromBalanceId }}</code>
                        <Icon :name="copied === `from-${tx.id}` ? 'check' : 'copy'" :size="12" />
                        <span class="sr-only">{{ $t('copy-value') }}</span>
                      </button>
                      <span v-else class="tx-detail-empty">{{ $t('unknown') }}</span>
                    </dd>
                  </div>

                  <div class="tx-detail">
                    <dt class="tx-detail-label">{{ $t('to') }}</dt>
                    <dd class="tx-detail-value">
                      <span v-if="tx.toBalanceId === balanceId" class="tx-you">{{ $t('you') }}</span>
                      <button
                        v-else-if="tx.toBalanceId"
                        type="button"
                        class="id-chip"
                        :class="{ copied: copied === `to-${tx.id}` }"
                        :title="$t('copy-value')"
                        @click="copy(tx.toBalanceId, `to-${tx.id}`)"
                      >
                        <code class="id-chip-value">{{ tx.toBalanceId }}</code>
                        <Icon :name="copied === `to-${tx.id}` ? 'check' : 'copy'" :size="12" />
                        <span class="sr-only">{{ $t('copy-value') }}</span>
                      </button>
                      <span v-else class="tx-detail-empty">{{ $t('unknown') }}</span>
                    </dd>
                  </div>

                  <div class="tx-detail tx-detail-full">
                    <dt class="tx-detail-label">{{ $t('transaction-id') }}</dt>
                    <dd class="tx-detail-value">
                      <button
                        type="button"
                        class="id-chip"
                        :class="{ copied: copied === `id-${tx.id}` }"
                        :title="$t('copy-value')"
                        @click="copy(tx.id, `id-${tx.id}`)"
                      >
                        <code class="id-chip-value">{{ tx.id }}</code>
                        <Icon :name="copied === `id-${tx.id}` ? 'check' : 'copy'" :size="12" />
                        <span class="sr-only">{{ $t('copy-value') }}</span>
                      </button>
                    </dd>
                  </div>
                </dl>
              </div>
            </li>
          </ul>
        </div>

        <button
          v-if="txHasMore"
          class="load-more-btn"
          :disabled="txLoadingMore"
          @click="loadMoreTransactions"
        >
          <LoadingSpinner v-if="txLoadingMore" class="me-1" />
          {{ $t('load-more') }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.balance-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

.balance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.balance-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
}

.balance-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 40px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.balance-state {
  color: var(--text-dim);
  font-size: 0.95rem;
  padding: 20px 0;
}

.balance-error { color: var(--danger); }

.coin-badge-icon {
  margin-bottom: 6px;
}

.coin-amount {
  font-size: 2.6rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.1;
  word-break: break-all;
}

.coin-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
}

/* -- Copyable id chips (balance ids, transaction ids) -- */
.id-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  min-width: 0;
  text-align: left;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-faint);
  padding: 4px 8px;
  cursor: pointer;
  transition: background var(--t), border-color var(--t), color var(--t);
}

.id-chip:hover {
  background: var(--border);
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.id-chip.copied {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success);
}

.id-chip-value {
  min-width: 0;
  font-size: 0.72rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-chip.copied .id-chip-value { color: var(--success); }

.balance-id-chip {
  margin-top: 14px;
}

.id-chip-label {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

/* -- Panels (send / history) -- */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-top: 24px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.panel-subtitle {
  font-size: 0.82rem;
  color: var(--text-faint);
  margin: 4px 0 16px;
  line-height: 1.5;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-full { grid-column: 1 / -1; }

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
}

.form-message {
  font-size: 0.82rem;
  font-weight: 600;
  margin: 14px 0 0;
}

.form-error { color: var(--danger); }
.form-success { color: var(--success); }

.send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 10px 20px;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.send-btn:hover:not(:disabled) { opacity: 0.9; }
.send-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* -- Transaction history -- */
.tx-state {
  color: var(--text-dim);
  font-size: 0.9rem;
  padding: 16px 0;
  text-align: center;
}

.tx-error { color: var(--danger); }

.tx-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

.tx-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-sunken);
}

.tx-stat-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.tx-stat-value {
  font-size: 1.05rem;
  font-weight: 700;
  word-break: break-all;
}

.tx-stat-in .tx-stat-value { color: var(--success); }
.tx-stat-out .tx-stat-value { color: var(--danger); }

.tx-summary-note {
  font-size: 0.74rem;
  color: var(--text-faint);
  margin: 8px 0 0;
}

.tx-filter {
  display: inline-flex;
  gap: 4px;
  margin-top: 16px;
  padding: 3px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
}

.tx-filter-btn {
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 5px 14px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--t), color var(--t);
}

.tx-filter-btn:hover:not(.on) { color: var(--text); }

.tx-filter-btn.on {
  background: var(--surface-raised);
  color: var(--text);
}

.tx-day {
  margin-top: 18px;
}

/* The date is the group heading, so it carries the eye down the list instead of
   repeating on every row. */
.tx-day-label {
  margin: 0 0 4px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-faint);
}

.tx-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.tx-item + .tx-item {
  border-top: 1px solid var(--border-subtle);
}

.tx-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--t);
}

.tx-row:hover { background: var(--surface-sunken); }

.tx-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tx-sent {
  background: var(--danger-bg);
  color: var(--danger);
}

.tx-received {
  background: var(--success-bg);
  color: var(--success);
}

.tx-unknown {
  background: var(--border);
  color: var(--text-muted);
}

.tx-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  gap: 1px;
}

.tx-top {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.tx-type {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.tx-time {
  font-size: 0.74rem;
  color: var(--text-faint);
}

/* The note is the one piece of free text a person wrote, so it gets its own
   line rather than being tacked onto the timestamp. */
.tx-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-note-empty {
  color: var(--text-faint);
  font-style: italic;
}

.tx-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tx-amount {
  font-size: 0.92rem;
  font-weight: 700;
  white-space: nowrap;
}

.tx-amount-sent { color: var(--danger); }
.tx-amount-received { color: var(--success); }
.tx-amount-unknown { color: var(--text-muted); }

.tx-chevron {
  color: var(--text-faint);
  transition: transform var(--t);
}

.tx-chevron.open { transform: rotate(180deg); }

.tx-details {
  padding: 4px 14px 14px 58px;
  background: var(--surface-sunken);
  border-top: 1px solid var(--border-subtle);
}

.tx-detail-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
  margin: 10px 0 0;
}

.tx-detail {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.tx-detail-full { grid-column: 1 / -1; }

.tx-detail-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.tx-detail-value {
  margin: 0;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.tx-detail-empty {
  color: var(--text-faint);
  font-style: italic;
}

/* Lines up with the id chip opposite it, which carries border and padding. */
.tx-you {
  padding: 5px 0;
  font-weight: 600;
  color: var(--text);
}

.load-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 16px;
  padding: 10px 16px;
  background: var(--surface-sunken);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 9px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.load-more-btn:hover:not(:disabled) {
  background: var(--border);
  color: var(--text);
}

.load-more-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 520px) {
  .form-grid { grid-template-columns: 1fr; }
  .tx-summary { grid-template-columns: 1fr; }
  .tx-detail-list { grid-template-columns: 1fr; }
  .tx-details { padding-left: 14px; }
}
</style>
