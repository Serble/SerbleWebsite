<script>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import {
  getTransactionProposal,
  approveTransactionProposal,
  denyTransactionProposal,
  getBalance,
} from '@/assets/js/serble.js';
import CoinAmount from '@/components/CoinAmount.vue';

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export default {
  components: { CoinAmount },
  setup() {
    ensureLoggedIn();
    const route = useRoute();
    const router = useRouter();

    // state: 'loading' | 'ready' | 'working' | 'result' | 'redirecting' | 'error'
    const state = ref('loading');
    const proposal = ref(null);
    const balance = ref(null); // precision-safe coin string of the user's balance
    const result = ref(null); // { status, transactionId, failureReason }
    const error = ref({ code: '', detail: '' });

    const proposalId = computed(() => route.query.proposal ?? '');

    const errorMessages = {
      'no-proposal':  'No transaction proposal id was provided in the URL.',
      'not-found':    'This transaction proposal was not found, has expired, or does not belong to you.',
      'not-pending':  'This transaction proposal is no longer pending. It may have already been handled or expired.',
      'unknown':      'An unexpected error occurred. Please try again.',
    };

    // Non-pending statuses returned by GET — already resolved, no buttons.
    const resolvedMessages = {
      Approved:   'This transaction has already been approved and the coins were moved.',
      Denied:     'This transaction was declined.',
      Expired:    'This transaction proposal expired before it was acted on.',
      Cancelled:  'The application withdrew this transaction proposal.',
      Failed:     'This transaction was approved but the transfer could not be completed.',
      InProgress: 'This transaction is currently being processed. Please check back shortly.',
    };

    function setError(code, detail = '') {
      state.value = 'error';
      error.value = { code, detail };
    }

    onMounted(async () => {
      const id = proposalId.value;
      if (!id) {
        setError('no-proposal');
        return;
      }

      const r = await getTransactionProposal(id);
      if (!r.success) {
        setError(r.flag ?? 'unknown', r.error ? `HTTP ${r.error}` : '');
        return;
      }

      proposal.value = r.proposal;

      // Best-effort fetch of the user's balance so we can show it and warn
      // when it's insufficient for this payment. A failure here shouldn't
      // block the consent flow.
      const b = await getBalance();
      if (b.success) balance.value = b.balance?.coins ?? null;

      state.value = 'ready';
    });

    async function decide(approve) {
      if (state.value !== 'ready') return;
      state.value = 'working';

      const fn = approve ? approveTransactionProposal : denyTransactionProposal;
      const r = await fn(proposalId.value);
      if (!r.success) {
        setError(r.flag ?? 'unknown', r.error ? `HTTP ${r.error}` : '');
        return;
      }

      result.value = r.result;

      // If the app supplied a redirect, send the user back to it; otherwise
      // show our own in-site confirmation screen.
      if (r.redirect) {
        state.value = 'redirecting';
        window.location.href = r.redirect;
        return;
      }

      state.value = 'result';
    }

    const status = computed(() => proposal.value?.status ?? 'Pending');
    const isPending = computed(() => status.value === 'Pending');
    const resolvedMessage = computed(() => resolvedMessages[status.value] ?? 'This transaction proposal is no longer pending.');

    const appName = computed(() => proposal.value?.appName ?? proposal.value?.appId ?? 'An application');
    const appDescription = computed(() => proposal.value?.appDescription ?? '');
    const recipientName = computed(() => proposal.value?.recipientName ?? proposal.value?.recipientId ?? '');
    const recipientType = computed(() => proposal.value?.recipientType ?? '');
    const description = computed(() => proposal.value?.description ?? '');
    const amount = computed(() => proposal.value?.amount ?? '0');
    const hasBalance = computed(() => balance.value != null);

    // Precision-safe comparison of the user's balance against the amount.
    // Only treat as insufficient when both values are known, valid integers.
    const insufficientFunds = computed(() => {
      const amt = String(proposal.value?.amount ?? '').trim();
      const bal = String(balance.value ?? '').trim();
      if (!/^\d+$/.test(amt) || !/^\d+$/.test(bal)) return false;
      try {
        return BigInt(bal) < BigInt(amt);
      } catch {
        return false;
      }
    });
    const expiresAt = computed(() => formatDate(proposal.value?.expiresAt));
    const redirectUri = computed(() => proposal.value?.redirectUri ?? null);
    const redirectHost = computed(() => {
      const uri = redirectUri.value;
      if (!uri) return '';
      try { return new URL(uri).host; } catch { return uri; }
    });

    // Result helpers
    const resultStatus = computed(() => result.value?.status ?? '');
    const isApproved = computed(() => resultStatus.value === 'Approved');
    const isDenied = computed(() => resultStatus.value === 'Denied');
    const isFailed = computed(() => resultStatus.value === 'Failed');
    const failureReason = computed(() => result.value?.failureReason ?? '');
    const transactionId = computed(() => result.value?.transactionId ?? '');

    return {
      state, error, errorMessages,
      isPending, resolvedMessage,
      appName, appDescription, recipientName, recipientType,
      description, amount, expiresAt, redirectUri, redirectHost,
      balance, hasBalance, insufficientFunds,
      decide, router,
      resultStatus, isApproved, isDenied, isFailed, failureReason, transactionId,
    };
  }
};
</script>

