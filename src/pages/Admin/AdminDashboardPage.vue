<script>
import { ref, computed, onMounted, inject } from 'vue';
import { useRouter } from 'vue-router';
import {
  adminGetUserStats,
  adminSearchUsers,
  adminGetUser,
  adminDeleteUser,
  adminLoginAsUser,
  adminDisableUser,
  adminEnableUser,
  adminChangePassword,
  adminDisable2fa,
  adminGetPasskeys,
  adminDeletePasskey,
  adminSetAdmin,
  adminGetAppStats,
  adminSearchApps,
  adminGetApp,
  adminEditApp,
  adminDeleteApp,
  adminGetAppsByUser,
  adminCycleAppSecret,
  adminListProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
} from '@/assets/js/serble.js';
import { setLocalStorage } from '@/assets/js/utils.js';

export default {
  setup() {
    const router = useRouter();
    const userStore = inject('userStore');
    const currentUser = computed(() => userStore.state.user);
    const isAdmin = computed(() => (currentUser.value?.permLevel ?? 0) >= 2);

    const stats = ref(null);
    const statsError = ref(null);

    const query = ref('');
    const limit = ref(25);
    const searching = ref(false);
    const results = ref([]);
    const searchError = ref(null);

    const selected = ref(null);
    const selectedLoading = ref(false);
    const selectedError = ref(null);
    const passkeys = ref(null);
    const passkeysLoading = ref(false);

    const passwordInput = ref('');
    const actionBusy = ref(false);
    const actionMessage = ref(null);
    const actionMessageType = ref('info');

    function flash(msg, type = 'info') {
      actionMessage.value = msg;
      actionMessageType.value = type;
      setTimeout(() => { if (actionMessage.value === msg) actionMessage.value = null; }, 4000);
    }

    async function loadStats() {
      stats.value = null;
      statsError.value = null;
      const r = await adminGetUserStats();
      if (r.success) stats.value = r.stats;
      else statsError.value = r.error ?? 'unknown';
    }

    async function runSearch() {
      searching.value = true;
      searchError.value = null;
      const r = await adminSearchUsers(query.value, limit.value);
      searching.value = false;
      if (r.success) results.value = r.users || [];
      else { results.value = []; searchError.value = r.error ?? 'unknown'; }
    }

    async function selectUser(id) {
      selectedLoading.value = true;
      selectedError.value = null;
      selected.value = null;
      passkeys.value = null;
      const r = await adminGetUser(id);
      selectedLoading.value = false;
      if (r.success) {
        selected.value = r.user;
        loadPasskeys(id);
      } else {
        selectedError.value = r.error ?? 'unknown';
      }
    }

    async function loadPasskeys(id) {
      passkeysLoading.value = true;
      const r = await adminGetPasskeys(id);
      passkeysLoading.value = false;
      if (r.success) passkeys.value = Array.isArray(r.passkeys) ? r.passkeys : (r.passkeys ?? []);
      else passkeys.value = [];
    }

    function closeUser() {
      selected.value = null;
      passkeys.value = null;
      passwordInput.value = '';
    }

    async function withBusy(fn, successMsg) {
      if (actionBusy.value) return;
      actionBusy.value = true;
      try {
        const r = await fn();
        if (r?.success) {
          if (successMsg) flash(successMsg, 'success');
          return r;
        } else {
          flash('Error: ' + (r?.error ?? 'unknown'), 'danger');
          return r;
        }
      } finally {
        actionBusy.value = false;
      }
    }

    async function refreshSelected() {
      if (!selected.value) return;
      const r = await adminGetUser(selected.value.id);
      if (r.success) selected.value = r.user;
    }

    async function actDisable() {
      if (!selected.value) return;
      if (!confirm(`Disable ${selected.value.username}?`)) return;
      await withBusy(() => adminDisableUser(selected.value.id), 'User disabled');
      await refreshSelected();
    }

    async function actEnable() {
      if (!selected.value) return;
      await withBusy(() => adminEnableUser(selected.value.id), 'User enabled');
      await refreshSelected();
    }

    async function actDelete() {
      if (!selected.value) return;
      const u = selected.value;
      if (!confirm(`Permanently delete ${u.username} (${u.id})? This cannot be undone.`)) return;
      const r = await withBusy(() => adminDeleteUser(u.id), 'User deleted');
      if (r?.success) {
        results.value = results.value.filter(x => x.id !== u.id);
        closeUser();
      }
    }

    async function actDisable2fa() {
      if (!selected.value) return;
      if (!confirm(`Disable 2FA for ${selected.value.username}?`)) return;
      await withBusy(() => adminDisable2fa(selected.value.id), '2FA disabled');
      await refreshSelected();
    }

    async function actChangePassword() {
      if (!selected.value) return;
      if (!passwordInput.value) {
        flash('Enter a new password', 'danger');
        return;
      }
      if (!confirm(`Change password for ${selected.value.username}?`)) return;
      const r = await withBusy(() => adminChangePassword(selected.value.id, passwordInput.value), 'Password changed');
      if (r?.success) passwordInput.value = '';
    }

    async function actToggleAdmin() {
      if (!selected.value) return;
      const makeAdmin = (selected.value.permLevel ?? 0) < 2;
      if (!confirm(`${makeAdmin ? 'Grant' : 'Revoke'} admin for ${selected.value.username}?`)) return;
      await withBusy(() => adminSetAdmin(selected.value.id, makeAdmin),
        makeAdmin ? 'Admin granted' : 'Admin revoked');
      await refreshSelected();
    }

    async function actLoginAs() {
      if (!selected.value) return;
      if (!confirm(`Login as ${selected.value.username}? You will be logged out of your current session.`)) return;
      const r = await withBusy(() => adminLoginAsUser(selected.value.id), 'Switching user…');
      if (r?.success && r.data?.token) {
        setLocalStorage('access_token', r.data.token);
        window.location = '/account';
      }
    }

    async function actDeletePasskey(name) {
      if (!selected.value) return;
      if (!confirm(`Delete passkey "${name}"?`)) return;
      const r = await withBusy(() => adminDeletePasskey(selected.value.id, name), 'Passkey deleted');
      if (r?.success) loadPasskeys(selected.value.id);
    }

    // ── App management ──
    const activeTab = ref('users'); // users|apps

    const appStats = ref(null);
    const appStatsError = ref(null);

    const appQuery = ref('');
    const appLimit = ref(25);
    const appSearching = ref(false);
    const appResults = ref([]);
    const appSearchError = ref(null);

    const selectedApp = ref(null);
    const selectedAppLoading = ref(false);
    const selectedAppError = ref(null);
    const appEdits = ref({ name: '', description: '', redirectUri: '', ownerId: '' });
    const showSecret = ref(false);

    const userApps = ref(null);
    const userAppsLoading = ref(false);

    async function loadAppStats() {
      appStats.value = null;
      appStatsError.value = null;
      const r = await adminGetAppStats();
      if (r.success) appStats.value = r.stats;
      else appStatsError.value = r.error ?? 'unknown';
    }

    async function runAppSearch() {
      appSearching.value = true;
      appSearchError.value = null;
      const r = await adminSearchApps(appQuery.value, appLimit.value);
      appSearching.value = false;
      if (r.success) appResults.value = r.apps || [];
      else { appResults.value = []; appSearchError.value = r.error ?? 'unknown'; }
    }

    async function selectApp(id) {
      selectedAppLoading.value = true;
      selectedAppError.value = null;
      selectedApp.value = null;
      showSecret.value = false;
      const r = await adminGetApp(id);
      selectedAppLoading.value = false;
      if (r.success) {
        selectedApp.value = r.app;
        appEdits.value = {
          name: r.app.name ?? '',
          description: r.app.description ?? '',
          redirectUri: r.app.redirectUri ?? '',
          ownerId: r.app.ownerId ?? '',
        };
      } else {
        selectedAppError.value = r.error ?? 'unknown';
      }
    }

    function closeApp() {
      selectedApp.value = null;
      showSecret.value = false;
    }

    async function refreshSelectedApp() {
      if (!selectedApp.value) return;
      const r = await adminGetApp(selectedApp.value.id);
      if (r.success) {
        selectedApp.value = r.app;
        appEdits.value = {
          name: r.app.name ?? '',
          description: r.app.description ?? '',
          redirectUri: r.app.redirectUri ?? '',
          ownerId: r.app.ownerId ?? '',
        };
      }
    }

    async function actSaveApp() {
      if (!selectedApp.value) return;
      const cur = selectedApp.value;
      const body = {};
      if ((appEdits.value.name ?? '') !== (cur.name ?? '')) body.name = appEdits.value.name;
      if ((appEdits.value.description ?? '') !== (cur.description ?? '')) body.description = appEdits.value.description;
      if ((appEdits.value.redirectUri ?? '') !== (cur.redirectUri ?? '')) body.redirectUri = appEdits.value.redirectUri;
      if ((appEdits.value.ownerId ?? '') !== (cur.ownerId ?? '')) body.ownerId = appEdits.value.ownerId;
      if (Object.keys(body).length === 0) {
        flash('No changes to save', 'info');
        return;
      }
      await withBusy(() => adminEditApp(cur.id, body), 'App updated');
      await refreshSelectedApp();
    }

    async function actDeleteApp() {
      if (!selectedApp.value) return;
      const a = selectedApp.value;
      if (!confirm(`Permanently delete app "${a.name}" (${a.id})?`)) return;
      const r = await withBusy(() => adminDeleteApp(a.id), 'App deleted');
      if (r?.success) {
        appResults.value = appResults.value.filter(x => x.id !== a.id);
        if (userApps.value) userApps.value = userApps.value.filter(x => x.id !== a.id);
        closeApp();
      }
    }

    async function actCycleSecret() {
      if (!selectedApp.value) return;
      if (!confirm(`Cycle client secret for "${selectedApp.value.name}"? The old secret will stop working.`)) return;
      await withBusy(() => adminCycleAppSecret(selectedApp.value.id), 'Secret cycled');
      showSecret.value = true;
      await refreshSelectedApp();
    }

    async function copySecret() {
      if (!selectedApp.value?.clientSecret) return;
      try {
        await navigator.clipboard.writeText(selectedApp.value.clientSecret);
        flash('Secret copied', 'success');
      } catch {
        flash('Copy failed', 'danger');
      }
    }

    async function loadUserApps() {
      if (!selected.value) return;
      userAppsLoading.value = true;
      const r = await adminGetAppsByUser(selected.value.id);
      userAppsLoading.value = false;
      if (r.success) userApps.value = r.apps || [];
      else userApps.value = [];
    }

    function viewAppFromUser(appId) {
      activeTab.value = 'apps';
      selectApp(appId);
    }

    // ── Product management ──
    function emptyProduct() {
      return {
        id: '',
        name: '',
        description: '',
        priceIds: [],
        priceLookupIds: [], // local: array of {key, value} pairs
        purchasable: true,
        successRedirect: '',
        successTokenSecret: '',
        webhook: '',
        webhookSecret: '',
        allowAnonymous: false,
      };
    }

    function toProductForm(p) {
      const lookupMap = p?.priceLookupIds ?? {};
      return {
        id: p?.id ?? '',
        name: p?.name ?? '',
        description: p?.description ?? '',
        priceIds: Array.isArray(p?.priceIds) ? [...p.priceIds] : [],
        priceLookupIds: Object.entries(lookupMap).map(([key, value]) => ({ key, value })),
        purchasable: !!p?.purchasable,
        successRedirect: p?.successRedirect ?? '',
        successTokenSecret: p?.successTokenSecret ?? '',
        webhook: p?.webhook ?? '',
        webhookSecret: p?.webhookSecret ?? '',
        allowAnonymous: !!p?.allowAnonymous,
      };
    }

    function fromProductForm(f) {
      const lookup = {};
      for (const { key, value } of f.priceLookupIds) {
        const k = (key ?? '').trim();
        if (k) lookup[k] = value ?? '';
      }
      return {
        id: f.id,
        name: f.name,
        description: f.description,
        priceIds: f.priceIds.map(p => (p ?? '').trim()).filter(Boolean),
        priceLookupIds: lookup,
        purchasable: !!f.purchasable,
        successRedirect: f.successRedirect,
        successTokenSecret: f.successTokenSecret,
        webhook: f.webhook,
        webhookSecret: f.webhookSecret,
        allowAnonymous: !!f.allowAnonymous,
      };
    }

    const products = ref(null);
    const productsLoading = ref(false);
    const productsError = ref(null);
    const productForm = ref(emptyProduct());
    const editingProduct = ref(null); // original id when editing, null when creating
    const productPanelOpen = ref(false);

    async function loadProducts() {
      productsLoading.value = true;
      productsError.value = null;
      const r = await adminListProducts();
      productsLoading.value = false;
      if (r.success) products.value = r.products || [];
      else { products.value = []; productsError.value = r.error ?? 'unknown'; }
    }

    function openNewProduct() {
      productForm.value = emptyProduct();
      editingProduct.value = null;
      productPanelOpen.value = true;
    }

    async function editProduct(id) {
      const r = await adminGetProduct(id);
      if (r.success) {
        productForm.value = toProductForm(r.product);
        editingProduct.value = id;
        productPanelOpen.value = true;
      } else {
        flash('Failed to load product: ' + (r.error ?? 'unknown'), 'danger');
      }
    }

    function closeProductPanel() {
      productPanelOpen.value = false;
      editingProduct.value = null;
      productForm.value = emptyProduct();
    }

    function addPriceId() {
      productForm.value.priceIds.push('');
    }
    function removePriceId(i) {
      productForm.value.priceIds.splice(i, 1);
    }
    function addPriceLookup() {
      productForm.value.priceLookupIds.push({ key: '', value: '' });
    }
    function removePriceLookup(i) {
      productForm.value.priceLookupIds.splice(i, 1);
    }

    async function saveProduct() {
      const body = fromProductForm(productForm.value);
      if (!body.id?.trim()) {
        flash('Product ID is required', 'danger');
        return;
      }
      if (!body.name?.trim()) {
        flash('Product name is required', 'danger');
        return;
      }
      const r = editingProduct.value
        ? await withBusy(() => adminUpdateProduct(editingProduct.value, body), 'Product saved')
        : await withBusy(() => adminCreateProduct(body), 'Product created');
      if (r?.success) {
        closeProductPanel();
        loadProducts();
      }
    }

    async function deleteProduct(id, name) {
      if (!confirm(`Permanently delete product "${name}" (${id})?`)) return;
      const r = await withBusy(() => adminDeleteProduct(id), 'Product deleted');
      if (r?.success) {
        if (editingProduct.value === id) closeProductPanel();
        loadProducts();
      }
    }

    onMounted(async () => {
      if (!currentUser.value) {
        router.push({ name: 'login', query: { return_url: '/admin' } });
        return;
      }
      if (!isAdmin.value) return;
      loadStats();
      loadAppStats();
      loadProducts();
    });

    function permLabel(level) {
      if (level >= 2) return 'Admin';
      if (level === 0) return 'Disabled';
      return 'User';
    }

    return {
      isAdmin, stats, statsError, query, limit, searching, results, searchError,
      selected, selectedLoading, selectedError, passkeys, passkeysLoading,
      passwordInput, actionBusy, actionMessage, actionMessageType,
      loadStats, runSearch, selectUser, closeUser,
      actDisable, actEnable, actDelete, actDisable2fa, actChangePassword,
      actToggleAdmin, actLoginAs, actDeletePasskey, permLabel,
      activeTab,
      appStats, appStatsError, appQuery, appLimit, appSearching, appResults, appSearchError,
      selectedApp, selectedAppLoading, selectedAppError, appEdits, showSecret,
      userApps, userAppsLoading,
      loadAppStats, runAppSearch, selectApp, closeApp,
      actSaveApp, actDeleteApp, actCycleSecret, copySecret,
      loadUserApps, viewAppFromUser,
      products, productsLoading, productsError, productForm, editingProduct, productPanelOpen,
      loadProducts, openNewProduct, editProduct, closeProductPanel,
      addPriceId, removePriceId, addPriceLookup, removePriceLookup,
      saveProduct, deleteProduct,
    };
  }
};
</script>

