<script>
import { getCatalogServices } from '@/assets/js/serble.js';
import Icon from '@/components/Icon.vue';
import LinkedText from '@/components/LinkedText.vue';
import CoinIcon from '@/components/CoinIcon.vue';

export default {
  components: { Icon, LinkedText, CoinIcon },
  data() {
    return {
      services: [],
      servicesLoading: true,
      servicesError: null,
      serviceIconFailures: {}
    };
  },
  computed: {
    sortedServices() {
      return [...this.services].sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0));
    },
    accountTiles() {
      return [
        { to: '/account', label: this.$t('account'), description: this.$t('account-tile-desc'), icon: 'person', iconColor: '#60a5fa' },
        { to: '/oauthapps', label: this.$t('my-applications'), description: this.$t('my-applications-tile-desc'), icon: 'grid', iconColor: '#818cf8' },
        { to: '/authorizedapps', label: this.$t('authorized-applications'), description: this.$t('authorized-applications-tile-desc'), icon: 'shieldCheck', iconColor: '#4ade80' },
        { to: '/account/balance', label: this.$t('balance'), description: this.$t('balance-tile-desc'), icon: 'coin' }
      ];
    }
  },
  async mounted() {
    await this.loadServices();
  },
  methods: {
    async loadServices() {
      this.servicesLoading = true;
      this.servicesError = null;
      const result = await getCatalogServices();
      if (result.success) {
        this.services = Array.isArray(result.services) ? result.services : [];
      } else {
        this.services = [];
        this.servicesError = result.error ?? 'unknown';
      }
      this.servicesLoading = false;
    },
    serviceHasIcon(service) {
      return !!service.iconUrl && !this.serviceIconFailures[service.id];
    },
    markServiceIconFailed(serviceId) {
      this.serviceIconFailures = { ...this.serviceIconFailures, [serviceId]: true };
    },
  }
}
</script>

<template>
  <main class="home-page">
    <section class="home-header-shell">
      <div class="home-header-band">
        <section class="home-header">
          <img src="/images/icon.png" :alt="$t('serble')" class="home-header-icon" />
          <div class="home-header-copy">
            <h1 class="home-header-title">{{ $t('serble') }}</h1>
            <p class="home-header-sub"><LinkedText :text="$t('welcome-to-serble')" to="/contact" /></p>
            <p class="home-header-note"><LinkedText :text="$t('looking-for-mc-server')" href="https://old.serble.net" target="_blank" /></p>
          </div>
        </section>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2 class="section-title">{{ $t('accounts') }}</h2>
      </div>

      <div class="account-grid">
        <RouterLink
          v-for="tile in accountTiles"
          :key="tile.to"
          :to="tile.to"
          class="account-card"
        >
          <Icon name="arrowUpRight" :size="18" class="account-card-arrow" />
          <h3 class="account-card-title">
            <CoinIcon v-if="tile.icon === 'coin'" :size="20" />
            <Icon v-else :name="tile.icon" :size="20" class="account-card-icon" :style="{ color: tile.iconColor }" />
            {{ tile.label }}
          </h3>
          <p class="account-card-desc">{{ tile.description }}</p>
        </RouterLink>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2 class="section-title">{{ $t('services') }}</h2>
      </div>

      <div v-if="servicesError" class="services-state services-state-error">
        {{ $t('services-load-failed', { error: servicesError }) }}
      </div>
      <div v-else-if="servicesLoading" class="services-state">
        {{ $t('loading-services') }}
      </div>
      <div v-else-if="services.length === 0" class="services-state">
        {{ $t('no-services') }}
      </div>

      <div v-else class="external-grid">
        <a
          v-for="service in sortedServices"
          :key="service.id"
          :href="service.url"
          target="_blank"
          rel="noopener"
          class="external-card"
        >
          <Icon name="arrowUpRight" :size="18" class="external-card-arrow" />
          <h3 class="external-card-title">
            <img
              v-if="serviceHasIcon(service)"
              :src="service.iconUrl"
              :alt="$t('service-icon-alt', { name: service.name })"
              class="service-icon-image"
              @error="markServiceIconFailed(service.id)"
            />
            {{ service.name }}
            <span v-if="service.new" class="service-new-flag">{{ $t('new') }}</span>
          </h3>
          <p class="external-card-desc">{{ service.description }}</p>
        </a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  max-width: var(--container);
  margin: 0 auto;
  padding: 0 var(--space-6) 72px;
}

.home-header-shell {
  margin-bottom: 24px;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background: linear-gradient(180deg, #10131a 0%, #10131a 72%, rgba(16, 19, 26, 0.78) 86%, rgba(16, 19, 26, 0) 100%);
}

.home-header-band {
  width: 100%;
}

.home-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 28px;
  padding: 40px var(--space-6) 96px;
  max-width: var(--container);
  margin: 0 auto;
}

.home-header-icon {
  width: 120px;
  height: 120px;
  border-radius: 28px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

.home-header-copy {
  min-width: 0;
  max-width: 760px;
  width: 100%;
  text-align: left;
}

.home-header-title {
  font-size: clamp(2.5rem, 7vw, 4.4rem);
  line-height: 0.95;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #f8fafc;
  margin: 0 0 16px;
}

.home-header-sub {
  max-width: 720px;
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-muted);
  margin: 0 0 14px;
}

.home-header-sub :deep(a) {
  color: var(--text-secondary);
  text-decoration: underline;
  text-decoration-color: rgba(148, 163, 184, 0.4);
  text-underline-offset: 3px;
  transition: color 0.25s var(--ease), text-decoration-color 0.25s var(--ease);
}

.home-header-sub :deep(a:hover) {
  color: var(--text);
  text-decoration-color: var(--text-secondary);
}

.home-header-note {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

.home-header-note :deep(a) {
  color: var(--accent-light);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.25s var(--ease);
}

.home-header-note :deep(a:hover) {
  border-color: var(--accent-light);
}

.home-section {
  margin-top: 40px;
}

.section-heading {
  margin-bottom: 18px;
  text-align: left;
}

.section-title {
  font-size: clamp(1.5rem, 2vw, 2.2rem);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.account-grid,
.external-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.account-card,
.external-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px 52px 20px 20px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.3s var(--ease), background 0.3s var(--ease);
}

.account-card:hover,
.external-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-raised);
  color: inherit;
}

.account-card-arrow,
.external-card-arrow {
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--text-faint);
  transition: color 0.3s var(--ease), transform 0.3s var(--ease);
}

.account-card:hover .account-card-arrow,
.external-card:hover .external-card-arrow {
  color: var(--text);
  transform: translate(3px, -3px);
}

.account-card-title,
.external-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0;
}

/* Plain text rather than a pill: the word on its own is enough. */
.service-new-flag {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--accent-light);
}

.account-card-desc,
.external-card-desc {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0;
}

.account-card-icon,
.service-icon-image {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.service-icon-image {
  object-fit: contain;
  border-radius: 4px;
}

.services-state {
  margin: 0;
  padding: 4px 0;
  color: var(--text-dim);
  font-size: 0.95rem;
}

.services-state-error {
  color: var(--danger);
}

@media (max-width: 720px) {
  .home-page {
    padding: 0 var(--space-5) 64px;
  }

  .home-header-shell {
    width: auto;
    margin-left: 0;
  }

  .home-header {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 28px 0 44px;
  }

  .home-header-icon {
    width: 88px;
    height: 88px;
    border-radius: 22px;
  }

  .account-grid,
  .external-grid {
    grid-template-columns: 1fr;
  }
}
</style>