<template>
  <div class="txc-page">

    <!-- Loading / redirecting -->
    <div v-if="state === 'loading' || state === 'redirecting'" class="txc-card">
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary mb-3">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
      </svg>
      <p class="text-muted">{{ state === 'redirecting' ? 'Redirecting…' : 'Loading…' }}</p>
    </div>

    <!-- Error -->
    <div v-else-if="state === 'error'" class="txc-card txc-card-error">
      <div class="txc-error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>
      <h2 class="txc-error-title">Transaction unavailable</h2>
      <p class="txc-error-sub">{{ errorMessages[error.code] ?? errorMessages.unknown }}</p>

      <div class="txc-error-detail">
        <div class="error-detail-row">
          <span class="error-detail-label">Error code</span>
          <code class="error-detail-value error-code-badge">{{ error.code || 'unknown' }}</code>
        </div>
        <div class="error-detail-row" v-if="error.detail">
          <span class="error-detail-label">Detail</span>
          <pre class="error-detail-value error-detail-pre">{{ error.detail }}</pre>
        </div>
      </div>

      <RouterLink to="/" class="txc-back-link">← Back to home</RouterLink>
    </div>

    <!-- Result -->
    <div v-else-if="state === 'result'" class="txc-card">
      <div class="txc-result-icon" :class="{ 'txc-result-bad': isDenied || isFailed }">
        <svg v-if="isApproved" xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>

      <h2 class="txc-result-title">
        <template v-if="isApproved">Payment approved</template>
        <template v-else-if="isDenied">Payment declined</template>
        <template v-else-if="isFailed">Payment failed</template>
        <template v-else>{{ resultStatus }}</template>
      </h2>

      <p v-if="isApproved" class="txc-result-sub">The coins have been transferred successfully.</p>
      <p v-else-if="isDenied" class="txc-result-sub">You declined this transaction. No coins were moved.</p>
      <p v-else-if="isFailed" class="txc-result-sub">{{ failureReason || 'The transfer could not be completed.' }}</p>

      <div v-if="isApproved && transactionId" class="txc-result-detail">
        <span class="error-detail-label">Transaction</span>
        <code class="error-detail-value">{{ transactionId }}</code>
      </div>

      <RouterLink to="/" class="txc-back-link txc-back-center">← Back to home</RouterLink>
    </div>

    <!-- Already resolved (non-pending status from GET) -->
    <div v-else-if="!isPending" class="txc-card">
      <div class="txc-result-icon txc-result-neutral">
        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432zM8 16a8 8 0 0 1-.589-.022l.078-.997A7 7 0 0 0 8 15zm-2.004-.45a7 7 0 0 0 .985.299l-.219.976a8 8 0 0 1-1.126-.342zm-1.37-.71a7 7 0 0 0 .439.27l-.493.87a8 8 0 0 1-.979-.654l.615-.789q.197.154.418.302zm-1.834-1.79a7 7 0 0 0 .653.796l-.724.69a8 8 0 0 1-.747-.91zm-.744-1.352a7 7 0 0 0 .214.468l-.893.45a8 8 0 0 1-.45-1.088l.95-.313q.077.249.179.483m-.53-2.507a7 7 0 0 0 .1 1.025l-.985.17A8 8 0 0 1 0 7.917l1-.013zm.131-1.538a7 7 0 0 0-.081.51L.51 6.84a8 8 0 0 1 .23-1.155l.964.267q-.069.247-.12.501zm.952-2.379a7 7 0 0 0-.486.908l-.914-.405q.24-.54.555-1.038zm.964-1.205q-.183.183-.35.378l-.758-.653q.19-.22.401-.432z"/>
        </svg>
      </div>
      <h2 class="txc-result-title">Already handled</h2>
      <p class="txc-result-sub">{{ resolvedMessage }}</p>
      <RouterLink to="/" class="txc-back-link txc-back-center">← Back to home</RouterLink>
    </div>

    <!-- Consent UI (pending) -->
    <div v-else class="txc-card">
      <div class="txc-app-header">
        <div class="txc-app-icon">{{ appName.charAt(0).toUpperCase() }}</div>
        <h2 class="txc-app-name">{{ appName }}</h2>
        <p v-if="appDescription" class="txc-app-desc">{{ appDescription }}</p>
      </div>

      <p class="txc-warning-text">
        <strong>{{ appName }}</strong> is requesting that you pay coins from your account.
        Only approve if you trust this application and recognise this payment.
      </p>

      <div class="txc-amount-box" :class="{ 'txc-amount-box-bad': insufficientFunds }">
        <span class="txc-amount-label">Amount</span>
        <span class="txc-amount-value"><CoinAmount :value="amount" /> <span class="txc-amount-unit">coins</span></span>
        <span v-if="hasBalance" class="txc-balance-line" :class="{ 'txc-balance-bad': insufficientFunds }">
          Your balance: <CoinAmount :value="balance" /> coins
        </span>
      </div>

      <!-- Insufficient funds notice -->
      <div v-if="insufficientFunds" class="txc-insufficient">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" class="txc-insufficient-icon">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>
        <div>
          <p class="txc-insufficient-title">Insufficient balance</p>
          <p class="txc-insufficient-text">
            <strong>{{ appName }}</strong> requested this payment, but it can't be made &mdash;
            you don't have enough coins to cover it. If you approve, the application will be
            told you accepted but the payment will fail.
          </p>
        </div>
      </div>

      <div class="txc-details">
        <div class="txc-detail-row">
          <span class="txc-detail-label">To</span>
          <span class="txc-detail-value">
            {{ recipientName }}
            <span v-if="recipientType" class="txc-recipient-tag">{{ recipientType }}</span>
          </span>
        </div>
        <div class="txc-detail-row" v-if="description">
          <span class="txc-detail-label">For</span>
          <span class="txc-detail-value">{{ description }}</span>
        </div>
        <div class="txc-detail-row" v-if="expiresAt">
          <span class="txc-detail-label">Expires</span>
          <span class="txc-detail-value">{{ expiresAt }}</span>
        </div>
      </div>

      <p v-if="redirectHost" class="txc-return-note">
        You'll be returned to <strong>{{ redirectHost }}</strong> after you decide.
      </p>

      <p v-if="insufficientFunds" class="txc-deny-warning">This payment will fail if you approve it.</p>
      <p v-else class="txc-deny-warning">If you didn't initiate this payment, click Deny.</p>

      <div class="txc-actions">
        <button class="txc-btn txc-btn-allow" :class="{ 'txc-btn-allow-fail': insufficientFunds }" :disabled="state === 'working'" @click="decide(true)">
          <svg v-if="state !== 'working'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="spin me-2">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
          </svg>
          {{ insufficientFunds ? 'Let them know' : 'Approve' }}
        </button>
        <button class="txc-btn txc-btn-deny" :disabled="state === 'working'" @click="decide(false)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
          </svg>
          Deny
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.txc-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.txc-card {
  width: 100%;
  max-width: 480px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
}

