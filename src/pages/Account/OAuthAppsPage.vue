<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getUserApps, deleteOAuthApp } from '@/assets/js/serble.js';

export default {
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
    <div class="apps-header d-flex align-items-center justify-content-between mb-4">
      <div>
        <h3 class="mb-0">{{ $t('your-oauth-apps') }}</h3>
        <p class="text-muted mb-0" style="font-size:0.9rem;">Manage your OAuth applications</p>
      </div>
      <button class="btn btn-success d-flex align-items-center gap-2" @click="onNew">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
        </svg>
        {{ $t('new-app') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="apps === null" class="text-center text-muted py-5">
      <p>{{ $t('loading') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="apps.length === 0" class="empty-state text-center text-muted py-5">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="mb-3 opacity-50" viewBox="0 0 16 16">
        <path d="M6 .5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H9v1.07A7.001 7.001 0 0 1 8 16 7 7 0 0 1 9 2.07V1h-.5A.5.5 0 0 1 6 .5zm2 1.9A6 6 0 1 0 8 14 6 6 0 0 0 8 2.4z"/>
      </svg>
      <p class="mb-0">{{ $t('no-apps') }}</p>
      <p style="font-size:0.85rem;">Create your first application to get started.</p>
    </div>

    <!-- App cards -->
    <div v-else class="row g-4">
      <div v-for="app in apps" :key="app.Id" class="col-md-6">
        <div class="app-card h-100 bg-dark border rounded-3 d-flex flex-column">

          <!-- Card header -->
          <div class="card-top px-4 pt-4 pb-3 border-bottom border-secondary">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <h5 class="mb-0 app-name">{{ app.Name }}</h5>
              <div class="d-flex gap-2 flex-shrink-0">
                <button class="btn btn-sm btn-outline-secondary" @click="onEdit(app.Id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                  </svg>
                  {{ $t('edit') }}
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="onDelete(app.Id)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                  {{ $t('delete') }}
                </button>
              </div>
            </div>
            <p v-if="app.Description" class="text-muted mt-1 mb-0" style="font-size:0.85rem;">{{ app.Description }}</p>
          </div>

          <!-- Card body -->
          <div class="px-4 py-3 flex-grow-1 d-flex flex-column gap-3">

            <!-- App ID -->
            <div class="info-row">
              <span class="info-label">{{ $t('id') }}</span>
              <code class="info-value text-muted">{{ app.Id }}</code>
            </div>

            <!-- Client secret -->
            <div class="info-row">
              <span class="info-label">{{ $t('client-secret') }}</span>
              <button
                class="btn btn-sm copy-btn"
                :class="copiedId === app.Id ? 'btn-success' : 'btn-outline-secondary'"
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
            <div>
              <span class="info-label d-block mb-1">{{ $t('redirect-uris') }}</span>
              <div
                v-for="uri in (app.RedirectUri || '').split(';').map(u => u.trim()).filter(Boolean)"
                :key="uri"
                class="redirect-uri-item"
              >{{ uri }}</div>
              <span v-if="!(app.RedirectUri || '').trim()" class="text-muted" style="font-size:0.85rem;">—</span>
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
  padding: 32px 24px;
}

.app-card {
  transition: border-color 0.15s;
}

.app-card:hover {
  border-color: #555 !important;
}

.app-name {
  font-size: 1.05rem;
  font-weight: 600;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.info-label {
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  flex-shrink: 0;
  min-width: 90px;
}

.info-value {
  font-size: 0.82rem;
  word-break: break-all;
}

.copy-btn {
  font-size: 0.78rem;
  padding: 2px 10px;
}

.redirect-uri-item {
  font-size: 0.82rem;
  color: #aaa;
  word-break: break-all;
  padding: 3px 0;
  border-bottom: 1px solid #2a2a2a;
}

.redirect-uri-item:last-child {
  border-bottom: none;
}
</style>
