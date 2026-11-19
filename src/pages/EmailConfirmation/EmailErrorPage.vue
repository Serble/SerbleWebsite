<script>
import Icon from '@/components/Icon.vue';
export default {
  components: { Icon },
};
</script>

<template>
  <div class="result-page">
    <div class="result-card">

      <div class="result-icon result-icon-error">
        <Icon name="closeCircle" :size="56" />
      </div>

      <h1 class="result-title">{{ $t('an-error-occured') }}</h1>
      <p class="result-desc">{{ $t('email-not-verified') }}</p>

      <RouterLink to="/account" class="result-btn result-btn-primary">
        <Icon name="person" class="me-2" />
        {{ $t('account-page') }}
      </RouterLink>

    </div>
  </div>
</template>

<style scoped>
.result-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.result-card {
  background: var(--surface);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius);
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

.result-icon-error { color: var(--danger); }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

.result-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.02em;
}

.result-desc {
  font-size: 0.95rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.6;
}

.result-btn {
  display: inline-flex;
  align-items: center;
  padding: 10px 24px;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--t), color var(--t), transform var(--t);
  margin-top: 4px;
}

.result-btn:active {
  transform: scale(0.98);
}

.result-btn-primary {
  background: var(--accent);
  color: #fff;
}

.result-btn-primary:hover {
  background: var(--accent-hover);
  color: #fff;
}
</style>
