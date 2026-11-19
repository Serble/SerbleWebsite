<script>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getCheckoutUrlAnon } from '@/assets/js/serble.js';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import LinkedText from '@/components/LinkedText.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { LoadingSpinner, LinkedText, Icon },
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

    <div v-if="state === 'loading' || state === 'redirecting'" class="purchase-card card text-center">
      <div class="purchase-icon text-accent">
        <LoadingSpinner :size="48" />
      </div>
      <h4 class="mb-2">{{ $t('wait-while-login') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('redirecting-to-portal') }}</p>
      <p class="stuck-text">
        <LinkedText :text="$t('stuck-go-back-to-store')" to="/store" />
      </p>
    </div>

    <div v-else class="purchase-card card card-danger text-center">
      <div class="purchase-icon text-danger">
        <Icon name="alert" :size="48" />
      </div>
      <h4 class="mb-2">{{ $t('an-error-occured') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('unknown-error-occured') }}</p>
      <RouterLink to="/store" class="btn btn-ghost"><Icon name="arrowLeft" :size="18" /> {{ $t('store') }}</RouterLink>
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

.stuck-text :deep(a) {
  color: var(--accent-light);
  text-decoration: none;
}

</style>
