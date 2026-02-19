<script>
export default {};
</script>

<template>
  <div class="result-page">
    <div class="result-card">

      <div class="result-icon result-icon-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="currentColor" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>
      </div>

      <h1 class="result-title">{{ $t('success') }}</h1>
      <p class="result-desc">{{ $t('email-verified') }}</p>

      <RouterLink to="/account" class="result-btn result-btn-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>
        </svg>
        {{ $t('account-page') }}
      </RouterLink>

    </div>
  </div>
</template>

<style scoped>
/* shared styles duplicated from error page for scoping */
.result-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.result-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 16px;
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.result-icon {
  animation: popIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

.result-icon-success { color: #4ade80; }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

.result-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #f4f4f5;
  margin: 0;
  letter-spacing: -0.02em;
}

.result-desc {
  font-size: 0.95rem;
  color: #71717a;
  margin: 0;
  line-height: 1.6;
}

.result-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
  margin-top: 4px;
}

.result-btn-success {
  background: #16a34a;
  color: #fff;
}

.result-btn-success:hover {
  background: #15803d;
  color: #fff;
}
</style>
