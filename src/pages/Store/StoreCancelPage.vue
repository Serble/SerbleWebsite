<script>
export default {};
</script>

<template>
  <div class="cancel-page">
    <div class="cancel-inner">

      <!-- Icon -->
      <div class="cancel-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
        </svg>
      </div>

      <h1 class="cancel-title">{{ $t('purchase-cancelled') }}</h1>

      <p class="cancel-desc">{{ $t('sub-will-help-us') }}</p>

      <div class="cancel-actions">
        <RouterLink to="/store" class="cancel-btn cancel-btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
            <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
          </svg>
          {{ $t('store') }}
        </RouterLink>
        <RouterLink to="/account" class="cancel-btn cancel-btn-outline">{{ $t('account-page') }}</RouterLink>
        <RouterLink to="/" class="cancel-btn cancel-btn-outline">{{ $t('home-page') }}</RouterLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.cancel-page {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.cancel-inner {
  text-align: center;
  max-width: 520px;
}

.cancel-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
  color: #f87171;
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}

.cancel-title {
  font-size: 2rem;
  font-weight: 800;
  color: #f4f4f5;
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.cancel-desc {
  color: #71717a;
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 32px;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;
}

.cancel-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  padding: 9px 20px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.cancel-btn-primary {
  background: #2563eb;
  color: #fff;
}

.cancel-btn-primary:hover {
  background: #1d4ed8;
  color: #fff;
}

.cancel-btn-outline {
  background: transparent;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
}

.cancel-btn-outline:hover {
  border-color: #71717a;
  color: #f4f4f5;
}
</style>
