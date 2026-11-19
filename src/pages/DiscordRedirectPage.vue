<script>
import { onMounted } from 'vue';
import LinkedText from '@/components/LinkedText.vue';
import Icon from '@/components/Icon.vue';

const DISCORD_INVITE = 'https://discord.com/invite/fzvcNhW';

export default {
  components: { LinkedText, Icon },
  setup() {
    onMounted(() => {
      window.location.href = DISCORD_INVITE;
    });
    return { DISCORD_INVITE };
  }
};
</script>

<template>
  <div class="redirect-page">
    <div class="redirect-card">
      <div class="discord-icon">
        <Icon name="discord" :size="48" />
      </div>
      <h2 class="redirect-title">{{ $t('serble-discord') }}</h2>
      <p class="redirect-sub">
        <LinkedText :text="$t('browser-not-redirecting')" :href="DISCORD_INVITE" target="_blank" />
      </p>
    </div>
  </div>
</template>

<style scoped>
.redirect-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.redirect-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.discord-icon {
  color: #7289da;
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.redirect-title {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 10px;
}

.redirect-sub {
  font-size: 0.88rem;
  color: var(--text-dim);
  line-height: 1.6;
  margin: 0;
}

.redirect-sub :deep(a) {
  color: #7289da;
  text-decoration: none;
  font-weight: 600;
}

.redirect-sub :deep(a:hover) {
  text-decoration: underline;
}
</style>
