<script>
import { ref, onMounted } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getBalance, transferCoins, getTransactions } from '@/assets/js/serble.js';
import { parseCoinsToRaw, isValidCoinAmount } from '@/assets/js/coins.js';
import CoinIcon from '@/components/CoinIcon.vue';
import CoinAmount from '@/components/CoinAmount.vue';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default {
  components: { CoinIcon, CoinAmount },
  setup() {
    ensureLoggedIn();

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
        sendError.value = 'Enter a recipient.';
        return;
      }
      if (!isValidCoinAmount(amt)) {
        sendError.value = 'Enter an amount greater than zero.';
        return;
      }
      const rawAmount = parseCoinsToRaw(amt);

      sending.value = true;
      const r = await transferCoins(recip, rawAmount, description.value.trim());
      sending.value = false;

      if (r.success) {
        const newCoins = r.data?.fromBalance?.coins;
        if (newCoins != null) coins.value = String(newCoins);
        sendSuccess.value = 'Coins sent!';
        recipient.value = '';
        amount.value = '';
        description.value = '';
        load();
        loadTransactions();
      } else if (r.error === 404) {
        sendError.value = 'Recipient user not found.';
      } else if (r.error === 400) {
        sendError.value = r.message || 'Transfer failed. Check the amount and recipient.';
      } else if (r.error === 403) {
        sendError.value = 'You do not have permission to send coins.';
      } else {
        sendError.value = 'Something went wrong. Please try again.';
      }
    }

    onMounted(() => {
      load();
      loadTransactions();
    });

    function isSent(tx) {
      return balanceId.value && tx.fromBalanceId === balanceId.value;
    }

    return {
      loading, error, coins, balanceId, load,
      recipient, amount, description, sending, sendError, sendSuccess, send,
      txLoading, txError, transactions, loadTransactions,
      txLoadingMore, txHasMore, loadMoreTransactions,
      formatDate, isSent,
    };
  }
};
</script>

<template>
  <div class="balance-page">
    <div class="balance-header">
      <h3 class="balance-title">{{ $t('your-balance') }}</h3>
      <button class="refresh-btn" :disabled="loading" @click="load" :title="$t('reload')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" :class="{ spin: loading }">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
      </button>
    </div>

    <div class="balance-card">
      <div v-if="loading" class="balance-state">{{ $t('loading') }}</div>
      <div v-else-if="error" class="balance-state balance-error">{{ $t('unknown-error') }}</div>
      <template v-else>
        <CoinIcon :size="64" class="coin-badge-icon" />
        <div class="coin-amount"><CoinAmount :value="coins" /></div>
        <div class="coin-label">{{ $t('coins') }}</div>
      </template>
    </div>

    <!-- ── Send coins ── -->
    <div class="panel">
      <h4 class="panel-title">{{ $t('send-coins') }}</h4>
      <p class="panel-subtitle">{{ $t('send-coins-subtitle') }}</p>

      <div class="form-grid">
        <label class="field">
          <span class="field-label">{{ $t('recipient') }}</span>
          <input
            type="text"
            class="dark-input"
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
            class="dark-input"
            placeholder="0"
            v-model="amount"
            :disabled="sending"
          >
        </label>

        <label class="field field-full">
          <span class="field-label">{{ $t('note-optional') }}</span>
          <input
            type="text"
            class="dark-input"
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
        <svg v-if="sending" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-1">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-1">
          <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471z"/>
        </svg>
        {{ $t('send') }}
      </button>
    </div>

    <!-- ── Transaction history ── -->
    <div class="panel">
      <div class="panel-head">
        <h4 class="panel-title">{{ $t('transaction-history') }}</h4>
        <button class="refresh-btn small" :disabled="txLoading" @click="loadTransactions" :title="$t('reload')">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" :class="{ spin: txLoading }">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
        </button>
      </div>

      <div v-if="txLoading" class="tx-state">{{ $t('loading') }}</div>
      <div v-else-if="txError" class="tx-state tx-error">{{ $t('unknown-error') }}</div>
      <div v-else-if="transactions.length === 0" class="tx-state">{{ $t('no-transactions') }}</div>
      <ul v-else class="tx-list">
        <li v-for="tx in transactions" :key="tx.id" class="tx-item">
          <div class="tx-icon" :class="isSent(tx) ? 'tx-sent' : 'tx-received'">
            <svg v-if="isSent(tx)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
            </svg>
          </div>
          <div class="tx-body">
            <div class="tx-top">
              <span class="tx-type">{{ isSent(tx) ? $t('sent') : $t('received') }}</span>
              <span class="tx-amount" :class="isSent(tx) ? 'tx-amount-sent' : 'tx-amount-received'">
                <CoinAmount :value="tx.amount" :sign="isSent(tx) ? '-' : '+'" />
              </span>
            </div>
            <div class="tx-meta">
              <span class="tx-date">{{ formatDate(tx.dateCreated) }}</span>
              <span v-if="tx.description" class="tx-desc">— {{ tx.description }}</span>
            </div>
          </div>
        </li>
      </ul>

      <button
        v-if="!txLoading && !txError && txHasMore"
        class="load-more-btn"
        :disabled="txLoadingMore"
        @click="loadMoreTransactions"
      >
        <svg v-if="txLoadingMore" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-1">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
        {{ $t('load-more') }}
      </button>
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

.refresh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--border);
  color: var(--text);
}

.refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

.balance-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 24px;
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

/* ── Panels (send / history) ── */
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
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

.dark-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 9px;
  color: var(--text);
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.dark-input:focus {
  outline: none;
  border-color: var(--accent);
}

.dark-input:disabled { opacity: 0.6; }

.form-message {
  font-size: 0.82rem;
  font-weight: 600;
  margin: 14px 0 0;
}

.form-error { color: var(--danger); }
.form-success { color: var(--success, #4ade80); }

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

.refresh-btn.small {
  width: 32px;
  height: 32px;
}

/* ── Transaction list ── */
.tx-state {
  color: var(--text-dim);
  font-size: 0.9rem;
  padding: 16px 0;
  text-align: center;
}

.tx-error { color: var(--danger); }

.tx-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.tx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.tx-item:first-child { border-top: none; }

.tx-icon {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
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
  background: rgba(74, 222, 128, 0.12);
  color: var(--success, #4ade80);
}

.tx-body {
  flex: 1;
  min-width: 0;
}

.tx-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tx-type {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

.tx-amount {
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
}

.tx-amount-sent { color: var(--danger); }
.tx-amount-received { color: var(--success, #4ade80); }

.tx-meta {
  display: flex;
  gap: 6px;
  font-size: 0.76rem;
  color: var(--text-faint);
  margin-top: 2px;
}

.tx-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.load-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 14px;
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
}
</style>
