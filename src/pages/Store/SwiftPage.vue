<script>
import { inject, computed } from 'vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { Icon },
  setup() {
    const userStore = inject('userStore');
    const user = computed(() => userStore?.state?.user ?? null);
    return { user };
  }
};
</script>

<template>
  <div class="swift-page">

    <!-- Header -->
    <div class="swift-header">
      <div class="swift-logo-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8.39 12.648a1 1 0 0 0-.015.18c0 .305.21.508.5.508.266 0 .492-.172.555-.477l.554-2.703h1.204c.421 0 .617-.234.617-.547 0-.312-.188-.53-.617-.53h-.985l.516-2.524h1.265c.43 0 .618-.227.618-.547 0-.313-.188-.524-.618-.524h-1.046l.476-2.304a1 1 0 0 0 .016-.164.51.51 0 0 0-.516-.516.54.54 0 0 0-.539.43l-.523 2.554H7.617l.477-2.304c.008-.04.015-.118.015-.164a.512.512 0 0 0-.523-.516.539.539 0 0 0-.531.43L6.53 5.484H5.414c-.43 0-.617.22-.617.532 0 .312.187.539.617.539h.906l-.515 2.523h-1.14c-.422 0-.618.219-.618.532 0 .312.196.547.617.547h.921l-.539 2.625c-.008.047-.015.117-.015.18 0 .305.21.508.5.508.265 0 .492-.172.554-.477l.555-2.703h2.242zm-1 .12H5.138l.531-2.562h2.242z"/>
        </svg>
      </div>
      <h1 class="swift-title">SWIFT</h1>
      <p class="swift-sub">{{ $t('swift-description') }}</p>
    </div>

    <!-- Plan cards -->
    <div class="plans-grid">

      <!-- Free -->
      <div class="plan-card">
        <div class="plan-top">
          <span class="plan-name">{{ $t('account-type-free') }}</span>
          <div class="plan-price">$0 <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li><Icon name="check" class="check" /> {{ $t('voting') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('view-trust-rating') }}</li>
          <li><Icon name="dash" class="check muted" /> &nbsp;</li>
          <li><Icon name="dash" class="check muted" /> &nbsp;</li>
          <li><Icon name="dash" class="check muted" /> &nbsp;</li>
        </ul>
        <RouterLink to="/register" class="plan-btn plan-btn-outline">{{ $t('sign-up-for-free') }}</RouterLink>
      </div>

      <!-- Monthly (featured) -->
      <div class="plan-card plan-card-featured">
        <div class="plan-badge">{{ $t('best-value') }}</div>
        <div class="plan-top">
          <span class="plan-name">{{ $t('monthly-plan') }}</span>
          <div class="plan-price">$1.99 <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li><Icon name="check" class="check" /> {{ $t('everything-from-free') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('warnings-for-risky-pages') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('higher-vote-importance') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('extremely-cool') }}</li>
          <li><Icon name="dash" class="check muted" /> &nbsp;</li>
        </ul>
        <RouterLink
          :to="user ? '/store/purchase?product=swiftpremium&price_id=monthly' : '/store/purchaseanon?product=swiftpremium&price_id=monthly'"
          class="plan-btn plan-btn-primary"
        >{{ $t('subscribe') }}</RouterLink>
      </div>

      <!-- Yearly (featured) -->
      <div class="plan-card plan-card-featured plan-card-yearly">
        <div class="plan-badge plan-badge-yearly">{{ $t('save-16-percent') }}</div>
        <div class="plan-top">
          <span class="plan-name">{{ $t('yearly-plan') }}</span>
          <div class="plan-price">$19.99 <span class="plan-period">{{ $t('per-year') }}</span></div>
          <div class="plan-equiv">~$1.67/month</div>
        </div>
        <ul class="plan-features">
          <li><Icon name="check" class="check" /> {{ $t('everything-from-free') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('warnings-for-risky-pages') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('higher-vote-importance') }}</li>
          <li><Icon name="check" class="check" /> {{ $t('extremely-cool') }}</li>
          <li><Icon name="dash" class="check muted" /> &nbsp;</li>
        </ul>
        <RouterLink
          :to="user ? '/store/purchase?product=swiftpremium&price_id=yearly' : '/store/purchaseanon?product=swiftpremium&price_id=yearly'"
          class="plan-btn plan-btn-primary"
        >{{ $t('subscribe') }}</RouterLink>
      </div>

    </div>

    <!-- Compare table -->
    <div class="compare-section">
      <h2 class="compare-title">{{ $t('compare-plans') }}</h2>
      <div class="table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="feature-col"></th>
              <th>{{ $t('account-type-free') }}</th>
              <th class="th-featured">{{ $t('monthly-plan') }}</th>
              <th class="th-featured">{{ $t('yearly-plan') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-name">{{ $t('voting') }}</td>
              <td><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('view-trust-rating') }}</td>
              <td><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('warnings-for-risky-pages') }}</td>
              <td class="muted-cell">-</td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('higher-vote-importance') }}</td>
              <td class="muted-cell">-</td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('extremely-cool') }}</td>
              <td class="muted-cell">-</td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
              <td class="td-featured"><Icon name="check" class="tick" /></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('price') }}</td>
              <td>$0</td>
              <td class="td-featured">$1.99/mo</td>
              <td class="td-featured">$19.99/yr</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.swift-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px 72px;
}

