<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getUserApps } from '@/assets/js/serble.js';
import LoadingBlock from '@/components/LoadingBlock.vue';
import OfficialBadge from '@/components/OfficialBadge.vue';
import Icon from '@/components/Icon.vue';

export default {
  components: { LoadingBlock, OfficialBadge, Icon },
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const apps = ref(null);
    const copiedId = ref(null);
    let copyTimer = null;

    onMounted(async () => {
      const result = await getUserApps();
      apps.value = result.success ? result.apps : [];
    });

    function onNew() {
      router.push('/oauthapps/new');
    }

    function manageLink(appId) {
      return `/oauthapps/manage?appid=${encodeURIComponent(appId)}`;
    }

    // The whole ID row is the copy target - an app id is needed far more often than it's read.
    async function copyId(appId) {
      try {
        await navigator.clipboard.writeText(appId);
      } catch {
        return;
      }
      copiedId.value = appId;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copiedId.value = null; }, 2000);
    }

    function initial(app) {
      return (app.name || '?').charAt(0).toUpperCase();
    }

    return { apps, copiedId, onNew, manageLink, copyId, initial };
  }
};
</script>

<template>
  <div class="apps-page">
    <!-- Page header -->
    <div class="apps-header">
      <div class="apps-header-text">
        <h3 class="apps-title">{{ $t('your-oauth-apps') }}</h3>
        <p class="apps-subtitle">{{ $t('my-apps-subtitle') }}</p>
      </div>
      <button class="new-btn" @click="onNew">
        <Icon name="plus" :size="18" />
        {{ $t('new-app') }}
      </button>
    </div>

    <!-- Loading -->
    <LoadingBlock v-if="apps === null" />

    <!-- Empty state -->
    <div v-else-if="apps.length === 0" class="state-block empty-state">
      <!-- Apps grid - mirrors the tiled cards this page shows once apps exist. -->
      <Icon name="grid" :size="52" />
      <p class="empty-title">{{ $t('no-apps') }}</p>
      <p class="empty-sub">{{ $t('no-apps-subtitle') }}</p>
    </div>

    <!-- App cards -->
    <div v-else class="cards-grid">
      <div v-for="app in apps" :key="app.id" class="app-card">

        <!-- Card header - the primary action sits top-right so the card stays short -->
        <div class="card-top">
          <div class="app-icon">{{ initial(app) }}</div>
          <div class="app-heading">
            <div class="app-name-row">
              <h4 class="app-name">{{ app.name }}</h4>
              <OfficialBadge v-if="app.isOfficial" />
            </div>
            <p class="app-desc" :class="{ 'app-desc-empty': !app.description }">
              {{ app.description || $t('no-description') }}
            </p>
          </div>
          <RouterLink class="manage-btn" :to="manageLink(app.id)">
            {{ $t('manage') }}
            <Icon name="arrowRight" :size="16" />
          </RouterLink>
        </div>

        <!-- Copyable app id -->
        <button
          class="id-chip"
          :class="{ copied: copiedId === app.id }"
          :title="$t('copy-id')"
          @click="copyId(app.id)"
        >
          <span class="id-label">{{ $t('id') }}</span>
          <code class="id-text">{{ app.id }}</code>
          <span class="id-status">
            <template v-if="copiedId === app.id">
              <Icon name="check" :size="15" />
              {{ $t('copied') }}
            </template>
            <Icon v-else name="copy" :size="15" />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.apps-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* -- Header -- */
.apps-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.apps-title {
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text);
  margin: 0 0 4px;
}

.apps-subtitle {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0;
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  padding: 9px 16px;
  cursor: pointer;
  transition: background var(--t), transform var(--t);
}

.new-btn:hover { background: var(--accent-hover); }
.new-btn:active { transform: scale(0.98); }

/* -- Shared state blocks -- */
.state-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 20px;
  text-align: center;
  color: var(--text-dim);
}

.empty-state svg { color: var(--border-strong); margin-bottom: 4px; }

.empty-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0;
}

.empty-sub {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: 0;
}

/* -- Cards grid -- */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.app-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  transition: border-color var(--t), background var(--t);
}

.app-card:hover {
  border-color: var(--border-strong);
}

/* -- Card header -- */
.card-top {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}

.app-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius);
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  color: var(--accent-light);
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-heading {
  min-width: 0;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.app-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.app-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  word-break: break-word;
}

/* Clamped to two lines so a long description can't make one card tower over its neighbours. */
.app-desc {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.app-desc-empty {
  color: var(--text-faint);
  font-style: italic;
}

/* -- App id -- */
.id-chip {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin-top: auto;
  text-align: left;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 11px;
  cursor: pointer;
  transition: background var(--t), border-color var(--t), color var(--t);
}

.id-label {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--text-faint);
}

.id-chip:hover {
  border-color: var(--border-strong);
  background: var(--border);
}

.id-text {
  flex-grow: 1;
  min-width: 0;
  font-size: 0.79rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-faint);
}

.id-chip:hover .id-status { color: var(--text-muted); }

.id-chip.copied {
  background: var(--success-bg);
  border-color: var(--success-border);
}

.id-chip.copied .id-label,
.id-chip.copied .id-text,
.id-chip.copied .id-status { color: var(--success); }

/* -- Primary action -- */
.manage-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  padding: 6px 13px;
  text-decoration: none;
  transition: background var(--t), color var(--t), border-color var(--t);
}

.manage-btn:hover {
  background: var(--border-strong);
  border-color: var(--text-faint);
  color: var(--text);
}

@media (max-width: 480px) {
  .cards-grid { grid-template-columns: 1fr; }
  .apps-header { flex-direction: column; align-items: stretch; }
}
</style>
