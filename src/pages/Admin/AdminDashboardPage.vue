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
  adminSetAppOfficial,
  adminListProducts,
  adminGetProduct,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListServices,
  adminGetService,
  adminCreateService,
  adminUpdateService,
  adminDeleteService,
  adminListGroups,
  adminGetGroup,
  adminCreateGroup,
  adminUpdateGroup,
  adminDeleteGroup,
  adminListGroupMembers,
  adminAddGroupMember,
  adminRemoveGroupMember,
  adminGetGroupsByUser,
  adminGetAppClient,
  adminUpdateAppClient,
  adminGetAppAccess,
  adminSetAppAccessPolicy,
  adminSetAppAccessGroups,
  adminSetAppClaimMappings,
} from '@/assets/js/serble.js';
import { setLocalStorage } from '@/assets/js/utils.js';
import OfficialBadge from '@/components/OfficialBadge.vue';

export default {
  components: { OfficialBadge },
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
        loadAppOidc(id);
      } else {
        selectedAppError.value = r.error ?? 'unknown';
      }
    }

    function closeApp() {
      selectedApp.value = null;
      showSecret.value = false;
      appOidcClient.value = null;
      appOidcClientForm.value = { additionalRedirectUris: [], isPublicClient: false, requirePkce: true };
      appAccess.value = null;
      appAccessForm.value = emptyAccessForm();
      claimMappingsForm.value = [];
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

    async function actToggleOfficial() {
      if (!selectedApp.value) return;
      const next = !selectedApp.value.isOfficial;
      const r = await withBusy(
        () => adminSetAppOfficial(selectedApp.value.id, next),
        next ? 'Marked as official' : 'Removed official status'
      );
      if (r?.success && r.app) {
        selectedApp.value = r.app;
        const row = appResults.value.find(x => x.id === r.app.id);
        if (row) row.isOfficial = r.app.isOfficial;
        if (userApps.value) {
          const ua = userApps.value.find(x => x.id === r.app.id);
          if (ua) ua.isOfficial = r.app.isOfficial;
        }
      }
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
        isSubscription: false,
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
        isSubscription: !!p?.isSubscription,
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
        isSubscription: !!f.isSubscription,
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

    // ── OIDC: per-app client config + access policy ──
    const appOidcClient = ref(null);
    const appOidcClientForm = ref({ additionalRedirectUris: [], isPublicClient: false, requirePkce: true });
    const appOidcLoading = ref(false);
    const appOidcError = ref(null);

    function emptyAccessForm() {
      return {
        accessPolicy: 0,
        requiredPermLevel: null,
        allowedGroupIds: [],
        deniedGroupIds: [],
      };
    }

    const appAccess = ref(null);
    const appAccessForm = ref(emptyAccessForm());
    const appAccessLoading = ref(false);
    const appAccessError = ref(null);

    // Local form representation of the groupId→claim string map.
    // Stored as an array of {groupId, value} so v-for keys are stable.
    const claimMappingsForm = ref([]);

    const accessPolicyOptions = [
      { value: 0, label: 'Allow all logged-in users' },
      { value: 1, label: 'Require verified email' },
      { value: 2, label: 'Require membership in an allowed group' },
      { value: 3, label: 'Require minimum permission level' },
      { value: 4, label: 'Disabled (no SSO)' },
    ];

    async function loadAppOidc(appId) {
      appOidcLoading.value = true;
      appOidcError.value = null;
      appAccessLoading.value = true;
      appAccessError.value = null;

      const [clientRes, accessRes] = await Promise.all([
        adminGetAppClient(appId),
        adminGetAppAccess(appId),
      ]);

      appOidcLoading.value = false;
      appAccessLoading.value = false;

      if (clientRes.success) {
        appOidcClient.value = clientRes.client;
        appOidcClientForm.value = {
          additionalRedirectUris: Array.isArray(clientRes.client?.additionalRedirectUris)
            ? [...clientRes.client.additionalRedirectUris]
            : [],
          isPublicClient: !!clientRes.client?.isPublicClient,
          requirePkce: clientRes.client?.requirePkce !== false,
        };
      } else {
        appOidcError.value = clientRes.error ?? 'unknown';
      }

      if (accessRes.success) {
        appAccess.value = accessRes.access;
        appAccessForm.value = {
          accessPolicy: Number(accessRes.access?.accessPolicy ?? 0),
          requiredPermLevel: accessRes.access?.requiredPermLevel ?? null,
          allowedGroupIds: Array.isArray(accessRes.access?.allowedGroupIds) ? [...accessRes.access.allowedGroupIds] : [],
          deniedGroupIds: Array.isArray(accessRes.access?.deniedGroupIds) ? [...accessRes.access.deniedGroupIds] : [],
        };
        const m = accessRes.access?.groupClaimMappings ?? {};
        claimMappingsForm.value = Object.entries(m).map(([groupId, value]) => ({ groupId, value }));
      } else {
        appAccessError.value = accessRes.error ?? 'unknown';
      }
    }

    function addAdditionalRedirect() {
      appOidcClientForm.value.additionalRedirectUris.push('');
    }
    function removeAdditionalRedirect(i) {
      appOidcClientForm.value.additionalRedirectUris.splice(i, 1);
    }

    async function actSaveAppOidcClient() {
      if (!selectedApp.value) return;
      const cleaned = appOidcClientForm.value.additionalRedirectUris
        .map(u => (u ?? '').trim())
        .filter(Boolean);
      const body = {
        additionalRedirectUris: cleaned,
        isPublicClient: !!appOidcClientForm.value.isPublicClient,
        requirePkce: !!appOidcClientForm.value.requirePkce,
      };
      const r = await withBusy(() => adminUpdateAppClient(selectedApp.value.id, body), 'OIDC client config saved');
      if (r?.success && r.client) {
        appOidcClient.value = r.client;
        appOidcClientForm.value = {
          additionalRedirectUris: Array.isArray(r.client?.additionalRedirectUris) ? [...r.client.additionalRedirectUris] : [],
          isPublicClient: !!r.client?.isPublicClient,
          requirePkce: r.client?.requirePkce !== false,
        };
      }
    }

    function toggleAllowedGroup(id) {
      const arr = appAccessForm.value.allowedGroupIds;
      const i = arr.indexOf(id);
      if (i === -1) arr.push(id); else arr.splice(i, 1);
      // If it was in denied, remove from there to keep things tidy
      const dArr = appAccessForm.value.deniedGroupIds;
      const di = dArr.indexOf(id);
      if (di !== -1 && i === -1) dArr.splice(di, 1);
    }

    function toggleDeniedGroup(id) {
      const arr = appAccessForm.value.deniedGroupIds;
      const i = arr.indexOf(id);
      if (i === -1) arr.push(id); else arr.splice(i, 1);
      const aArr = appAccessForm.value.allowedGroupIds;
      const ai = aArr.indexOf(id);
      if (ai !== -1 && i === -1) aArr.splice(ai, 1);
    }

    async function actSaveAccessPolicy() {
      if (!selectedApp.value) return;
      const policy = Number(appAccessForm.value.accessPolicy);
      const permLevel = policy === 3 && appAccessForm.value.requiredPermLevel != null && appAccessForm.value.requiredPermLevel !== ''
        ? Number(appAccessForm.value.requiredPermLevel)
        : null;
      await withBusy(() => adminSetAppAccessPolicy(selectedApp.value.id, policy, permLevel), 'Access policy saved');
      await refreshAppAccess();
    }

    async function actSaveAccessGroups() {
      if (!selectedApp.value) return;
      await withBusy(() => adminSetAppAccessGroups(
        selectedApp.value.id,
        [...appAccessForm.value.allowedGroupIds],
        [...appAccessForm.value.deniedGroupIds],
      ), 'Group access saved');
      await refreshAppAccess();
    }

    function addClaimMapping() {
      claimMappingsForm.value.push({ groupId: '', value: '' });
    }
    function removeClaimMapping(i) {
      claimMappingsForm.value.splice(i, 1);
    }

    async function actSaveClaimMappings() {
      if (!selectedApp.value) return;
      const mappings = {};
      for (const row of claimMappingsForm.value) {
        const k = (row.groupId ?? '').trim();
        const v = (row.value ?? '').trim();
        if (k && v) mappings[k] = v;
      }
      await withBusy(() => adminSetAppClaimMappings(selectedApp.value.id, mappings), 'Claim mappings saved');
      await refreshAppAccess();
    }

    async function refreshAppAccess() {
      if (!selectedApp.value) return;
      const r = await adminGetAppAccess(selectedApp.value.id);
      if (r.success) {
        appAccess.value = r.access;
        appAccessForm.value = {
          accessPolicy: Number(r.access?.accessPolicy ?? 0),
          requiredPermLevel: r.access?.requiredPermLevel ?? null,
          allowedGroupIds: Array.isArray(r.access?.allowedGroupIds) ? [...r.access.allowedGroupIds] : [],
          deniedGroupIds: Array.isArray(r.access?.deniedGroupIds) ? [...r.access.deniedGroupIds] : [],
        };
        const m = r.access?.groupClaimMappings ?? {};
        claimMappingsForm.value = Object.entries(m).map(([groupId, value]) => ({ groupId, value }));
      }
    }

    function policyLabel(value) {
      return accessPolicyOptions.find(o => o.value === Number(value))?.label ?? `Unknown (${value})`;
    }

    function groupNameById(id) {
      const g = (groups.value ?? []).find(x => x.id === id);
      return g ? g.name : id;
    }

    // ── Service catalog management ──
    function emptyService() {
      return {
        id: '',
        name: '',
        description: '',
        url: '',
        iconUrl: '',
        visibilityMode: 'Public',
        allowedGroupIds: [],
        new: false,
      };
    }

    function toServiceForm(service) {
      return {
        id: service?.id ?? '',
        name: service?.name ?? '',
        description: service?.description ?? '',
        url: service?.url ?? '',
        iconUrl: service?.iconUrl ?? '',
        visibilityMode: service?.visibilityMode ?? 'Public',
        allowedGroupIds: Array.isArray(service?.allowedGroupIds) ? [...service.allowedGroupIds] : [],
        new: !!service?.new,
      };
    }

    function isAbsoluteUrl(value) {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }

    const services = ref([]);
    const servicesLoading = ref(false);
    const servicesError = ref(null);
    const serviceForm = ref(emptyService());
    const editingService = ref(null);
    const servicePanelOpen = ref(false);

    async function loadServicesAdmin() {
      servicesLoading.value = true;
      servicesError.value = null;
      const r = await adminListServices();
      servicesLoading.value = false;
      if (r.success) services.value = Array.isArray(r.services) ? r.services : [];
      else {
        services.value = [];
        servicesError.value = r.error ?? 'unknown';
      }
    }

    function openNewService() {
      serviceForm.value = emptyService();
      editingService.value = null;
      servicePanelOpen.value = true;
    }

    async function editService(id) {
      const r = await adminGetService(id);
      if (r.success) {
        serviceForm.value = toServiceForm(r.service);
        editingService.value = id;
        servicePanelOpen.value = true;
      } else {
        flash('Failed to load service: ' + (r.error ?? 'unknown'), 'danger');
      }
    }

    function closeServicePanel() {
      servicePanelOpen.value = false;
      editingService.value = null;
      serviceForm.value = emptyService();
    }

    function toggleServiceAllowedGroup(id) {
      const arr = serviceForm.value.allowedGroupIds;
      const i = arr.indexOf(id);
      if (i === -1) arr.push(id);
      else arr.splice(i, 1);
    }

    async function saveService() {
      const visibilityMode = serviceForm.value.visibilityMode === 'RestrictedToGroups' ? 1 : 0;
      const body = {
        id: serviceForm.value.id.trim(),
        name: serviceForm.value.name.trim(),
        description: serviceForm.value.description.trim(),
        url: serviceForm.value.url.trim(),
        iconUrl: serviceForm.value.iconUrl.trim() || null,
        visibilityMode,
        allowedGroupIds: [...serviceForm.value.allowedGroupIds],
        new: !!serviceForm.value.new,
      };

      if (!body.id) {
        flash('Service ID is required', 'danger');
        return;
      }
      if (!body.name) {
        flash('Service name is required', 'danger');
        return;
      }
      if (!body.url || !isAbsoluteUrl(body.url)) {
        flash('Service URL must be an absolute URL', 'danger');
        return;
      }
      if (body.iconUrl && !isAbsoluteUrl(body.iconUrl)) {
        flash('Icon URL must be an absolute URL', 'danger');
        return;
      }
      if (serviceForm.value.visibilityMode === 'RestrictedToGroups' && body.allowedGroupIds.length === 0) {
        flash('Restricted services need at least one allowed group', 'danger');
        return;
      }
      if (serviceForm.value.visibilityMode !== 'RestrictedToGroups') {
        body.allowedGroupIds = [];
      }

      const r = editingService.value
        ? await withBusy(() => adminUpdateService(editingService.value, body), 'Service saved')
        : await withBusy(() => adminCreateService(body), 'Service created');
      if (r?.success) {
        closeServicePanel();
        loadServicesAdmin();
      }
    }

    async function deleteService(id, name) {
      if (!confirm(`Permanently delete service "${name}" (${id})?`)) return;
      const r = await withBusy(() => adminDeleteService(id), 'Service deleted');
      if (r?.success) {
        if (editingService.value === id) closeServicePanel();
        loadServicesAdmin();
      }
    }

    function serviceVisibilityLabel(service) {
      const mode = service?.visibilityMode ?? serviceForm.value.visibilityMode;
      const groupsCount = service?.allowedGroupIds?.length ?? serviceForm.value.allowedGroupIds.length;
      if (mode === 'RestrictedToGroups') return `Restricted (${groupsCount} group${groupsCount === 1 ? '' : 's'})`;
      return 'Public';
    }

    // ── Groups management ──
    const groups = ref([]);
    const groupsLoading = ref(false);
    const groupsError = ref(null);

    const groupForm = ref({ name: '', description: '' });
    const editingGroupId = ref(null);
    const groupPanelOpen = ref(false);

    const groupMembers = ref([]);
    const groupMembersLoading = ref(false);
    const newMemberId = ref('');
    const memberDetails = ref({}); // userId -> {username, email}

    async function loadGroups() {
      groupsLoading.value = true;
      groupsError.value = null;
      const r = await adminListGroups();
      groupsLoading.value = false;
      if (r.success) groups.value = Array.isArray(r.groups) ? r.groups : [];
      else { groups.value = []; groupsError.value = r.error ?? 'unknown'; }
    }

    function openNewGroup() {
      groupForm.value = { name: '', description: '' };
      editingGroupId.value = null;
      groupMembers.value = [];
      memberDetails.value = {};
      groupPanelOpen.value = true;
    }

    async function openEditGroup(id) {
      const r = await adminGetGroup(id);
      if (!r.success) {
        flash('Failed to load group: ' + (r.error ?? 'unknown'), 'danger');
        return;
      }
      groupForm.value = {
        name: r.group?.name ?? '',
        description: r.group?.description ?? '',
      };
      editingGroupId.value = id;
      groupPanelOpen.value = true;
      loadGroupMembers(id);
    }

    function closeGroupPanel() {
      groupPanelOpen.value = false;
      editingGroupId.value = null;
      groupForm.value = { name: '', description: '' };
      groupMembers.value = [];
      memberDetails.value = {};
      newMemberId.value = '';
    }

    async function saveGroup() {
      if (!groupForm.value.name?.trim()) {
        flash('Group name is required', 'danger');
        return;
      }
      const body = {
        name: groupForm.value.name.trim(),
        description: groupForm.value.description ?? '',
      };
      const r = editingGroupId.value
        ? await withBusy(() => adminUpdateGroup(editingGroupId.value, body), 'Group saved')
        : await withBusy(() => adminCreateGroup(body.name, body.description), 'Group created');
      if (r?.success) {
        if (!editingGroupId.value && r.group?.id) {
          editingGroupId.value = r.group.id;
          loadGroupMembers(r.group.id);
        }
        loadGroups();
      }
    }

    async function deleteGroup(id, name) {
      if (!confirm(`Permanently delete group "${name}" (${id})?`)) return;
      const r = await withBusy(() => adminDeleteGroup(id), 'Group deleted');
      if (r?.success) {
        if (editingGroupId.value === id) closeGroupPanel();
        loadGroups();
      }
    }

    async function loadGroupMembers(id) {
      groupMembersLoading.value = true;
      const r = await adminListGroupMembers(id);
      groupMembersLoading.value = false;
      if (r.success) {
        const members = Array.isArray(r.members) ? r.members : [];
        groupMembers.value = members;
        // Resolve usernames lazily and best-effort.
        for (const userId of members) {
          if (!memberDetails.value[userId]) {
            adminGetUser(userId).then(ur => {
              if (ur.success) {
                memberDetails.value[userId] = {
                  username: ur.user?.username ?? '',
                  email: ur.user?.email ?? '',
                };
              }
            });
          }
        }
      } else {
        groupMembers.value = [];
      }
    }

    async function addGroupMember() {
      if (!editingGroupId.value) return;
      const uid = (newMemberId.value ?? '').trim();
      if (!uid) {
        flash('Enter a user ID', 'danger');
        return;
      }
      const r = await withBusy(() => adminAddGroupMember(editingGroupId.value, uid), 'Member added');
      if (r?.success) {
        newMemberId.value = '';
        loadGroupMembers(editingGroupId.value);
      }
    }

    async function removeGroupMember(userId) {
      if (!editingGroupId.value) return;
      if (!confirm(`Remove user ${userId} from this group?`)) return;
      const r = await withBusy(() => adminRemoveGroupMember(editingGroupId.value, userId), 'Member removed');
      if (r?.success) loadGroupMembers(editingGroupId.value);
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
      loadServicesAdmin();
      loadGroups();
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
      actSaveApp, actDeleteApp, actCycleSecret, actToggleOfficial, copySecret,
      loadUserApps, viewAppFromUser,
      products, productsLoading, productsError, productForm, editingProduct, productPanelOpen,
      loadProducts, openNewProduct, editProduct, closeProductPanel,
      addPriceId, removePriceId, addPriceLookup, removePriceLookup,
      saveProduct, deleteProduct,
      services, servicesLoading, servicesError, serviceForm, editingService, servicePanelOpen,
      loadServicesAdmin, openNewService, editService, closeServicePanel,
      toggleServiceAllowedGroup, saveService, deleteService, serviceVisibilityLabel,
      // OIDC client config + access policy
      appOidcClient, appOidcClientForm, appOidcLoading, appOidcError,
      addAdditionalRedirect, removeAdditionalRedirect, actSaveAppOidcClient,
      appAccess, appAccessForm, appAccessLoading, appAccessError,
      claimMappingsForm, accessPolicyOptions,
      toggleAllowedGroup, toggleDeniedGroup,
      actSaveAccessPolicy, actSaveAccessGroups, actSaveClaimMappings,
      addClaimMapping, removeClaimMapping, policyLabel, groupNameById,
      // Groups
      groups, groupsLoading, groupsError,
      groupForm, editingGroupId, groupPanelOpen,
      groupMembers, groupMembersLoading, newMemberId, memberDetails,
      loadGroups, openNewGroup, openEditGroup, closeGroupPanel,
      saveGroup, deleteGroup, addGroupMember, removeGroupMember,
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
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'groups' }" @click="activeTab = 'groups'">Groups</button>
        </li>
        <li class="nav-item">
          <button class="nav-link" :class="{ active: activeTab === 'services' }" @click="activeTab = 'services'">Services</button>
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
                    <div>
                      {{ a.name }}
                      <OfficialBadge v-if="a.isOfficial" class="ms-1" />
                    </div>
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
              <h4 class="mb-0">
                {{ selectedApp.name }}
                <OfficialBadge v-if="selectedApp.isOfficial" class="ms-2" />
              </h4>
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

          <h6 class="section-heading">Official app</h6>
          <div class="d-flex flex-wrap gap-2 align-items-center mb-4">
            <div class="form-check form-switch m-0">
              <input
                id="officialToggle"
                class="form-check-input"
                type="checkbox"
                role="switch"
                :checked="selectedApp.isOfficial"
                :disabled="actionBusy"
                @change="actToggleOfficial"
              />
              <label class="form-check-label" for="officialToggle" style="font-size:0.9rem;">
                Mark this as an official (first-party) app
              </label>
            </div>
            <span v-if="selectedApp.isOfficial" class="ms-auto">
              <OfficialBadge />
            </span>
          </div>

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

          <!-- ── OIDC Client Config ── -->
          <hr class="my-4 oidc-sep" />
          <h6 class="section-heading">OIDC Client Configuration</h6>
          <div v-if="appOidcLoading" class="text-muted" style="font-size:0.9rem;">Loading…</div>
          <div v-else-if="appOidcError" class="alert alert-danger py-2">Failed to load OIDC config: {{ appOidcError }}</div>
          <form v-else class="row g-3 mb-4" @submit.prevent="actSaveAppOidcClient">
            <div class="col-12">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label m-0" style="font-size:0.8rem;">Additional Redirect URIs (OIDC callbacks, exact match)</label>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="addAdditionalRedirect">+ Add</button>
              </div>
              <div v-if="appOidcClientForm.additionalRedirectUris.length === 0" class="text-muted-light" style="font-size:0.85rem;">
                No additional redirect URIs.
              </div>
              <div v-for="(_, i) in appOidcClientForm.additionalRedirectUris" :key="'ari-'+i" class="d-flex gap-2 mb-2">
                <input v-model="appOidcClientForm.additionalRedirectUris[i]" type="text" class="form-control dark-input" placeholder="https://app.example.com/callback" />
                <button type="button" class="btn btn-sm btn-outline-danger" @click="removeAdditionalRedirect(i)">Remove</button>
              </div>
            </div>

            <div class="col-md-6 d-flex align-items-center gap-2">
              <input id="oidc-public" v-model="appOidcClientForm.isPublicClient" type="checkbox" class="form-check-input m-0" />
              <label for="oidc-public" class="form-label m-0">Public client (no client secret, PKCE-only)</label>
            </div>
            <div class="col-md-6 d-flex align-items-center gap-2">
              <input id="oidc-pkce" v-model="appOidcClientForm.requirePkce" type="checkbox" class="form-check-input m-0" />
              <label for="oidc-pkce" class="form-label m-0">Require PKCE</label>
            </div>

            <div class="col-12">
              <button type="submit" class="btn btn-primary" :disabled="actionBusy">Save OIDC config</button>
            </div>
          </form>

          <!-- ── Access Policy ── -->
          <hr class="my-4 oidc-sep" />
          <h6 class="section-heading">Access Policy (login gate)</h6>
          <div v-if="appAccessLoading" class="text-muted" style="font-size:0.9rem;">Loading…</div>
          <div v-else-if="appAccessError" class="alert alert-danger py-2">Failed to load access policy: {{ appAccessError }}</div>
          <template v-else>
            <form class="row g-3 mb-4" @submit.prevent="actSaveAccessPolicy">
              <div class="col-md-8">
                <label class="form-label mb-1" style="font-size:0.8rem;">Who may sign in to this app?</label>
                <select v-model.number="appAccessForm.accessPolicy" class="form-control dark-input">
                  <option v-for="opt in accessPolicyOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="col-md-4" v-if="Number(appAccessForm.accessPolicy) === 3">
                <label class="form-label mb-1" style="font-size:0.8rem;">Required permission level</label>
                <input v-model.number="appAccessForm.requiredPermLevel" type="number" min="0" class="form-control dark-input" placeholder="e.g. 2 for admin" />
              </div>
              <div class="col-12">
                <button type="submit" class="btn btn-primary" :disabled="actionBusy">Save access policy</button>
              </div>
            </form>

            <!-- Allowed/Denied groups -->
            <div class="mb-4">
              <label class="form-label mb-2" style="font-size:0.8rem;">
                Group access
                <span class="text-muted-light" style="text-transform:none; letter-spacing:0; font-weight:400;">
                  — denied always overrides allowed. Allowed list only used when policy is "Require membership in an allowed group".
                </span>
              </label>
              <div v-if="!groups || groups.length === 0" class="text-muted-light" style="font-size:0.85rem;">
                No groups defined. Create some in the Groups tab.
              </div>
              <table v-else class="table align-middle mb-2">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th class="text-center">Allowed</th>
                    <th class="text-center">Denied</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="g in groups" :key="g.id">
                    <td>
                      <div>{{ g.name }}</div>
                      <code style="font-size:0.75rem;">{{ g.id }}</code>
                    </td>
                    <td class="text-center">
                      <input
                        type="checkbox"
                        class="form-check-input m-0"
                        :checked="appAccessForm.allowedGroupIds.includes(g.id)"
                        @change="toggleAllowedGroup(g.id)"
                      />
                    </td>
                    <td class="text-center">
                      <input
                        type="checkbox"
                        class="form-check-input m-0"
                        :checked="appAccessForm.deniedGroupIds.includes(g.id)"
                        @change="toggleDeniedGroup(g.id)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <button class="btn btn-primary" :disabled="actionBusy" @click="actSaveAccessGroups">Save group access</button>
            </div>

            <!-- Claim mappings -->
            <div class="mb-2">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label m-0" style="font-size:0.8rem;">
                  Group claim mappings
                  <span class="text-muted-light" style="text-transform:none; letter-spacing:0; font-weight:400;">
                    — what value the app sees in the <code>groups</code> claim for users in each Serble group.
                  </span>
                </label>
                <button type="button" class="btn btn-sm btn-outline-secondary" @click="addClaimMapping">+ Add</button>
              </div>
              <div v-if="claimMappingsForm.length === 0" class="text-muted-light mb-2" style="font-size:0.85rem;">
                No mappings. Apps will see no <code>groups</code> claim values for this user.
              </div>
              <div v-for="(row, i) in claimMappingsForm" :key="'cm-'+i" class="row g-2 mb-2">
                <div class="col-md-6">
                  <select v-model="row.groupId" class="form-control dark-input">
                    <option value="" disabled>Choose a group…</option>
                    <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }} ({{ g.id }})</option>
                  </select>
                </div>
                <div class="col-md-5">
                  <input v-model="row.value" type="text" class="form-control dark-input" placeholder="claim value, e.g. admins" />
                </div>
                <div class="col-md-1 d-flex">
                  <button type="button" class="btn btn-sm btn-outline-danger w-100" @click="removeClaimMapping(i)">×</button>
                </div>
              </div>
              <button class="btn btn-primary mt-2" :disabled="actionBusy" @click="actSaveClaimMappings">Save claim mappings</button>
            </div>
          </template>
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
                <span v-if="p.isSubscription" class="badge bg-primary">Subscription</span>
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
            <div class="col-md-6 d-flex align-items-center gap-2">
              <input id="prod-subscription" v-model="productForm.isSubscription" type="checkbox" class="form-check-input m-0" />
              <label for="prod-subscription" class="form-label m-0">Subscription</label>
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

      <!-- SERVICES TAB -->
      <div v-show="activeTab === 'services'">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="text-muted-light" style="font-size:0.9rem;">
            {{ services ? `${services.length} services` : 'Loading…' }}
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" :disabled="servicesLoading" @click="loadServicesAdmin">Refresh</button>
            <button class="btn btn-sm btn-success" @click="openNewService">+ New service</button>
          </div>
        </div>

        <div v-if="servicesError" class="alert alert-danger py-2">Failed to load services: {{ servicesError }}</div>

        <div v-if="servicesLoading" class="text-muted text-center py-4">Loading…</div>
        <div v-else-if="services && services.length === 0 && !servicePanelOpen" class="text-muted text-center py-4" style="font-size:0.9rem;">
          No services yet. Click "New service" to create one.
        </div>

        <div v-if="services && services.length" class="row g-3 mb-4">
          <div v-for="service in services" :key="service.id" class="col-md-6">
            <div class="product-card">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="flex-grow-1">
                  <h5 class="mb-1">{{ service.name }}</h5>
                  <code style="font-size:0.78rem;">{{ service.id }}</code>
                  <p v-if="service.description" class="mt-2 mb-0 text-muted-light" style="font-size:0.85rem;">{{ service.description }}</p>
                </div>
              </div>
              <div class="mt-3 d-flex flex-wrap gap-2">
                <span v-if="service.new" class="badge bg-info text-dark">New</span>
                <span class="badge" :class="service.visibilityMode === 'RestrictedToGroups' ? 'bg-warning text-dark' : 'bg-success'">
                  {{ serviceVisibilityLabel(service) }}
                </span>
                <span class="badge bg-secondary text-wrap">{{ service.url }}</span>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="editService(service.id)">Edit</button>
                <button class="btn btn-sm btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteService(service.id, service.name)">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="servicePanelOpen" class="user-panel">
          <div class="d-flex align-items-start justify-content-between mb-3 gap-2">
            <div>
              <h4 class="mb-0">{{ editingService ? 'Edit service' : 'New service' }}</h4>
              <div v-if="editingService" class="text-muted" style="font-size:0.85rem;"><code>{{ editingService }}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="closeServicePanel">Close</button>
          </div>

          <div v-if="actionMessage" :class="`alert alert-${actionMessageType} py-2`">{{ actionMessage }}</div>

          <form class="row g-3 mb-4" @submit.prevent="saveService">
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">ID *</label>
              <input v-model="serviceForm.id" type="text" class="form-control dark-input" :disabled="!!editingService" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Name *</label>
              <input v-model="serviceForm.name" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1" style="font-size:0.8rem;">Description</label>
              <textarea v-model="serviceForm.description" rows="2" class="form-control dark-input"></textarea>
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Service URL *</label>
              <input v-model="serviceForm.url" type="text" class="form-control dark-input" placeholder="https://service.example.com" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Icon URL</label>
              <input v-model="serviceForm.iconUrl" type="text" class="form-control dark-input" placeholder="https://service.example.com/icon.png" />
            </div>
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Visibility</label>
              <select v-model="serviceForm.visibilityMode" class="form-control dark-input">
                <option value="Public">Public</option>
                <option value="RestrictedToGroups">Restricted to groups</option>
              </select>
            </div>
            <div class="col-md-6 d-flex align-items-end">
              <div class="form-check">
                <input id="service-new" v-model="serviceForm.new" type="checkbox" class="form-check-input" />
                <label for="service-new" class="form-check-label" style="font-size:0.85rem;">Mark as new</label>
              </div>
            </div>
            <div v-if="serviceForm.visibilityMode === 'RestrictedToGroups'" class="col-12">
              <label class="form-label mb-2" style="font-size:0.8rem;">Allowed groups</label>
              <div v-if="!groups || groups.length === 0" class="text-muted-light" style="font-size:0.85rem;">
                No groups defined. Create some in the Groups tab.
              </div>
              <table v-else class="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th class="text-center">Allowed</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="g in groups" :key="g.id">
                    <td>
                      <div>{{ g.name }}</div>
                      <code style="font-size:0.75rem;">{{ g.id }}</code>
                    </td>
                    <td class="text-center">
                      <input
                        type="checkbox"
                        class="form-check-input m-0"
                        :checked="serviceForm.allowedGroupIds.includes(g.id)"
                        @change="toggleServiceAllowedGroup(g.id)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="col-12 d-flex gap-2">
              <button type="submit" class="btn btn-primary" :disabled="actionBusy">
                {{ editingService ? 'Save changes' : 'Create service' }}
              </button>
              <button type="button" class="btn btn-outline-secondary" :disabled="actionBusy" @click="closeServicePanel">Cancel</button>
              <button v-if="editingService" type="button" class="btn btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteService(editingService, serviceForm.name)">Delete</button>
            </div>
          </form>
        </div>
      </div>

      <!-- GROUPS TAB -->
      <div v-show="activeTab === 'groups'">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="text-muted-light" style="font-size:0.9rem;">
            {{ groups ? `${groups.length} groups` : 'Loading…' }}
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-secondary" :disabled="groupsLoading" @click="loadGroups">Refresh</button>
            <button class="btn btn-sm btn-success" @click="openNewGroup">+ New group</button>
          </div>
        </div>

        <div v-if="groupsError" class="alert alert-danger py-2">Failed to load groups: {{ groupsError }}</div>

        <div v-if="groupsLoading" class="text-muted text-center py-4">Loading…</div>
        <div v-else-if="groups && groups.length === 0 && !groupPanelOpen" class="text-muted text-center py-4" style="font-size:0.9rem;">
          No groups yet. Click "New group" to create one.
        </div>

        <div v-if="groups && groups.length" class="row g-3 mb-4">
          <div v-for="g in groups" :key="g.id" class="col-md-6">
            <div class="product-card">
              <div class="d-flex align-items-start justify-content-between gap-2">
                <div class="flex-grow-1">
                  <h5 class="mb-1">{{ g.name }}</h5>
                  <code style="font-size:0.78rem;">{{ g.id }}</code>
                  <p v-if="g.description" class="mt-2 mb-0 text-muted-light" style="font-size:0.85rem;">{{ g.description }}</p>
                </div>
              </div>
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="openEditGroup(g.id)">Manage</button>
                <button class="btn btn-sm btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteGroup(g.id, g.name)">Delete</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Group editor -->
        <div v-if="groupPanelOpen" class="user-panel">
          <div class="d-flex align-items-start justify-content-between mb-3 gap-2">
            <div>
              <h4 class="mb-0">{{ editingGroupId ? 'Edit group' : 'New group' }}</h4>
              <div v-if="editingGroupId" class="text-muted" style="font-size:0.85rem;"><code>{{ editingGroupId }}</code></div>
            </div>
            <button class="btn btn-sm btn-outline-secondary" @click="closeGroupPanel">Close</button>
          </div>

          <div v-if="actionMessage" :class="`alert alert-${actionMessageType} py-2`">{{ actionMessage }}</div>

          <form class="row g-3 mb-4" @submit.prevent="saveGroup">
            <div class="col-md-6">
              <label class="form-label mb-1" style="font-size:0.8rem;">Name *</label>
              <input v-model="groupForm.name" type="text" class="form-control dark-input" />
            </div>
            <div class="col-12">
              <label class="form-label mb-1" style="font-size:0.8rem;">Description</label>
              <textarea v-model="groupForm.description" rows="2" class="form-control dark-input"></textarea>
            </div>
            <div class="col-12 d-flex gap-2">
              <button type="submit" class="btn btn-primary" :disabled="actionBusy">
                {{ editingGroupId ? 'Save changes' : 'Create group' }}
              </button>
              <button type="button" class="btn btn-outline-secondary" :disabled="actionBusy" @click="closeGroupPanel">Cancel</button>
              <button v-if="editingGroupId" type="button" class="btn btn-outline-danger ms-auto" :disabled="actionBusy" @click="deleteGroup(editingGroupId, groupForm.name)">Delete</button>
            </div>
          </form>

          <template v-if="editingGroupId">
            <h6 class="section-heading">Members</h6>
            <form class="row g-2 mb-3" @submit.prevent="addGroupMember">
              <div class="col-md-9">
                <input v-model="newMemberId" type="text" class="form-control dark-input" placeholder="Add user by ID" autocomplete="off" />
              </div>
              <div class="col-md-3">
                <button type="submit" class="btn btn-outline-primary w-100" :disabled="actionBusy">Add member</button>
              </div>
            </form>
            <div v-if="groupMembersLoading" class="text-muted" style="font-size:0.9rem;">Loading…</div>
            <div v-else-if="groupMembers.length === 0" class="text-muted" style="font-size:0.9rem;">No members.</div>
            <ul v-else class="list-group list-group-flush mb-3">
              <li v-for="uid in groupMembers" :key="uid" class="list-group-item d-flex justify-content-between align-items-center px-0">
                <div>
                  <div v-if="memberDetails[uid]?.username">
                    {{ memberDetails[uid].username }}
                    <span v-if="memberDetails[uid].email" class="text-muted-light" style="font-size:0.8rem;">— {{ memberDetails[uid].email }}</span>
                  </div>
                  <code style="font-size:0.75rem;">{{ uid }}</code>
                </div>
                <button class="btn btn-sm btn-outline-danger" :disabled="actionBusy" @click="removeGroupMember(uid)">Remove</button>
              </li>
            </ul>
          </template>
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
}
.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--text);
}
.search-card, .user-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 20px 22px;
  color: #e4e4e7;
}
.section-heading {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
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
  color: var(--text-secondary);
}