<template>
  <div class="admin-page">
    <div v-if="!isAdmin" class="forbidden text-center py-5">
      <h3>Forbidden</h3>
      <p class="text-muted">You don't have permission to access the admin dashboard.</p>
    </div>

    <template v-else>
      <div class="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h3 class="mb-0">Admin Dashboard</h3>
          <p class="text-muted mb-0" style="font-size:0.9rem;">User & OAuth app management</p>
        </div>
      </div>

      <!-- Tabs -->
      <ul class="nav admin-tabs mb-4">
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">Users</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'apps' }" @click="activeTab = 'apps'">OAuth Apps</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'products' }" @click="activeTab = 'products'">Products</button>
        </li>
      </ul>

      <!-- USERS TAB -->
      <div v-show="activeTab === 'users'">
      <div class="d-flex justify-content-end mb-2">
        <button class="btn btn-sm btn-outline-secondary" @click="loadStats">Refresh stats</button>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-4">
          <div class="stat-card">
            <div class="stat-label">Total users</div>
            <div class="stat-value">{{ stats ? stats.totalUsers : '—' }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <div class="stat-label">Verified emails</div>
            <div class="stat-value">{{ stats ? stats.verifiedEmailUsers : '—' }}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="stat-card">
            <div class="stat-label">Verified %</div>
            <div class="stat-value">{{ stats ? (stats.verifiedEmailPercent.toFixed(1) + '%') : '—' }}</div>
          </div>
        </div>
        <div v-if="statsError" class="col-12">
          <div class="alert alert-danger py-2 mb-0">Failed to load stats: {{ statsError }}</div>
        </div>
      </div>

      <div class="search-card mb-4">
        <h5 class="mb-3">Find user</h5>
        <form class="row g-2 align-items-end" @submit.prevent="runSearch">
          <div class="col-md-7">
            <label class="form-label mb-1" style="font-size:0.8rem;">Query (username, email, or ID)</label>
            <input v-model="query" type="text" class="form-control dark-input" placeholder="Leave empty to list recent users" />
          </div>
          <div class="col-md-2">
            <label class="form-label mb-1" style="font-size:0.8rem;">Limit</label>
            <input v-model.number="limit" type="number" min="1" max="200" class="form-control dark-input" />
          </div>
          <div class="col-md-3">
            <button type="submit" class="btn btn-primary w-100" :disabled="searching">
              {{ searching ? 'Searching…' : 'Search' }}
            </button>
          </div>
        </form>

        <div v-if="searchError" class="alert alert-danger py-2 mt-3 mb-0">Search failed: {{ searchError }}</div>

        <div v-if="results.length" class="table-responsive mt-3">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>ID</th>
                <th>Role</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in results" :key="u.id">
                <td>{{ u.username }}</td>
                <td>
                  {{ u.email || '—' }}
                  <span v-if="u.email && u.verifiedEmail" class="badge bg-success ms-1">✓</span>
                  <span v-else-if="u.email" class="badge bg-warning text-dark ms-1">unverified</span>
                </td>
                <td><code style="font-size:0.78rem;">{{ u.id }}</code></td>
                <td>
                  <span v-if="u.permLevel === 0" class="badge bg-danger">Disabled</span>
                  <span v-else-if="u.permLevel >= 2" class="badge bg-primary">Admin</span>
                  <span v-else class="text-muted-light">User</span>
                </td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-primary" @click="selectUser(u.id)">Manage</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else-if="!searching && !searchError" class="text-muted mt-3" style="font-size:0.9rem;">
          No results yet. Run a search above.
        </div>
      </div>

      <div v-if="selectedLoading" class="text-center text-muted py-4">Loading user…</div>
      <div v-if="selectedError" class="alert alert-danger">Failed to load user: {{ selectedError }}</div>

      <div v-if="selected" class="user-panel">
        <div class="d-flex align-items-start justify-content-between mb-3 gap-2">
          <div>
            <h4 class="mb-0">{{ selected.username }}</h4>
            <div class="text-muted" style="font-size:0.85rem;"><code>{{ selected.id }}</code></div>
          </div>
          <button class="btn btn-sm btn-outline-secondary" @click="closeUser">Close</button>
        </div>

        <div v-if="actionMessage" :class="`alert alert-${actionMessageType} py-2`">{{ actionMessage }}</div>

        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="info-row"><span class="info-label">Email</span><span>{{ selected.email || '—' }}</span></div>
            <div class="info-row"><span class="info-label">Email verified</span><span>{{ selected.verifiedEmail ? 'Yes' : 'No' }}</span></div>
            <div class="info-row"><span class="info-label">Role</span><span>{{ permLabel(selected.permLevel) }} ({{ selected.permLevel }})</span></div>
          </div>
          <div class="col-md-6">
            <div class="info-row"><span class="info-label">TOTP enabled</span><span>{{ selected.totpEnabled ? 'Yes' : 'No' }}</span></div>
            <div class="info-row"><span class="info-label">Language</span><span>{{ selected.language || '—' }}</span></div>
            <div class="info-row"><span class="info-label">Password salted</span><span>{{ selected.hasPasswordSalt ? 'Yes' : 'No (pre-migration)' }}</span></div>
          </div>
        </div>

        <h6 class="section-heading">Actions</h6>
        <div class="d-flex flex-wrap gap-2 mb-4">
          <button class="btn btn-sm btn-warning" :disabled="actionBusy" @click="actDisable">Disable account</button>
          <button class="btn btn-sm btn-success" :disabled="actionBusy" @click="actEnable">Enable account</button>
          <button class="btn btn-sm btn-outline-warning" :disabled="actionBusy || !selected.totpEnabled" @click="actDisable2fa">Disable 2FA</button>
          <button class="btn btn-sm btn-outline-primary" :disabled="actionBusy" @click="actToggleAdmin">
            {{ (selected.permLevel ?? 0) >= 2 ? 'Revoke admin' : 'Grant admin' }}
          </button>
          <button class="btn btn-sm btn-outline-info" :disabled="actionBusy" @click="actLoginAs">Login as user</button>
          <button class="btn btn-sm btn-danger ms-auto" :disabled="actionBusy" @click="actDelete">Delete user</button>
        </div>

        <h6 class="section-heading">Change password</h6>
        <form class="row g-2 mb-4" @submit.prevent="actChangePassword">
          <div class="col-md-9">
            <input v-model="passwordInput" type="text" class="form-control dark-input" placeholder="New password" autocomplete="off" />
          </div>
          <div class="col-md-3">
            <button type="submit" class="btn btn-outline-warning w-100" :disabled="actionBusy">Set password</button>
          </div>
        </form>

        <h6 class="section-heading">Passkeys</h6>
        <div v-if="passkeysLoading" class="text-muted" style="font-size:0.9rem;">Loading…</div>
        <div v-else-if="!passkeys || passkeys.length === 0" class="text-muted mb-3" style="font-size:0.9rem;">No passkeys.</div>
        <ul v-else class="list-group list-group-flush mb-3">
          <li v-for="pk in passkeys" :key="pk.name ?? pk" class="list-group-item d-flex justify-content-between align-items-center px-0">
            <span>{{ pk.name ?? pk }}</span>
            <button class="btn btn-sm btn-outline-danger" :disabled="actionBusy" @click="actDeletePasskey(pk.name ?? pk)">Delete</button>
          </li>
        </ul>

        <h6 class="section-heading d-flex justify-content-between align-items-center">
          <span>OAuth Apps</span>
          <button class="btn btn-sm btn-outline-secondary" :disabled="actionBusy" @click="loadUserApps">
            {{ userApps === null ? 'Load apps' : 'Refresh' }}
          </button>
        </h6>
        <div v-if="userAppsLoading" class="text-muted" style="font-size:0.9rem;">Loading…</div>
        <div v-else-if="userApps === null" class="text-muted" style="font-size:0.9rem;">Click "Load apps" to view this user's OAuth applications.</div>
        <div v-else-if="userApps.length === 0" class="text-muted" style="font-size:0.9rem;">This user has no apps.</div>
        <ul v-else class="list-group list-group-flush mb-3">
          <li v-for="a in userApps" :key="a.id" class="list-group-item d-flex justify-content-between align-items-center px-0">
            <div>
              <div>{{ a.name }}</div>
              <code style="font-size:0.75rem;">{{ a.id }}</code>
            </div>
            <button class="btn btn-sm btn-outline-primary" @click="viewAppFromUser(a.id)">Manage</button>
          </li>
        </ul>
      </div>
      </div>

      <!-- APPS TAB -->
      <div v-show="activeTab === 'apps'">
        <div class="d-flex justify-content-end mb-2">
          <button class="btn btn-sm btn-outline-secondary" @click="loadAppStats">Refresh stats</button>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="stat-card">
              <div class="stat-label">Total apps</div>
              <div class="stat-value">{{ appStats ? appStats.totalApps : '—' }}</div>
            </div>
          </div>
          <div v-if="appStatsError" class="col-12">
            <div class="alert alert-danger py-2 mb-0">Failed to load app stats: {{ appStatsError }}</div>
          </div>
        </div>

        <div class="search-card mb-4">
          <h5 class="mb-3">Find app</h5>
          <form class="row g-2 align-items-end" @submit.prevent="runAppSearch">
            <div class="col-md-7">
              <label class="form-label mb-1" style="font-size:0.8rem;">Query (name or ID)</label>
              <input v-model="appQuery" type="text" class="form-control dark-input" placeholder="Leave empty to list apps" />
            </div>
            <div class="col-md-2">
              <label class="form-label mb-1" style="font-size:0.8rem;">Limit</label>
              <input v-model.number="appLimit" type="number" min="1" max="200" class="form-control dark-input" />
            </div>
            <div class="col-md-3">
              <button type="submit" class="btn btn-primary w-100" :disabled="appSearching">
                {{ appSearching ? 'Searching…' : 'Search' }}
              </button>
            </div>
          </form>

          <div v-if="appSearchError" class="alert alert-danger py-2 mt-3 mb-0">Search failed: {{ appSearchError }}</div>

          <div v-if="appResults.length" class="table-responsive mt-3">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Owner ID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in appResults" :key="a.id">
                  <td>
                    <div>{{ a.name }}</div>
                    <div v-if="a.description" class="text-muted-light" style="font-size:0.8rem;">{{ a.description }}</div>
                  </td>
                  <td><code style="font-size:0.78rem;">{{ a.id }}</code></td>
                  <td><code style="font-size:0.78rem;">{{ a.ownerId }}</code></td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary" @click="selectApp(a.id)">Manage</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else-if="!appSearching && !appSearchError" class="text-muted mt-3" style="font-size:0.9rem;">
            No results yet. Run a search above.
          </div>
        </div>

        <div v-if="selectedAppLoading" class="text-center text-muted py-4">Loading app…</div>
        <div v-if="selectedAppError" class="alert alert-danger">Failed to load app: {{ selectedAppError }}</div>

        <div v-if="selectedApp" class="user-panel">
          <div class="d-flex align-items-start justify-content-between mb-3 gap-2">
            <div>
              <h4 class="mb-0">{{ selectedApp.name }}</h4>
              <div class="text-muted" style="font-size:0.85rem;"><code>{{ selectedApp.id }}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="closeApp">Close</button>
          </div>

          <div v-if="actionMessage" :class="`alert alert-${actionMessageType} py-2`">{{ actionMessage }}</div>

          <h6 class="section-heading">Details</h6>
          <form class="row g-3 mb-4" @submit.prevent="actSaveApp">
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Name</label>
              <input v-model="appEdits.name" type="text" class="form-control dark-input" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Owner ID</label>
              <input v-model="appEdits.ownerId" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1" style="font-size:0.8rem;">Description</label>
              <input v-model="appEdits.description" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1" style="font-size:0.8rem;">Redirect URIs (semicolon-separated)</label>
              <input v-model="appEdits.redirectUri" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12 d-flex gap-2">
              <button type="submit" class="btn btn-primary" :disabled="actionBusy">Save changes</button>
            </div>
          </form>

          <h6 class="section-heading">Client secret</h6>
          <div class="d-flex flex-wrap gap-2 align-items-center mb-4">
            <code v-if="showSecret" class="secret-box">{{ selectedApp.clientSecret }}</code>
            <code v-else class="secret-box">••••••••••••••••</code>
            <button class="btn btn-sm btn-outline-secondary" @click="showSecret = !showSecret">
              {{ showSecret ? 'Hide' : 'Show' }}
            </button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="!selectedApp.clientSecret" @click="copySecret">Copy</button>
            <button class="btn btn-sm btn-warning ms-auto" :disabled="actionBusy" @click="actCycleSecret">Cycle secret</button>
          </div>

          <h6 class="section-heading">Danger zone</h6>
          <div class="d-flex">
            <button class="btn btn-sm btn-danger" :disabled="actionBusy" @click="actDeleteApp">Delete app</button>
          </div>
        </div>
      </div>

      <!-- PRODUCTS TAB -->
      <div v-show="activeTab === 'products'">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="text-muted-light" style="font-size:0.9rem;">
            {{ products ? `${products.length} products` : 'Loading…' }}
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" :disabled="productsLoading" @click="loadProducts">Refresh</button>
            <button class="btn btn-sm btn-success" @click="openNewProduct">+ New product</button>
          </div>
        </div>

        <div v-if="productsError" class="alert alert-danger py-2">Failed to load products: {{ productsError }}</div>

        <div v-if="productsLoading" class="text-muted text-center py-4">Loading…</div>
        <div v-else-if="products && products.length === 0 && !productPanelOpen" class="text-muted text-center py-4" style="font-size:0.9rem;">
          No products yet. Click "New product" to create one.
        </div>

        <div v-if="products && products.length" class="row g-3 mb-4">
          <div v-for="p in products" :key="p.id" class="col-md-6">
            <div class="product-card">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="flex-grow-1">
                  <h5 class="mb-1">{{ p.name }}</h5>
                  <code style="font-size:0.78rem;">{{ p.id }}</code>
                  <p v-if="p.description" class="mt-2 mb-0 text-muted-light" style="font-size:0.85rem;">{{ p.description }}</p>
                </div>
              </div>
              <div class="mt-3 d-flex flex-wrap gap-2">
                <span class="badge" :class="p.purchasable ? 'bg-success' : 'bg-secondary'">
                  {{ p.purchasable ? 'Purchasable' : 'Hidden' }}
                </span>
                <span v-if="p.allowAnonymous" class="badge bg-info text-dark">Anonymous OK</span>
                <span class="badge bg-secondary">{{ (p.priceIds?.length ?? 0) }} price(s)</span>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="editProduct(p.id)">Edit</button>
                <button class="btn btn-sm btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteProduct(p.id, p.name)">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Product editor -->
        <div v-if="productPanelOpen" class="user-panel">
          <div class="d-flex align-items-start justify-content-between mb-3 gap-2">
            <div>
              <h4 class="mb-0">{{ editingProduct ? 'Edit product' : 'New product' }}</h4>
              <div v-if="editingProduct" class="text-muted" style="font-size:0.85rem;"><code>{{ editingProduct }}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="closeProductPanel">Close</button>
          </div>

          <div v-if="actionMessage" :class="`alert alert-${actionMessageType} py-2`">{{ actionMessage }}</div>

          <form class="row g-3" @submit.prevent="saveProduct">
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">ID *</label>
              <input v-model="productForm.id" type="text" class="form-control dark-input" :disabled="!!editingProduct" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Name *</label>
              <input v-model="productForm.name" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1" style="font-size:0.8rem;">Description</label>
              <textarea v-model="productForm.description" rows="2" class="form-control dark-input"></textarea>
            </div>

            <div class="col-md-6 d-flex align-items-center gap-2">
              <input id="prod-purchasable" v-model="productForm.purchasable" type="checkbox" class="form-check-input m-0" />
              <label for="prod-purchasable" class="form-label m-0">Purchasable</label>
            </div>
            <div class="col-md-6 d-flex align-items-center gap-2">
              <input id="prod-anon" v-model="productForm.allowAnonymous" type="checkbox" class="form-check-input m-0" />
              <label for="prod-anon" class="form-label m-0">Allow anonymous purchase</label>
            </div>

            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label m-0" style="font-size:0.8rem;">Stripe price IDs</label>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="addPriceId">+ Add</button>
              </div>
              <div v-if="productForm.priceIds.length === 0" class="text-muted-light" style="font-size:0.85rem;">No prices.</div>
              <div v-for="(_, i) in productForm.priceIds" :key="'pid-' + i" class="d-flex gap-2 mb-2">
                <input v-model="productForm.priceIds[i]" type="text" class="form-control dark-input" placeholder="price_..." />
                <button type="button" class="btn btn-sm btn-outline-danger" @click="removePriceId(i)">Remove</button>
              </div>
            </div>

            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label m-0" style="font-size:0.8rem;">Price lookup IDs (key → Stripe price ID)</label>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="addPriceLookup">+ Add</button>
              </div>
              <div v-if="productForm.priceLookupIds.length === 0" class="text-muted-light" style="font-size:0.85rem;">No lookups.</div>
              <div v-for="(entry, i) in productForm.priceLookupIds" :key="'lk-' + i" class="row g-2 mb-2">
                <div class="col-md-5">
                  <input v-model="entry.key" type="text" class="form-control dark-input" placeholder="lookup key" />
                </div>
                <div class="col-md-6">
                  <input v-model="entry.value" type="text" class="form-control dark-input" placeholder="price_..." />
                </div>
                <div class="col-md-1 d-flex">
                  <button type="button" class="btn btn-sm btn-outline-danger w-100" @click="removePriceLookup(i)">×</button>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Success redirect URL</label>
              <input v-model="productForm.successRedirect" type="text" class="form-control dark-input" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Success token secret</label>
              <input v-model="productForm.successTokenSecret" type="text" class="form-control dark-input" autocomplete="off" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Webhook URL</label>
              <input v-model="productForm.webhook" type="text" class="form-control dark-input" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Webhook secret</label>
              <input v-model="productForm.webhookSecret" type="text" class="form-control dark-input" autocomplete="off" />
            </div>

            <div class="col-12 d-flex gap-2">
              <button type="submit" class="btn btn-primary" :disabled="actionBusy">
                {{ editingProduct ? 'Save changes' : 'Create product' }}
              </button>
              <button type="button" class="btn btn-outline-secondary" :disabled="actionBusy" @click="closeProductPanel">Cancel</button>
              <button v-if="editingProduct" type="button" class="btn btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteProduct(editingProduct, productForm.name)">Delete</button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
  color: #e4e4e7;
}
.admin-page :deep(.text-muted) {
  color: #9ca3af !important;
}
.stat-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 16px 18px;
}
.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a1a1aa;
  margin-bottom: 6px;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 600;
  color: #f4f4f5;
}
.search-card, .user-panel {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 20px 22px;
  color: #e4e4e7;
}
.section-heading {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a1a1aa;
  margin-bottom: 10px;
}