.txc-card-error {
  max-width: 560px;
  text-align: left;
  align-items: stretch;
  border-color: var(--danger-border);
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

/* Error / result icons */
.txc-error-icon { color: var(--danger); display: flex; justify-content: center; }
.txc-error-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0; text-align: center; }
.txc-error-sub { font-size: 0.85rem; color: var(--text-dim); margin: 0; text-align: center; line-height: 1.6; }
.txc-error-detail {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.error-detail-row { display: flex; align-items: flex-start; gap: 12px; }
.error-detail-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-faint); min-width: 88px; flex-shrink: 0; padding-top: 2px;
}
.error-detail-value { font-size: 0.83rem; color: var(--text-secondary); word-break: break-all; }
.error-code-badge {
  background: var(--danger-bg); color: var(--danger);
  padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;
}
.error-detail-pre {
  font-family: monospace; font-size: 0.8rem; color: var(--text-muted);
  white-space: pre-wrap; word-break: break-all; margin: 0;
  background: transparent; border: none; padding: 0;
}

.txc-back-link { font-size: 0.82rem; color: var(--text-dim); text-decoration: none; align-self: flex-start; }
.txc-back-link:hover { color: var(--text-muted); }
.txc-back-center { align-self: center; }

/* Result */
.txc-result-icon { color: var(--success, #3fb950); display: flex; justify-content: center; }
.txc-result-bad { color: var(--danger); }
.txc-result-neutral { color: var(--text-dim); }
.txc-result-title { font-size: 1.5rem; font-weight: 800; color: var(--text); margin: 0; }
.txc-result-sub { font-size: 0.85rem; color: var(--text-dim); margin: 0; line-height: 1.6; }
.txc-result-detail {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: baseline;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 16px;
}

/* App header */
.txc-app-header { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.txc-app-icon {
  width: 60px; height: 60px; border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), var(--accent-purple));
  color: #fff; font-size: 1.6rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.txc-app-name { font-size: 1.4rem; font-weight: 800; color: var(--text); margin: 0; }
.txc-app-desc { font-size: 0.85rem; color: var(--text-muted); margin: 0; line-height: 1.5; }

.txc-warning-text { font-size: 0.85rem; color: var(--text-dim); line-height: 1.6; margin: 0; }

/* Amount */
.txc-amount-box {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 18px 16px;
}
.txc-amount-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-faint);
}
.txc-amount-value { font-size: 2rem; font-weight: 800; color: var(--text); }
.txc-amount-unit { font-size: 0.9rem; font-weight: 600; color: var(--text-muted); }
.txc-amount-box-bad { border-color: var(--danger-border); }
.txc-balance-line { font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-top: 4px; }
.txc-balance-bad { color: var(--danger); }

