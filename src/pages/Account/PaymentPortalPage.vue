<script>
import { ref, onMounted } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPaymentPortalUrl } from '@/assets/js/serble.js';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { LoadingSpinner, Icon },
  setup() {
    ensureLoggedIn();

    // 'loading' | 'redirecting' | 'not-customer' | 'error'
    const state = ref('loading');
    const errorMsg = ref('');

    onMounted(async () => {
      const result = await getPaymentPortalUrl();

      if (result.success) {
        state.value = 'redirecting';
        window.location.href = result.url;
        return;
      }

      if (result.flag === 'not-customer') {
        state.value = 'not-customer';
        return;
      }

      state.value = 'error';
      errorMsg.value = result.flag ?? 'unknown';
    });

    return { state, errorMsg };
  }
};
</script>

<template>
  <div class="portal-page">

    <!-- Loading skeleton -->
    <div v-if="state === 'loading'" class="portal-card card">
      <div class="portal-icon-wrap skeleton-pulse">
        <div class="skeleton-circle"></div>
      </div>
      <div class="skeleton-lines">
        <div class="skeleton-line w-50 mx-auto mb-2"></div>
        <div class="skeleton-line w-75 mx-auto mb-2"></div>
        <div class="skeleton-line w-40 mx-auto"></div>
      </div>
    </div>

    <!-- Redirecting -->
    <div v-else-if="state === 'redirecting'" class="portal-card card text-center">
      <div class="portal-icon-wrap text-accent mb-3">
        <LoadingSpinner :size="48" />
      </div>
      <h4 class="mb-1">{{ $t('redirecting') }}</h4>
      <p class="text-muted mb-0" style="font-size:0.9rem;">{{ $t('redirecting-to-portal') }}</p>
    </div>

    <!-- Not a customer -->
    <div v-else-if="state === 'not-customer'" class="portal-card card text-center">
      <div class="portal-icon-wrap text-warning mb-3">
        <Icon name="cart" :size="48" />
      </div>
      <h4 class="mb-2">{{ $t('payment-portal') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem; max-width:380px; margin: 0 auto 24px;">
        {{ $t('not-customer-pre') }}
        <RouterLink to="/store">{{ $t('store') }}</RouterLink>
        {{ $t('not-customer-post') }}
      </p>
      <RouterLink to="/store" class="btn btn-primary px-4">
        <Icon name="cart" />
        {{ $t('visit-store') }}
      </RouterLink>
    </div>

    <!-- Error -->
    <div v-else-if="state === 'error'" class="portal-card card card-danger text-center">
      <div class="portal-icon-wrap text-danger mb-3">
        <Icon name="alert" :size="48" />
      </div>
      <h4 class="mb-2">{{ $t('an-error-occured') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('unknown-error-occured') }}</p>
      <button class="btn btn-ghost" @click="$router.go(0)">
        <Icon name="refresh" />
        {{ $t('reload') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.portal-page {
  max-width: 480px;
  margin: 60px auto;
  padding: 0 24px;
}

.portal-card {
  padding: 48px 36px;
}

.portal-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

/* Skeleton loading */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton-pulse {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.skeleton-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, var(--surface) 25%, var(--surface-raised) 50%, var(--surface) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-lines {
  text-align: center;
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--surface) 25%, var(--surface-raised) 50%, var(--surface) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.2s ease-in-out infinite;
  display: inline-block;
}

.w-40 { width: 40%; }
.w-50 { width: 50%; }
.w-75 { width: 75%; }
</style>
