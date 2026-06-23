<script>
import { getCatalogServices } from '@/assets/js/serble.js';

export default {
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
    welcomeText() {
      return this.$t('welcome-to-serble')
        .replace('[', '')
        .replace(']', '');
    },
    lookingForMc() {
      return this.$t('looking-for-mc-server')
        .replace('[', '<a href="https://old.serble.net" target="_blank" rel="noopener">')
        .replace(']', '</a>');
    },
    accountTiles() {
      return [
        {
          to: '/account',
          label: this.$t('account'),
          description: 'Profile settings, sign-in details, and security controls.',
          iconColor: '#60a5fa',
          icon: 'account'
        },
        {
          to: '/oauthapps',
          label: this.$t('my-applications'),
          description: 'Create and manage apps connected to your Serble account.',
          iconColor: '#818cf8',
          icon: 'apps'
        },
        {
          to: '/authorizedapps',
          label: this.$t('authorized-applications'),
          description: 'Review third-party apps you have already approved.',
          iconColor: '#4ade80',
          icon: 'authorized'
        },
        {
          to: '/account/paymentportal',
          label: this.$t('manage-payments'),
          description: 'Open billing tools and manage your payment methods.',
          iconColor: '#fbbf24',
          icon: 'payments'
        }
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
      this.serviceIconFailures = {
        ...this.serviceIconFailures,
        [serviceId]: true
      };
    },
    renderAccountIcon(icon) {
      const icons = {
        account: '<path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/>',
        apps: '<path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>',
        authorized: '<path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533.18.085.293.118.293.118s.114-.033.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524z"/>',
        payments: '<path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/>'
      };

      return icons[icon] || icons.account;
    }
  }
}
</script>

<template>
  <main class="home-page">
    <section class="home-header-shell">
      <div class="home-header-band">
        <section class="home-header">
          <img src="/images/icon.png" alt="Serble" class="home-header-icon" />
          <div class="home-header-copy">
            <h1 class="home-header-title">{{ $t('serble') }}</h1>
            <p class="home-header-sub">{{ welcomeText }}</p>
            <p class="home-header-note" v-html="lookingForMc"></p>
          </div>
        </section>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2 class="section-title">Accounts</h2>
      </div>

      <div class="account-grid">
        <RouterLink
          v-for="tile in accountTiles"
          :key="tile.to"
          :to="tile.to"
          class="account-card"
        >
          <div class="account-card-top">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              fill="currentColor"
              viewBox="0 0 16 16"
              :style="{ color: tile.iconColor }"
              v-html="renderAccountIcon(tile.icon)"
            ></svg>
            <span class="account-card-arrow">↗</span>
          </div>
          <h3 class="account-card-title">{{ tile.label }}</h3>
          <p class="account-card-desc">{{ tile.description }}</p>
        </RouterLink>
      </div>
    </section>

    <section class="home-section">
      <div class="section-heading">
        <h2 class="section-title">Services</h2>
      </div>

      <div v-if="servicesError" class="services-state services-state-error">
        Failed to load services: {{ servicesError }}
      </div>
      <div v-else-if="servicesLoading" class="services-state">
        Loading services…
      </div>
      <div v-else-if="services.length === 0" class="services-state">
        No services available.
      </div>

      <div v-else class="external-grid">
        <a
          v-for="service in sortedServices"
          :key="service.id"
          :href="service.url"
          target="_blank"
          rel="noopener"
          class="external-card"
          :class="{ 'external-card-new': service.new }"
        >
          <div class="external-card-top">
            <img
              v-if="serviceHasIcon(service)"
              :src="service.iconUrl"
              :alt="`${service.name} icon`"
              class="service-icon-image"
              @error="markServiceIconFailed(service.id)"
            />
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" class="external-card-icon">
              <path d="M14.5 4.5h5v5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M13 11l6.5-6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 5.5H7.5A3.5 3.5 0 0 0 4 9v7.5A3.5 3.5 0 0 0 7.5 20h7A3.5 3.5 0 0 0 18 16.5V14" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M8.5 11.5h3" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
              <path d="M8.5 15h5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
            </svg>
            <span class="external-card-arrow">↗</span>
          </div>
          <h3 class="external-card-title">
            {{ service.name }}
            <span v-if="service.new" class="service-new-badge">New</span>
          </h3>
          <p class="external-card-desc">{{ service.description }}</p>
        </a>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 24px 72px;
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
  padding: 40px 24px 96px;
  max-width: 980px;
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
  font-weight: 900;
  letter-spacing: -0.05em;
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

.home-header-note {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

.home-header-note :deep(a) {
  color: #93c5fd;
  text-decoration: none;
}

.home-header-note :deep(a:hover) {
  text-decoration: underline;
}

.home-divider {
  width: min(100%, 720px);
  height: 1px;
  background: var(--border);
  margin: 0 auto 12px;
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
  font-weight: 800;
  letter-spacing: -0.03em;
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s, background 0.15s;
}

.account-card:hover,
.external-card:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);
  background: #1c1c20;
  color: inherit;
}

.account-card-top,
.external-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.account-card-arrow,
.external-card-arrow {
  font-size: 1rem;
  color: var(--text-faint);
}

.account-card-title,
.external-card-title {
  font-size: 1.15rem;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0;
}

.service-new-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
  color: #fff;
  background: var(--accent, #2563eb);
  border-radius: 999px;
}

.external-card-new {
  border-color: var(--accent, #2563eb);
  box-shadow: 0 0 0 1px var(--accent, #2563eb);
}

.external-card-new:hover {
  border-color: var(--accent, #2563eb);
  box-shadow: 0 0 0 1px var(--accent, #2563eb);
}

.account-card-desc,
.external-card-desc {
  font-size: 0.9rem;
  line-height: 1.7;
  color: #8b8b95;
  margin: 0;
}

.external-card-icon,
.service-icon-image {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.external-card-icon {
  color: var(--text-secondary);
}

.service-icon-image {
  object-fit: contain;
  border-radius: 6px;
}

.services-state {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 22px;
  color: var(--text-muted);
  font-size: 0.95rem;
  text-align: center;
}

.services-state-error {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.4);
}

@media (max-width: 720px) {
  .home-page {
    padding: 0 18px 64px;
  }

  .home-header-shell {
    width: auto;
    margin-left: 0;
  }

  .home-header {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 28px 18px 44px;
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