/* Table */
.admin-page :deep(.table) {
  --bs-table-bg: transparent;
  --bs-table-color: #e4e4e7;
  --bs-table-striped-color: #e4e4e7;
  --bs-table-striped-bg: rgba(255,255,255,0.03);
  --bs-table-hover-bg: rgba(255,255,255,0.06);
  --bs-table-hover-color: #fff;
  --bs-table-border-color: var(--border);
  color: #e4e4e7;
}
.admin-page :deep(.table thead th) {
  color: var(--text-muted);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom-color: var(--border);
  font-weight: 600;
}
.admin-page :deep(.table code) {
  color: var(--text-secondary);
}

.text-muted-light {
  color: var(--text-muted);
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.9rem;
  color: #e4e4e7;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
code { color: var(--text-secondary); }

.user-panel :deep(.list-group-item) {
  background: transparent !important;
  color: #e4e4e7;
  border-color: var(--border);
}

/* Tabs */
.admin-tabs {
  border-bottom: 1px solid var(--border);
  gap: 4px;
}
.admin-tabs .nav-link {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  transition: color 0.15s, border-color 0.15s;
}
.admin-tabs .nav-link:hover {
  color: var(--text);
}
.admin-tabs .nav-link.active {
  color: #fff;
  border-bottom-color: var(--accent);
}

.secret-box {
  display: inline-block;
  background: rgb(28, 28, 28);
  border: 1px solid #444;
  border-radius: 5px;
  padding: 6px 10px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  word-break: break-all;
  max-width: 100%;
}

/* Product cards */
.product-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.product-card:hover {
  border-color: var(--border-strong);
}
.admin-page :deep(.form-check-input) {
  background-color: rgb(28, 28, 28);
  border-color: #444;
}
.admin-page :deep(.form-check-input:checked) {
  background-color: var(--accent);
  border-color: var(--accent);
}
.admin-page textarea.dark-input {
  resize: vertical;
}
.oidc-sep {
  border: 0;
  border-top: 1px solid var(--border);
}
</style>
