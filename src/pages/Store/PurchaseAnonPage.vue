<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getCheckoutUrlAnon } from '@/assets/js/serble.js';

export default {
  setup() {
    const route = useRoute();

    // 'loading' | 'redirecting' | 'error'
    const state = ref('loading');

    onMounted(async () => {
      const product = route.query.product ?? '';
      const priceId = route.query.price_id ?? null;

      if (!product) {
        state.value = 'error';
        return;
      }

      const result = await getCheckoutUrlAnon(product, priceId);

      if (!result.success) {
        state.value = 'error';
        return;
      }

      state.value = 'redirecting';
      window.location.href = result.url;
    });

    return { state };
  }
};
</script>

<template>
  <div class="purchase-page">

    <div v-if="state === 'loading' || state === 'redirecting'" class="purchase-card bg-dark border rounded-3 text-center">
      <div class="purchase-icon text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" class="spin">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
      </div>
      <h4 class="mb-2">{{ $t('wait-while-login') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('redirecting-to-portal') }}</p>
      <p class="stuck-text">
        {{ $t('stuck-go-back-to-store').replace('[', '').replace(']', '') }}
        <RouterLink to="/store">{{ $t('store') }}</RouterLink>
      </p>
    </div>

    <div v-else class="purchase-card bg-dark border border-danger rounded-3 text-center">
      <div class="purchase-icon text-danger">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>
      <h4 class="mb-2">{{ $t('an-error-occured') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('unknown-error-occured') }}</p>
      <RouterLink to="/store" class="btn btn-outline-secondary">← {{ $t('store') }}</RouterLink>
    </div>

  </div>
</template>

<style scoped>
.purchase-page {
  max-width: 480px;
  margin: 60px auto;
  padding: 0 24px;
}

.purchase-card {
  padding: 48px 36px;
}

.purchase-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.stuck-text {
  font-size: 0.82rem;
  color: #52525b;
}

.stuck-text a {
  color: #60a5fa;
  text-decoration: none;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 0.9s linear infinite;
}
</style>
