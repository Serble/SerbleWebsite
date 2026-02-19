<script>
import { ref, onMounted } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPaymentPortalUrl } from '@/assets/js/serble.js';

export default {
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
    <div v-if="state === 'loading'" class="portal-card bg-dark border rounded-3">
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
    <div v-else-if="state === 'redirecting'" class="portal-card bg-dark border rounded-3 text-center">
      <div class="portal-icon-wrap text-primary mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16" class="spin">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
      </div>
      <h4 class="mb-1">{{ $t('redirecting') }}</h4>
      <p class="text-muted mb-0" style="font-size:0.9rem;">{{ $t('redirecting-to-portal') }}</p>
    </div>

    <!-- Not a customer -->
    <div v-else-if="state === 'not-customer'" class="portal-card bg-dark border rounded-3 text-center">
      <div class="portal-icon-wrap text-warning mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>
      </div>
      <h4 class="mb-2">{{ $t('payment-portal') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem; max-width:380px; margin: 0 auto 24px;">
        {{ $t('not-customer-pre') }}
        <RouterLink to="/store">{{ $t('store') }}</RouterLink>
        {{ $t('not-customer-post') }}
      </p>
      <RouterLink to="/store" class="btn btn-primary px-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .491.592l-1.5 8A.5.5 0 0 1 13 12H4a.5.5 0 0 1-.491-.408L2.01 3.607 1.61 2H.5a.5.5 0 0 1-.5-.5M3.102 4l1.313 7h8.17l1.313-7zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2m7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>
        {{ $t('visit-store') }}
      </RouterLink>
    </div>

    <!-- Error -->
    <div v-else-if="state === 'error'" class="portal-card bg-dark border border-danger rounded-3 text-center">
      <div class="portal-icon-wrap text-danger mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
        </svg>
      </div>
      <h4 class="mb-2">{{ $t('an-error-occured') }}</h4>
      <p class="text-muted mb-4" style="font-size:0.9rem;">{{ $t('unknown-error-occured') }}</p>
      <button class="btn btn-outline-secondary" @click="$router.go(0)">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
        </svg>
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

/* Spinning loader icon */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 0.9s linear infinite;
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
  background: linear-gradient(90deg, #2a2a2a 25%, #383838 50%, #2a2a2a 75%);
  background-size: 400px 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}

.skeleton-lines {
  text-align: center;
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #2a2a2a 25%, #383838 50%, #2a2a2a 75%);
  background-size: 400px 100%;
  animation: shimmer 1.2s ease-in-out infinite;
  display: inline-block;
}

.w-40 { width: 40%; }
.w-50 { width: 50%; }
.w-75 { width: 75%; }
</style>
