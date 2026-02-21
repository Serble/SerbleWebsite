<script>
import { ref, onMounted, inject, computed, watch } from 'vue';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { getPublicAppInfo, deauthorizeApp } from '@/assets/js/serble.js';

// Scope metadata matching the API's ScopeHandler
const SCOPE_NAMES = [
  'Full Account Access',
  'File Host',
  'Account Information',
  'Control Of Authorized Applications',
  'Payment Information',
  'Account Management',
  'OAuth App Management',
];

const SCOPE_DESCRIPTIONS = [
  'Allows full access to the account.',
  'Allows access to the file host.',
  'Allows access to the account\'s information (e.g. Username, Email).',
  'Allows control over authorized applications.',
  'Allows access to a user\'s list of purchased products and allows them to manage their subscriptions.',
  'Grants the ability to control the user\'s account, including changing their email and username.',
  'Allows management over all of your OAuth applications.',
];

function parseScopeString(scopeString) {
  if (!scopeString) return [];
  return scopeString
    .split('')
    .map((bit, i) => bit === '1' ? { name: SCOPE_NAMES[i], description: SCOPE_DESCRIPTIONS[i] } : null)
    .filter(Boolean);
}

export default {
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
  <div class="text-center">
    <br/>
    <h3>{{ $t('authorized-applications') }}</h3>
    <hr/>
  </div>

  <div style="padding: 30px">
    <!-- Loading state -->
    <div v-if="pageLoading" class="text-center">
      <p>{{ $t('loading') }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="parsedEntries.length === 0" class="text-center text-muted">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" class="bi bi-shield-check mb-3 opacity-50" viewBox="0 0 16 16">
        <path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533q.18.085.293.118a1 1 0 0 0 .101.025 1 1 0 0 0 .1-.025q.114-.034.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56"/>
        <path d="M10.854 5.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 7.793l2.646-2.647a.5.5 0 0 1 .708 0"/>
      </svg>
      <p>{{ $t('no-authorized-apps') }}</p>
    </div>

    <!-- App cards -->
    <div v-else class="row align-items-stretch g-4">
      <div
        v-for="entry in parsedEntries"
        :key="entry.appId"
        class="col-md-6"
      >
        <!-- Skeleton while loading public info -->
        <div v-if="entry.loading" class="h-100 p-4 bg-dark border rounded-3 d-flex align-items-center justify-content-center text-muted">
          <span>{{ $t('loading') }}</span>
        </div>

        <!-- Error state -->
        <div v-else-if="entry.error" class="h-100 p-4 bg-dark border border-danger rounded-3">
          <h5 class="text-danger">{{ $t('unknown-error') }}</h5>
          <p class="text-muted mb-1" style="font-size: 0.8rem;">{{ $t('id') }}: {{ entry.appId }}</p>
          <button class="btn btn-outline-danger btn-sm mt-2" @click="revoke(entry.appId)">{{ $t('revoke-access') }}</button>
        </div>

        <!-- Normal card -->
        <div v-else class="h-100 p-4 bg-dark border rounded-3 d-flex flex-column">
          <h4 class="mb-1">{{ entry.publicApp?.Name ?? entry.publicApp?.name }}</h4>
          <p class="text-muted mb-3" style="font-size: 0.9rem;">
              {{ (entry.publicApp?.Description ?? entry.publicApp?.description) || '—' }}
          </p>

          <div class="mb-3 flex-grow-1">
            <h6 class="mb-2">{{ $t('scopes') }}</h6>
            <div v-if="entry.parsedScopes.length === 0" class="text-muted" style="font-size: 0.85rem;">{{ $t('none') }}</div>
            <ul v-else class="scope-list">
              <li
                v-for="scope in entry.parsedScopes"
                :key="scope.name"
                class="scope-item"
                :title="scope.description"
              >
                <span class="scope-badge">{{ scope.name }}</span>
                <span class="scope-desc">{{ scope.description }}</span>
              </li>
            </ul>
          </div>

          <div class="mt-auto pt-2 border-top border-secondary d-flex align-items-center justify-content-between">
            <span class="text-muted" style="font-size: 0.75rem;">{{ $t('id') }}: {{ entry.appId }}</span>
            <button class="btn btn-outline-danger btn-sm" @click="revoke(entry.appId)">
              {{ $t('revoke-access') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scope-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.scope-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scope-badge {
  display: inline-block;
  background-color: #2c5282;
  color: #90cdf4;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.scope-desc {
  font-size: 0.78rem;
  color: #999;
  padding-left: 4px;
}
</style>
