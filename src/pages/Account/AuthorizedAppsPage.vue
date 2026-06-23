<script>
import { ref, onMounted, inject, computed, watch } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPublicAppInfo, deauthorizeApp } from '@/assets/js/serble.js';
import { isSensitiveScopeName } from '@/assets/js/scopes.js';
import OfficialBadge from '@/components/OfficialBadge.vue';

// Scope metadata matching the API's ScopeHandler
const SCOPE_NAMES = [
  'Full Account Access',
  'File Host',
  'Account Information',
  'Control Of Authorized Applications',
  'Payment Information',
  'Account Management',
  'OAuth App Management',
  'Economy',
];

const SCOPE_DESCRIPTIONS = [
  'Allows full access to the account.',
  'Allows access to the file host.',
  'Allows access to the account\'s information (e.g. Username, Email).',
  'Allows control over authorized applications.',
  'Allows access to a user\'s list of purchased products and allows them to manage their subscriptions.',
  'Grants the ability to control the user\'s account, including changing their email and username.',
  'Allows management over all of your OAuth applications.',
  'Allows reading and modifying the account\'s coin balance.',
];

function parseScopeString(scopeString) {
  if (!scopeString) return [];
  return scopeString
    .split('')
    .map((bit, i) => bit === '1' ? { name: SCOPE_NAMES[i], description: SCOPE_DESCRIPTIONS[i], sensitive: isSensitiveScopeName(SCOPE_NAMES[i]) } : null)
    .filter(Boolean);
}

export default {
  components: { OfficialBadge },
  setup() {
    const user = ensureLoggedIn();
    const userStore = inject('userStore');

    // Each entry: { appId, scopes, publicApp, loading, error }
    const entries = ref([]);
    const pageLoading = ref(true);

    async function loadApps(authorizedApps) {
      if (!authorizedApps || authorizedApps.length === 0) {
        entries.value = [];
        pageLoading.value = false;
        return;
      }

      // Build skeleton entries first so we can show them while fetching
      entries.value = authorizedApps.map(a => ({
        appId: a.appId ?? a.AppId,
        scopes: a.scopes ?? a.Scopes ?? '',
        publicApp: null,
        loading: true,
        error: false,
      }));
      pageLoading.value = false;

      // Fetch public info for every app in parallel
      await Promise.all(
        entries.value.map(async (entry) => {
          const result = await getPublicAppInfo(entry.appId);
          if (result.success) {
            entry.publicApp = result.app;
          } else {
            entry.error = true;
          }
          entry.loading = false;
        })
      );
    }

    // When the user store resolves, load the apps
    const currentUser = userStore.state.user;
    if (currentUser) {
      loadApps(currentUser.authorizedApps ?? currentUser.AuthorizedApps ?? []);
    } else {
      const stopWatch = watch(
        () => userStore.state.user,
        (u) => {
          if (u) {
            stopWatch();
            loadApps(u.authorizedApps ?? u.AuthorizedApps ?? []);
          }
        }
      );
    }

    async function revoke(appId) {
      const result = await deauthorizeApp(appId);
      if (result.success) {
        entries.value = entries.value.filter(e => e.appId !== appId);
      }
    }

    const parsedEntries = computed(() =>
      entries.value.map(e => ({
        ...e,
        parsedScopes: parseScopeString(e.scopes),
      }))
    );

    return { pageLoading, parsedEntries, revoke };
  }
};
</script>

