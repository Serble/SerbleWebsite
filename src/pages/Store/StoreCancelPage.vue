<script>
import Icon from '@/components/Icon.vue';
export default {
  components: { Icon },
};
</script>

<template>
  <div class="cancel-page">
    <div class="cancel-inner">

      <!-- Icon -->
      <div class="cancel-icon">
        <Icon name="closeCircle" :size="52" />
      </div>

      <h1 class="cancel-title">{{ $t('purchase-cancelled') }}</h1>

      <p class="cancel-desc">{{ $t('sub-will-help-us') }}</p>

      <div class="cancel-actions">
        <RouterLink to="/store" class="cancel-btn cancel-btn-primary">
          <Icon name="cart" class="me-2" />
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
  color: var(--danger);
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1); }
}

.cancel-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text);
  letter-spacing: -0.02em;
  margin-bottom: 16px;
}

.cancel-desc {
  color: var(--text-dim);
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
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--t), border-color var(--t), color var(--t), transform var(--t);
}

.cancel-btn:active {
  transform: scale(0.98);
}

.cancel-btn-primary {
  background: var(--accent);
  color: #fff;
}

.cancel-btn-primary:hover {
  background: var(--accent-hover);
  color: #fff;
}

.cancel-btn-outline {
  background: transparent;
  border: 1px solid var(--border-strong);
  color: var(--text-muted);
}

.cancel-btn-outline:hover {
  border-color: var(--text-dim);
  color: var(--text);
}
</style>
