<script>
import { inject, computed } from 'vue';

export default {
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
          <li><span class="check">✓</span> {{ $t('voting') }}</li>
          <li><span class="check">✓</span> {{ $t('view-trust-rating') }}</li>
          <li><span class="check muted">–</span> &nbsp;</li>
          <li><span class="check muted">–</span> &nbsp;</li>
          <li><span class="check muted">–</span> &nbsp;</li>
        </ul>
        <RouterLink to="/register" class="plan-btn plan-btn-outline">{{ $t('sign-up-for-free') }}</RouterLink>
      </div>

      <!-- Monthly (featured) -->
      <div class="plan-card plan-card-featured">
        <div class="plan-badge">Best Value</div>
        <div class="plan-top">
          <span class="plan-name">{{ $t('monthly-plan') }}</span>
          <div class="plan-price">$1.99 <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li><span class="check">✓</span> {{ $t('everything-from-free') }}</li>
          <li><span class="check">✓</span> {{ $t('warnings-for-risky-pages') }}</li>
          <li><span class="check">✓</span> {{ $t('higher-vote-importance') }}</li>
          <li><span class="check">✓</span> {{ $t('extremely-cool') }}</li>
          <li><span class="check muted">–</span> &nbsp;</li>
        </ul>
        <RouterLink
          :to="user ? '/store/purchase?product=swiftpremium&price_id=monthly' : '/store/purchaseanon?product=swiftpremium&price_id=monthly'"
          class="plan-btn plan-btn-primary"
        >{{ $t('subscribe') }}</RouterLink>
      </div>

      <!-- Yearly (featured) -->
      <div class="plan-card plan-card-featured plan-card-yearly">
        <div class="plan-badge plan-badge-yearly">Save ~16%</div>
        <div class="plan-top">
          <span class="plan-name">{{ $t('yearly-plan') }}</span>
          <div class="plan-price">$19.99 <span class="plan-period">{{ $t('per-year') }}</span></div>
          <div class="plan-equiv">≈ $1.67/month</div>
        </div>
        <ul class="plan-features">
          <li><span class="check">✓</span> {{ $t('everything-from-free') }}</li>
          <li><span class="check">✓</span> {{ $t('warnings-for-risky-pages') }}</li>
          <li><span class="check">✓</span> {{ $t('higher-vote-importance') }}</li>
          <li><span class="check">✓</span> {{ $t('extremely-cool') }}</li>
          <li><span class="check muted">–</span> &nbsp;</li>
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
              <td><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('view-trust-rating') }}</td>
              <td><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('warnings-for-risky-pages') }}</td>
              <td class="muted-cell">—</td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('higher-vote-importance') }}</td>
              <td class="muted-cell">—</td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
            </tr>
            <tr>
              <td class="feature-name">{{ $t('extremely-cool') }}</td>
              <td class="muted-cell">—</td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
            </tr>
            <tr>
              <td class="feature-name">Price</td>
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

/* ── Header ── */
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
  border-radius: 16px;
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.swift-title {
  font-size: 2.6rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: #f4f4f5;
  margin: 0;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.swift-sub {
  max-width: 640px;
  color: #71717a;
  font-size: 0.92rem;
  line-height: 1.75;
  margin: 0;
}

/* ── Plan cards ── */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 64px;
  align-items: start;
}

.plan-card {
  position: relative;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 14px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plan-card-featured {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 1px #0ea5e9, 0 8px 32px rgba(14,165,233,0.15);
}

.plan-card-yearly {
  border-color: #818cf8;
  box-shadow: 0 0 0 1px #818cf8, 0 8px 32px rgba(129,140,248,0.15);
}

.plan-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #0ea5e9;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 12px;
  border-radius: 999px;
  white-space: nowrap;
}

.plan-badge-yearly {
  background: #6366f1;
}

.plan-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-name {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #71717a;
}

.plan-price {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f4f4f5;
  line-height: 1;
}

.plan-period {
  font-size: 0.88rem;
  font-weight: 400;
  color: #52525b;
}

.plan-equiv {
  font-size: 0.75rem;
  color: #52525b;
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
  color: #a1a1aa;
  display: flex;
  align-items: center;
  gap: 8px;
}

.check {
  color: #4ade80;
  font-weight: 700;
  flex-shrink: 0;
}

.check.muted { color: #3f3f46; }

.plan-btn {
  display: block;
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  border: none;
  transition: background 0.15s, opacity 0.15s;
}

.plan-btn-primary {
  background: #0ea5e9;
  color: #fff;
}

.plan-btn-primary:hover {
  background: #0284c7;
  color: #fff;
}

.plan-btn-outline {
  background: transparent;
  color: #a1a1aa;
  border: 1px solid #3f3f46;
}

.plan-btn-outline:hover {
  border-color: #71717a;
  color: #f4f4f5;
}

/* ── Compare table ── */
.compare-section { text-align: center; }

.compare-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f4f4f5;
  margin-bottom: 24px;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid #27272a;
  border-radius: 12px;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.compare-table thead tr {
  border-bottom: 1px solid #27272a;
}

.compare-table th {
  padding: 14px 20px;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #71717a;
  background: #111113;
}

.th-featured {
  color: #7dd3fc !important;
  background: rgba(14,165,233,0.07) !important;
}

.feature-col {
  width: 34%;
  text-align: left;
}

.compare-table tbody tr {
  border-bottom: 1px solid #1f1f23;
}

.compare-table tbody tr:last-child { border-bottom: none; }

.compare-table tbody tr:hover {
  background: rgba(255,255,255,0.02);
}

.compare-table td {
  padding: 13px 20px;
  color: #a1a1aa;
  text-align: center;
  background: #18181b;
}

.td-featured {
  background: rgba(14,165,233,0.05) !important;
  color: #7dd3fc !important;
}

.feature-name {
  text-align: left !important;
  color: #d4d4d8 !important;
  font-weight: 500;
}

.muted-cell { color: #3f3f46 !important; }

.tick {
  color: #4ade80;
  font-weight: 700;
}
</style>
