<script>
import Icon from '@/components/Icon.vue';
export default {
  components: { Icon },
};
</script>

<template>
  <div class="contact-page">

    <div class="contact-inner">

      <!-- Header -->
      <div class="contact-header">
        <h1 class="contact-title">{{ $t('contact-us') }}</h1>
        <p class="contact-sub">{{ $t('contact-sub') }}</p>
      </div>

      <!-- Contact cards -->
      <div class="contact-cards">

        <a href="mailto:admin@serble.net" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(59,130,246,0.12); color: var(--accent-light);">
            <Icon name="mail" :size="22" />
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('admin-email') }}</span>
            <span class="card-value">admin@serble.net</span>
          </div>
          <Icon name="chevronRight" class="card-arrow" />
        </a>

        <a href="mailto:support@serble.net" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(16,185,129,0.12); color: #34d399;">
            <Icon name="headset" :size="22" />
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('support-email') }}</span>
            <span class="card-value">support@serble.net</span>
          </div>
          <Icon name="chevronRight" class="card-arrow" />
        </a>

        <RouterLink to="/discord" class="contact-card">
          <div class="card-icon-wrap" style="background: rgba(88,101,242,0.12); color: #7289da;">
            <Icon name="discord" :size="22" />
          </div>
          <div class="card-body">
            <span class="card-label">{{ $t('discord-invite') }}</span>
            <span class="card-value">discord.com/invite/fzvcNhW</span>
          </div>
          <Icon name="chevronRight" class="card-arrow" />
        </RouterLink>

      </div>
    </div>
  </div>
</template>

<style scoped>
.contact-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.contact-inner {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Header */
.contact-header {
  text-align: center;
}

.contact-title {
  font-size: 2rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 8px;
}

.contact-sub {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0;
}

/* Cards */
.contact-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contact-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  text-decoration: none;
  color: inherit;
  transition: border-color var(--t), background var(--t);
}

.contact-card:hover {
  border-color: var(--border-strong);
  background: var(--surface-raised);
  color: inherit;
}

.card-icon-wrap {
  width: 46px;
  height: 46px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.card-label {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-dim);
}

.card-value {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-arrow {
  color: var(--border-strong);
  flex-shrink: 0;
  transition: color var(--t), transform var(--t);
}

.contact-card:hover .card-arrow {
  color: var(--text);
  transform: translateX(3px);
}
</style>
