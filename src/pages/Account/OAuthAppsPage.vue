<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getUserApps } from '@/assets/js/serble.js';
import LoadingBlock from '@/components/LoadingBlock.vue';
import OfficialBadge from '@/components/OfficialBadge.vue';

export default {
  components: { LoadingBlock, OfficialBadge },
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

    // The whole ID row is the copy target — an app id is needed far more often than it's read.
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
        </svg>
        {{ $t('new-app') }}
      </button>
    </div>

    <!-- Loading -->
    <LoadingBlock v-if="apps === null" />

    <!-- Empty state -->
    <div v-else-if="apps.length === 0" class="state-block empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="currentColor" viewBox="0 0 16 16">
        <path d="M6 .5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H9v1.07A7.001 7.001 0 0 1 8 16 7 7 0 0 1 9 2.07V1h-.5A.5.5 0 0 1 6 .5zm2 1.9A6 6 0 1 0 8 14 6 6 0 0 0 8 2.4z"/>
      </svg>
      <p class="empty-title">{{ $t('no-apps') }}</p>
      <p class="empty-sub">{{ $t('no-apps-subtitle') }}</p>
    </div>

    <!-- App cards -->
    <div v-else class="cards-grid">
      <div v-for="app in apps" :key="app.id" class="app-card">

        <!-- Card header — the primary action sits top-right so the card stays short -->
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
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/>
            </svg>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>
              </svg>
              {{ $t('copied') }}
            </template>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
            </svg>
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

/* ── Header ── */
.apps-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.apps-title {
  font-size: 1.6rem;
  font-weight: 800;
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
  border-radius: 8px;
  padding: 9px 16px;
  cursor: pointer;
  transition: background 0.15s;
}

.new-btn:hover { background: var(--accent-hover); }

/* ── Shared state blocks ── */
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

/* ── Cards grid ── */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.app-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  transition: border-color 0.15s, transform 0.15s;
}

.app-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

/* ── Card header ── */
.card-top {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}

.app-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--accent), var(--accent-purple));
  color: #fff;
  font-size: 1.25rem;
  font-weight: 800;
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

/* ── App id ── */
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
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.id-label {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
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

/* ── Primary action ── */
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
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.manage-btn:hover {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

@media (max-width: 480px) {
  .cards-grid { grid-template-columns: 1fr; }
  .apps-header { flex-direction: column; align-items: stretch; }
}
</style>
