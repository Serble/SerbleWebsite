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
  <div class="store-page">

    <!-- Header -->
    <div class="store-header">
      <h1 class="store-title">{{ $t('serble-paid-plans') }}</h1>
      <p class="store-sub">{{ $t('services-cost-money') }}</p>
    </div>

    <!-- Pricing cards -->
    <div class="plans-grid">

      <!-- Free -->
      <div class="plan-card">
        <div class="plan-top">
          <span class="plan-name">{{ $t('account-type-free') }}</span>
          <div class="plan-price">$0 <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li><span class="check">✓</span> Link Shortener</li>
          <li><span class="check">✓</span> File Hosting Up To 50 MB</li>
          <li><span class="check">✓</span> Chat API</li>
          <li><span class="check">✓</span> Email Support</li>
          <li><span class="check muted">–</span> &nbsp;</li>
          <li><span class="check muted">–</span> &nbsp;</li>
        </ul>
        <RouterLink to="/register" class="plan-btn plan-btn-outline">{{ $t('sign-up-for-free') }}</RouterLink>
      </div>

      <!-- Premium (highlighted) -->
      <div class="plan-card plan-card-featured">
        <div class="plan-badge">Popular</div>
        <div class="plan-top">
          <span class="plan-name">{{ $t('account-type-premium') }}</span>
          <div class="plan-price">$5 <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li><span class="check">✓</span> Everything from Free</li>
          <li><span class="check">✓</span> File Hosting Up To 100 MB</li>
          <li><span class="check muted">–</span> More coming soon</li>
          <li><span class="check muted">–</span> &nbsp;</li>
          <li><span class="check muted">–</span> &nbsp;</li>
          <li><span class="check muted">–</span> &nbsp;</li>
        </ul>
        <RouterLink
          :to="user ? '/store/purchase?product=premium' : '/store/purchaseanon?product=premium'"
          class="plan-btn plan-btn-primary"
        >{{ $t('subscribe') }}</RouterLink>
      </div>

      <!-- Coming Soon -->
      <div class="plan-card plan-card-muted">
        <div class="plan-top">
          <span class="plan-name">{{ $t('coming-soon') }}</span>
          <div class="plan-price">$?? <span class="plan-period">{{ $t('per-month') }}</span></div>
        </div>
        <ul class="plan-features">
          <li v-for="n in 6" :key="n"><span class="check muted">–</span> &nbsp;</li>
        </ul>
        <button class="plan-btn plan-btn-disabled" disabled>{{ $t('subscribe') }}</button>
      </div>

    </div>

    <!-- Compare plans table -->
    <div class="compare-section">
      <h2 class="compare-title">{{ $t('compare-plans') }}</h2>
      <div class="table-wrap">
        <table class="compare-table">
          <thead>
            <tr>
              <th class="feature-col"></th>
              <th>{{ $t('account-type-free') }}</th>
              <th class="th-featured">{{ $t('account-type-premium') }}</th>
              <th>{{ $t('coming-soon') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="feature-name">File Hosting Upload Limit</td>
              <td>50 MB</td>
              <td class="td-featured">100 MB</td>
              <td class="muted-cell">—</td>
            </tr>
            <tr>
              <td class="feature-name">Link Shortener</td>
              <td><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="muted-cell">—</td>
            </tr>
            <tr>
              <td class="feature-name">Chat API</td>
              <td><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="muted-cell">—</td>
            </tr>
            <tr>
              <td class="feature-name">Email Support</td>
              <td><span class="tick">✓</span></td>
              <td class="td-featured"><span class="tick">✓</span></td>
              <td class="muted-cell">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style scoped>
.store-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px 72px;
}

/* Header */
.store-header {
  text-align: center;
  margin-bottom: 48px;
}

.store-title {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #f4f4f5;
  margin-bottom: 12px;
}

.store-sub {
  max-width: 580px;
  margin: 0 auto;
  color: #71717a;
  font-size: 0.95rem;
  line-height: 1.7;
}

/* Plans grid */
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
  border-color: #2563eb;
  box-shadow: 0 0 0 1px #2563eb, 0 8px 32px rgba(37,99,235,0.2);
}

.plan-card-muted {
  opacity: 0.6;
}

.plan-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #2563eb;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 12px;
  border-radius: 999px;
  white-space: nowrap;
}

.plan-top {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-name {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #71717a;
}

.plan-price {
  font-size: 2.2rem;
  font-weight: 800;
  color: #f4f4f5;
  line-height: 1;
}

.plan-period {
  font-size: 0.9rem;
  font-weight: 400;
  color: #52525b;
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

.check.muted {
  color: #3f3f46;
}

/* Plan buttons */
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
  background: #2563eb;
  color: #fff;
}

.plan-btn-primary:hover {
  background: #1d4ed8;
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

.plan-btn-disabled {
  background: #27272a;
  color: #52525b;
  cursor: not-allowed;
}

/* Compare table */
.compare-section {
  text-align: center;
}

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
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #71717a;
  background: #111113;
}

.th-featured {
  color: #93c5fd !important;
  background: rgba(37,99,235,0.08) !important;
}

.feature-col {
  width: 34%;
  text-align: left;
}

.compare-table tbody tr {
  border-bottom: 1px solid #1f1f23;
  transition: background 0.1s;
}

.compare-table tbody tr:last-child {
  border-bottom: none;
}

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
  background: rgba(37,99,235,0.06) !important;
  color: #93c5fd !important;
}

.feature-name {
  text-align: left !important;
  color: #d4d4d8 !important;
  font-weight: 500;
}

.muted-cell {
  color: #3f3f46 !important;
}

.tick {
  color: #4ade80;
  font-weight: 700;
}
</style>