/* Insufficient funds notice */
.txc-insufficient {
  width: 100%;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  padding: 14px 16px;
  text-align: left;
}
.txc-insufficient-icon { color: var(--danger); flex-shrink: 0; margin-top: 1px; }
.txc-insufficient-title {
  font-size: 0.85rem; font-weight: 800; color: var(--danger);
  margin: 0 0 4px;
}
.txc-insufficient-text { font-size: 0.8rem; color: var(--text-dim); line-height: 1.55; margin: 0; }
.txc-insufficient-text strong { color: var(--text-secondary); }

/* Details */
.txc-details {
  width: 100%;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.txc-detail-row { display: flex; align-items: flex-start; gap: 12px; }
.txc-detail-label {
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--text-faint); min-width: 64px; flex-shrink: 0; padding-top: 2px;
}
.txc-detail-value { font-size: 0.85rem; color: var(--text-secondary); word-break: break-word; }
.txc-recipient-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
}

.txc-return-note { font-size: 0.78rem; color: var(--text-dim); line-height: 1.5; margin: 0; }
.txc-return-note strong { color: var(--text-secondary); }

.txc-deny-warning {
  font-size: 0.78rem; font-weight: 700; color: var(--danger);
  text-transform: uppercase; letter-spacing: 0.04em; margin: 0;
}

.txc-actions { display: flex; gap: 10px; width: 100%; }
.txc-btn {
  flex: 1; padding: 11px; border-radius: 8px;
  font-size: 0.9rem; font-weight: 600; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, opacity 0.15s;
}
.txc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.txc-btn-allow { background: var(--accent); color: #fff; }
.txc-btn-allow:hover:not(:disabled) { background: var(--accent-hover); }
.txc-btn-allow-fail { background: var(--warning); color: #1a1a1a; }
.txc-btn-allow-fail:hover:not(:disabled) { background: #eab308; }
.txc-btn-deny { background: var(--danger-strong); color: #fff; }
.txc-btn-deny:hover:not(:disabled) { background: var(--danger-stronger); }
</style>