/* -- Header -- */
.swift-header {
  text-align: center;
  margin-bottom: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.swift-logo-wrap {
  width: 64px;
  height: 64px;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.swift-title {
  font-size: 2.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.swift-sub {
  max-width: 640px;
  color: var(--text-dim);
  font-size: 0.92rem;
  line-height: 1.75;
  margin: 0;
}

/* -- Plan cards -- */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 64px;
  align-items: start;
}

.plan-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px 24px;
  transition: border-color var(--t);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plan-card-featured,
.plan-card-yearly {
  border-color: var(--border-strong);
}

/* Plain mono label in the card's top corner; the word does the work. */
.plan-badge {
  position: absolute;
  top: 28px;
  right: 24px;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--accent-light);
  white-space: nowrap;
}

.plan-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-name {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.plan-price {
  font-size: 2.2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1;
}

.plan-period {
  font-size: 0.88rem;
  font-weight: 400;
  color: var(--text-faint);
}

.plan-equiv {
  font-size: 0.75rem;
  color: var(--text-faint);
  margin-top: 2px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
  flex-grow: 1;
}

.plan-features li {
  font-size: 0.87rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.check {
  color: var(--success);
  font-weight: 700;
  flex-shrink: 0;
}

.check.muted { color: var(--border-strong); }

.plan-btn {
  display: block;
  width: 100%;
  padding: 10px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: background var(--t), border-color var(--t), color var(--t), transform var(--t);
}

.plan-btn:active:not(:disabled) {
  transform: scale(0.98);
}

.plan-btn-primary {
  background: var(--accent);
  color: #fff;
}

.plan-btn-primary:hover {
  background: var(--accent-hover);
  color: #fff;
}

.plan-btn-outline {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-strong);
}

.plan-btn-outline:hover {
  border-color: var(--text-dim);
  color: var(--text);
}

/* -- Compare table -- */
.compare-section { text-align: center; }

.compare-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 24px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.compare-table thead tr {
  border-bottom: 1px solid var(--border);
}

.compare-table th {
  padding: 14px 20px;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-dim);
  background: var(--surface-sunken);
}

.th-featured {
  color: var(--accent-light) !important;
  background: rgba(37,99,235,0.08) !important;
}

.feature-col {
  width: 34%;
  text-align: left;
}

.compare-table tbody tr {
  border-bottom: 1px solid var(--border-subtle);
  transition: background var(--t-fast);
}

.compare-table tbody tr:last-child { border-bottom: none; }

.compare-table tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.compare-table td {
  padding: 13px 20px;
  color: var(--text-muted);
  text-align: center;
  background: var(--surface);
}

.td-featured {
  background: rgba(37,99,235,0.06) !important;
  color: var(--accent-light) !important;
}

.feature-name {
  text-align: left !important;
  color: var(--text-secondary) !important;
  font-weight: 500;
}

.muted-cell { color: var(--border-strong) !important; }

.tick {
  color: var(--success);
  font-weight: 700;
}
</style>
