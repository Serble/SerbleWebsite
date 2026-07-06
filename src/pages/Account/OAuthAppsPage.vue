<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getUserApps, deleteOAuthApp } from '@/assets/js/serble.js';
import LoadingBlock from '@/components/LoadingBlock.vue';

export default {
  components: { LoadingBlock },
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const apps = ref(null);
    const copiedId = ref(null);

    onMounted(async () => {
      const result = await getUserApps();
      if (result.success) {
        apps.value = result.apps;
      } else {
        apps.value = [];
      }
    });

    async function onDelete(appId) {
      const result = await deleteOAuthApp(appId);
      if (result.success) {
        apps.value = apps.value.filter(a => a.Id !== appId);
      }
    }

    function onEdit(appId) {
      router.push('/oauthapps/edit?appid=' + appId);
    }

    function onNew() {
      router.push('/oauthapps/new');
    }

    function copySecret(secret, appId) {
      navigator.clipboard.writeText(secret);
      copiedId.value = appId;
      setTimeout(() => { copiedId.value = null; }, 2000);
    }

    return { apps, copiedId, onDelete, onEdit, onNew, copySecret };
  }
};
</script>

<template>
  <div class="apps-page">
    <!-- Page header -->
    <div class="apps-header">
      <div class="apps-header-text">
        <h3 class="apps-title">{{ $t('your-oauth-apps') }}</h3>
        <p class="apps-subtitle">Manage the OAuth applications you've created.</p>
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
      <p class="empty-sub">Create your first application to get started.</p>
    </div>

    <!-- App cards -->
    <div v-else class="cards-grid">
      <div v-for="app in apps" :key="app.Id" class="app-card">

        <!-- Card header -->
        <div class="card-header">
          <div class="app-icon">{{ (app.Name || '?').charAt(0).toUpperCase() }}</div>
          <div class="app-heading">
            <h4 class="app-name">{{ app.Name }}</h4>
            <p v-if="app.Description" class="app-desc">{{ app.Description }}</p>
          </div>
          <div class="card-actions">
            <button class="icon-btn" :title="$t('edit')" @click="onEdit(app.Id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
              </svg>
            </button>
            <button class="icon-btn icon-btn-danger" :title="$t('delete')" @click="onDelete(app.Id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Card body -->
        <div class="card-body">

          <!-- App ID -->
          <div class="info-row">
            <span class="info-label">{{ $t('id') }}</span>
            <code class="info-value">{{ app.Id }}</code>
          </div>

          <!-- Client secret -->
          <div class="info-row">
            <span class="info-label">{{ $t('client-secret') }}</span>
            <button
              class="copy-btn"
              :class="{ copied: copiedId === app.Id }"
              @click="copySecret(app.ClientSecret, app.Id)"
            >
              <svg v-if="copiedId !== app.Id" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0"/>
              </svg>
              {{ copiedId === app.Id ? $t('copied') : $t('click-to-copy') }}
            </button>
          </div>

          <!-- Redirect URIs -->
          <div class="info-block">
            <span class="info-label">{{ $t('redirect-uris') }}</span>
            <div class="uri-list">
              <div
                v-for="uri in (app.RedirectUri || '').split(';').map(u => u.trim()).filter(Boolean)"
                :key="uri"
                class="uri-item"
              >{{ uri }}</div>
              <span v-if="!(app.RedirectUri || '').trim()" class="no-uris">—</span>
            </div>
          </div>

        </div>
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
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.app-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
}

.app-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

/* ── Card header ── */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border);
}

.app-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
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
  gap: 3px;
}

.app-name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  word-break: break-word;
}

.app-desc {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
  line-height: 1.45;
}

.card-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-muted);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.icon-btn:hover {
  background: var(--border-strong);
  color: var(--text);
}

.icon-btn-danger:hover {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

/* ── Card body ── */
.card-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-grow: 1;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  flex-shrink: 0;
  min-width: 96px;
}

.info-value {
  font-size: 0.82rem;
  word-break: break-all;
  color: var(--text-secondary);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.copy-btn:hover {
  background: var(--border-strong);
  color: var(--text);
}

.copy-btn.copied {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success);
}

.uri-list {
  display: flex;
  flex-direction: column;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.uri-item {
  font-size: 0.8rem;
  color: var(--text-muted);
  word-break: break-all;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.uri-item:last-child { border-bottom: none; }

.no-uris {
  font-size: 0.82rem;
  color: var(--text-faint);
  padding: 8px 12px;
}

@media (max-width: 480px) {
  .cards-grid { grid-template-columns: 1fr; }
  .apps-header { flex-direction: column; align-items: stretch; }
}
</style>