/* Dark inputs to match the rest of the site */
.dark-input {
  background-color: rgb(28, 28, 28);
  color: #fff;
  border-color: #444;
}
.dark-input::placeholder {
  color: #666;
}
.dark-input:focus {
  background-color: rgb(28, 28, 28);
  color: #fff;
  border-color: #6ea8fe;
  box-shadow: 0 0 0 0.2rem rgba(110, 168, 254, 0.15);
}

.form-label {
  color: #d4d4d8;
}

/* Table */
.admin-page :deep(.table) {
  --bs-table-bg: transparent;
  --bs-table-color: #e4e4e7;
  --bs-table-striped-color: #e4e4e7;
  --bs-table-striped-bg: rgba(255,255,255,0.03);
  --bs-table-hover-bg: rgba(255,255,255,0.06);
  --bs-table-hover-color: #fff;
  --bs-table-border-color: #27272a;
  color: #e4e4e7;
}
.admin-page :deep(.table thead th) {
  color: #a1a1aa;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom-color: #27272a;
  font-weight: 600;
}
.admin-page :deep(.table code) {
  color: #d4d4d8;
}

.text-muted-light {
  color: #a1a1aa;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #27272a;
  font-size: 0.9rem;
  color: #e4e4e7;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  color: #a1a1aa;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
code { color: #d4d4d8; }

.user-panel :deep(.list-group-item) {
  background: transparent !important;
  color: #e4e4e7;
  border-color: #27272a;
}

/* Tabs */
.admin-tabs {
  border-bottom: 1px solid #27272a;
  gap: 4px;
}
.admin-tabs .nav-link {
  background: none;
  border: none;
  color: #a1a1aa;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  transition: color 0.15s, border-color 0.15s;
}
.admin-tabs .nav-link:hover {
  color: #f4f4f5;
}
.admin-tabs .nav-link.active {
  color: #fff;
  border-bottom-color: #2563eb;
}

.secret-box {
  display: inline-block;
  background: rgb(28, 28, 28);
  border: 1px solid #444;
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 0.85rem;
  color: #d4d4d8;
  word-break: break-all;
  max-width: 100%;
}

/* Product cards */
.product-card {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 16px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  border-color: #3f3f46;
}
.admin-page :deep(.form-check-input) {
  background-color: rgb(28, 28, 28);
  border-color: #444;
}
.admin-page :deep(.form-check-input:checked) {
  background-color: #2563eb;
  border-color: #2563eb;
}
.admin-page textarea.dark-input {
  resize: vertical;
}
</style>
