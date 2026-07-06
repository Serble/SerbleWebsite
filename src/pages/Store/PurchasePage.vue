<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getCheckoutUrl } from '@/assets/js/serble.js';
import LoadingSpinner from '@/components/LoadingSpinner.vue';

export default {
  components: { LoadingSpinner },
  setup() {
    ensureLoggedIn();
    const route = useRoute();

    // 'loading' | 'redirecting' | 'error'
    const state = ref('loading');
    const product = ref('');
    const priceId = ref(null);

    onMounted(async () => {
      product.value = route.query.product ?? '';
      priceId.value = route.query.price_id ?? null;

      if (!product.value) {
        state.value = 'error';
        return;
      }

      const result = await getCheckoutUrl(product.value, priceId.value);

      if (!result.success) {
        state.value = 'error';
        return;
      }

      state.value = 'redirecting';
      window.location.href = result.url;
    });

    return { state, product, priceId };
  }
};
</script>

<template>
  <div class="purchase-page">

    <!-- Loading / redirecting -->
    <div v-if="state === 'loading' || state === 'redirecting'" class="purchase-card bg-dark border rounded-3 text-center">
      <div class="purchase-icon text-primary">
        <LoadingSpinner :size="48" />
      </div>
      <h4 class="mb-2">{{ $t('wait-while-login') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('redirecting-to-portal') }}</p>
      <p class="stuck-text">
        {{ $t('stuck-go-back-to-store').replace('[', '').replace(']', '') }}
        <RouterLink to="/store">{{ $t('store') }}</RouterLink>
      </p>
    </div>

    <!-- Error -->
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
  color: var(--text-faint);
}

.stuck-text a {
  color: var(--accent-light);
  text-decoration: none;
}

</style>