<template>
  <div class="authorized-page">

    <!-- Page header -->
    <div class="authorized-header">
      <h3 class="authorized-title">{{ $t('authorized-applications') }}</h3>
      <p class="authorized-subtitle">Applications you've granted access to your Serble account.</p>
    </div>

    <!-- Loading state -->
    <div v-if="pageLoading" class="state-block">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16" class="spin text-primary">
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/>
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/>
      </svg>
      <p>{{ $t('loading') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="parsedEntries.length === 0" class="state-block empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" fill="currentColor" class="bi bi-shield-check" viewBox="0 0 16 16">
        <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
        <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
      </svg>
      <p class="empty-title">{{ $t('no-authorized-apps') }}</p>
      <p class="empty-sub">When you authorize an application, it will appear here.</p>
    </div>

    <!-- App cards -->
    <div v-else class="cards-grid">
      <div v-for="entry in parsedEntries" :key="entry.appId" class="auth-card">

        <!-- Skeleton while loading public info -->
        <div v-if="entry.loading" class="card-skeleton">
          <span>{{ $t('loading') }}</span>
        </div>

        <!-- Error state -->
        <template v-else-if="entry.error">
          <div class="card-header">
            <div class="app-icon app-icon-error">!</div>
            <div class="app-heading">
              <h4 class="app-name">{{ $t('unknown-error') }}</h4>
              <p class="app-id-muted">{{ $t('id') }}: {{ entry.appId }}</p>
            </div>
          </div>
          <div class="card-footer">
            <button class="revoke-btn" @click="revoke(entry.appId)">{{ $t('revoke-access') }}</button>
          </div>
        </template>

        <!-- Normal card -->
        <template v-else>
          <div class="card-header">
            <div class="app-icon">{{ (entry.publicApp?.Name ?? entry.publicApp?.name ?? '?').charAt(0).toUpperCase() }}</div>
            <div class="app-heading">
              <h4 class="app-name">
                {{ entry.publicApp?.Name ?? entry.publicApp?.name }}
                <OfficialBadge v-if="entry.publicApp?.isOfficial ?? entry.publicApp?.IsOfficial" class="ms-1" />
              </h4>
              <p v-if="(entry.publicApp?.Description ?? entry.publicApp?.description)" class="app-desc">
                {{ entry.publicApp?.Description ?? entry.publicApp?.description }}
              </p>
            </div>
          </div>

          <div class="card-body">
            <p class="scopes-heading">{{ $t('scopes') }}</p>
            <p v-if="entry.parsedScopes.length === 0" class="no-scopes">{{ $t('none') }}</p>
            <ul v-else class="scope-list">
              <li v-for="scope in entry.parsedScopes" :key="scope.name" class="scope-item" :class="{ 'scope-item-sensitive': scope.sensitive }">
                <div class="scope-dot"></div>
                <div class="scope-text">
                  <span class="scope-name">
                    {{ scope.name }}
                    <span v-if="scope.sensitive" class="scope-sensitive-tag">{{ $t('sensitive') }}</span>
                  </span>
                  <span class="scope-desc">{{ scope.description }}</span>
                </div>
              </li>
            </ul>
          </div>

          <div class="card-footer">
            <span class="app-id-muted">{{ $t('id') }}: {{ entry.appId }}</span>
            <button class="revoke-btn" @click="revoke(entry.appId)">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
              </svg>
              {{ $t('revoke-access') }}
            </button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.authorized-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* ── Header ── */
.authorized-header {
  margin-bottom: 28px;
}

.authorized-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 4px;
}

.authorized-subtitle {
  font-size: 0.9rem;
  color: var(--text-dim);
  margin: 0;
}

/* ── Shared state blocks (loading / empty) ── */
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

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }

.empty-state svg {
  color: var(--border-strong);
  margin-bottom: 4px;
}

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

.auth-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s, transform 0.15s;
}

.auth-card:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.card-skeleton {
  padding: 48px 20px;
  text-align: center;
  color: var(--text-faint);
  font-size: 0.9rem;
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

.app-icon-error {
  background: linear-gradient(135deg, var(--danger-strong), var(--danger-stronger));
}

.app-heading {
  min-width: 0;
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

/* ── Card body / scopes ── */
.card-body {
  padding: 16px 20px;
  flex-grow: 1;
}

.scopes-heading {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin: 0 0 12px;
}

.scope-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.scope-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.scope-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  margin-top: 5px;
}

.scope-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scope-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.scope-desc {
  font-size: 0.77rem;
  color: var(--text-faint);
  line-height: 1.4;
}

.no-scopes {
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: 0;
}

.scope-item-sensitive {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border);
  border-radius: 8px;
  padding: 8px 10px;
}

.scope-item-sensitive .scope-dot {
  background: var(--danger);
}

.scope-item-sensitive .scope-name {
  color: var(--danger);
}

.scope-sensitive-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--danger);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  vertical-align: middle;
}

/* ── Card footer ── */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  background: var(--surface-footer);
  margin-top: auto;
}

.app-id-muted {
  font-size: 0.72rem;
  color: var(--text-faint);
  margin: 0;
  word-break: break-all;
}

.revoke-btn {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid var(--danger-border-soft);
  border-radius: 7px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.revoke-btn:hover {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

@media (max-width: 480px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
