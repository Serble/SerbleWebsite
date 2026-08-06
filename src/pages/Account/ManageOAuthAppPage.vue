<script>
import { computed, inject, ref, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ensureLoggedIn } from '@/assets/js/utils.js';
import { FEATURES } from '@/assets/js/featureFlags.js';
import {
  getOAuthApp, editOAuthApp, deleteOAuthApp,
  getAppKeys, createAppKey, deleteAppKey,
  getAppBalance, getBalance, depositToApp, withdrawFromApp,
  adminGetAppTaxTarget, adminSetAppTaxTarget,
} from '@/assets/js/serble.js';
import { isValidCoinAmount, isNonNegativeCoinAmount, parseCoinsToRaw, formatCoinsPlain } from '@/assets/js/coins.js';
import CoinIcon from '@/components/CoinIcon.vue';
import CoinAmount from '@/components/CoinAmount.vue';
import LoadingBlock from '@/components/LoadingBlock.vue';
import OfficialBadge from '@/components/OfficialBadge.vue';
import AppWebhooksPanel from '@/components/AppWebhooksPanel.vue';

export default {
  components: { CoinIcon, CoinAmount, LoadingBlock, OfficialBadge, AppWebhooksPanel },
  setup() {
    ensureLoggedIn();

    const router = useRouter();
    const route = useRoute();
    const featureStore = inject('featureStore');
    const userStore = inject('userStore');
    const economyEnabled = computed(() => featureStore?.isEnabled(FEATURES.ECONOMY) === true);
    // The tax target is an admin-only setting, and the only endpoint for it that a user token can
    // reach is the admin one — so the panel appears only for admins.
    const isAdmin = computed(() => (userStore?.state?.user?.permLevel ?? 0) >= 2);

    const appId = ref('');
    const app = ref(null);
    const loading = ref(true);

    // ── Tabs ──
    // The active tab lives in the URL so a refresh, a bookmark or a shared link all land in the
    // same place. Webhooks and economy are switched off with the economy flag — while it's off
    // those tabs aren't rendered at all, so nothing hints at a section the server won't serve.
    // Webhooks only carry tax events for now, so there's nothing to show without the economy.
    const tabs = computed(() => [
      { id: 'overview', label: 'overview' },
      { id: 'settings', label: 'settings' },
      { id: 'keys', label: 'api-keys' },
      ...(economyEnabled.value ? [
        { id: 'webhooks', label: 'webhooks' },
        { id: 'economy', label: 'economy' },
      ] : []),
      { id: 'danger', label: 'danger-zone', danger: true },
    ]);
    const activeTab = ref('overview');

    function isValidTab(id) {
      return tabs.value.some(t => t.id === id);
    }

    // The webhook panel fetches on mount, so it's only created once its tab has been opened —
    // after that it stays mounted so flipping between tabs doesn't refetch.
    const webhooksOpened = ref(false);

    // A tab asked for by the URL that isn't available yet (the webhooks and economy tabs only
    // exist once the economy flag has loaded). Honoured as soon as it appears, unless the user
    // has moved on.
    let pendingTab = null;

    function openTab(id) {
      activeTab.value = id;
      if (id === 'webhooks') webhooksOpened.value = true;
    }

    function selectTab(id) {
      pendingTab = null;
      if (!isValidTab(id) || activeTab.value === id) return;
      openTab(id);
      router.replace({ path: route.path, query: { ...route.query, tab: id } });
    }

    watch(tabs, () => {
      if (pendingTab && isValidTab(pendingTab)) {
        openTab(pendingTab);
        pendingTab = null;
        return;
      }
      // The economy and webhooks tabs disappear when the flag goes off — don't strand the user.
      if (!isValidTab(activeTab.value)) selectTab('overview');
    });

    // ── Copy feedback (shared by the id / secret chips) ──
    const copied = ref(null);
    let copyTimer = null;

    async function copy(value, key) {
      if (!value) return false;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        return false;
      }
      copied.value = key;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied.value = null; }, 2000);
      return true;
    }

    const secretVisible = ref(false);
    const maskedSecret = computed(() => '•'.repeat(Math.min(app.value?.clientSecret?.length ?? 24, 36)));

    function formatDate(value) {
      if (!value) return '—';
      const d = new Date(value);
      // Apps created before the model tracked a date come back as DateTime.MinValue.
      if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—';
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // ── Settings form ──
    const name = ref('');
    const description = ref('');
    const redirectUris = ref([]);
    const newUri = ref('');
    const saving = ref(false);
    const formError = ref('');
    const formSuccess = ref(false);

    const dirty = computed(() => {
      if (!app.value) return false;
      return name.value.trim() !== app.value.name
        || description.value.trim() !== app.value.description
        || redirectUris.value.join(';') !== app.value.redirectUris.join(';');
    });

    function resetForm() {
      name.value = app.value?.name ?? '';
      description.value = app.value?.description ?? '';
      redirectUris.value = [...(app.value?.redirectUris ?? [])];
      newUri.value = '';
      formError.value = '';
    }

    function addUri() {
      const trimmed = newUri.value.trim();
      if (trimmed && !redirectUris.value.includes(trimmed)) {
        redirectUris.value.push(trimmed);
        formSuccess.value = false;
      }
      newUri.value = '';
    }

    function removeUri(index) {
      redirectUris.value.splice(index, 1);
      formSuccess.value = false;
    }

    async function submit() {
      formError.value = '';
      formSuccess.value = false;
      if (!app.value) {
        formError.value = 'try-again-in-5';
        return;
      }
      if (!name.value.trim()) {
        formError.value = 'app-name-required';
        return;
      }

      const edits = [];
      if (name.value.trim() !== app.value.name) {
        edits.push({ field: 'name', newValue: name.value.trim() });
      }
      if (description.value.trim() !== app.value.description) {
        edits.push({ field: 'description', newValue: description.value.trim() });
      }
      const newRawUri = redirectUris.value.join(';');
      if (newRawUri !== app.value.redirectUri) {
        edits.push({ field: 'redirect_uri', newValue: newRawUri });
      }
      if (edits.length === 0) return;

      saving.value = true;
      const result = await editOAuthApp(app.value.id, edits);
      saving.value = false;
      if (!result.success) {
        formError.value = 'try-again-in-5';
        return;
      }

      // Stay on the page — the app the user is managing hasn't changed, only its details.
      app.value = {
        ...app.value,
        name: name.value.trim(),
        description: description.value.trim(),
        redirectUri: newRawUri,
        redirectUris: [...redirectUris.value],
      };
      formSuccess.value = true;
    }

    // ── API keys ──
    const keys = ref(null);
    const keysLoading = ref(false);
    const keysError = ref(false);
    const newKeyName = ref('');
    const creatingKey = ref(false);
    const revealedKey = ref(null); // { name, key }
    const keyMessage = ref('');
    const keyMessageError = ref(false);

    function sayKey(text, isError = false) {
      keyMessage.value = text;
      keyMessageError.value = isError;
    }

    async function loadKeys() {
      keysLoading.value = true;
      keysError.value = false;
      const r = await getAppKeys(appId.value);
      keysLoading.value = false;
      if (r.success) keys.value = r.keys ?? [];
      else keysError.value = true;
    }

    async function createKey() {
      sayKey('');
      const trimmed = newKeyName.value.trim();
      if (!trimmed) return sayKey('enter-key-name', true);
      if (trimmed.length > 128) return sayKey('key-name-too-long', true);

      creatingKey.value = true;
      const r = await createAppKey(appId.value, trimmed);
      creatingKey.value = false;
      if (r.success) {
        revealedKey.value = { name: r.key?.name ?? trimmed, key: r.key?.key ?? '' };
        newKeyName.value = '';
        await loadKeys();
      } else {
        sayKey(r.error === 403 ? 'app-not-owned' : 'create-key-failed', true);
      }
    }

    const pendingKeyRevoke = ref(null);

    async function confirmRevokeKey(keyId) {
      pendingKeyRevoke.value = null;
      const r = await deleteAppKey(appId.value, keyId);
      if (r.success) await loadKeys();
      else sayKey('revoke-key-failed', true);
    }

    async function copyKey() {
      const ok = await copy(revealedKey.value?.key, 'apikey');
      sayKey(ok ? 'key-copied' : 'copy-failed', !ok);
    }

    // ── App balance ──
    // Two balances are in play: the app's and the owner's own. Both are shown, because every
    // move here is between exactly those two.
    const balanceCoins = ref(null);
    const userCoins = ref(null);
    const balanceLoading = ref(false);
    const balanceError = ref(false);

    async function loadBalance() {
      balanceLoading.value = true;
      balanceError.value = false;
      const [appResult, userResult] = await Promise.all([getAppBalance(appId.value), getBalance()]);
      balanceLoading.value = false;
      if (appResult.success) balanceCoins.value = String(appResult.balance?.coins ?? '0');
      else balanceError.value = true;
      if (userResult.success) userCoins.value = String(userResult.balance?.coins ?? '0');
    }

    // ── Moving coins between the owner and the app ──
    const transferDirection = ref('deposit');
    const transferAmount = ref('');
    const transferNote = ref('');
    const transferring = ref(false);
    const transferMsg = ref('');      // i18n key
    const transferRaw = ref('');      // plain text straight from the API, when it explained itself
    const transferOk = ref(false);

    function sayTransfer(key, raw = '', ok = false) {
      transferMsg.value = key;
      transferRaw.value = raw;
      transferOk.value = ok;
    }

    function setDirection(direction) {
      transferDirection.value = direction;
      sayTransfer('');
    }

    async function submitTransfer() {
      sayTransfer('');
      const amount = transferAmount.value.trim();
      if (!isValidCoinAmount(amount)) {
        sayTransfer('enter-amount');
        return;
      }

      const depositing = transferDirection.value === 'deposit';
      const move = depositing ? depositToApp : withdrawFromApp;
      transferring.value = true;
      const r = await move(appId.value, parseCoinsToRaw(amount), transferNote.value.trim());
      transferring.value = false;

      if (!r.success) {
        // 400s carry a specific reason (insufficient funds, overflow) written for the caller.
        sayTransfer(r.error === 400 && r.message ? '' : 'transfer-failed', r.error === 400 ? r.message : '');
        return;
      }

      if (r.data?.appCoins != null) balanceCoins.value = String(r.data.appCoins);
      if (r.data?.userCoins != null) userCoins.value = String(r.data.userCoins);
      transferAmount.value = '';
      transferNote.value = '';
      sayTransfer(depositing ? 'deposit-success' : 'withdraw-success', '', true);
    }

    // ── Tax target balance (official apps, admins only) ──
    const showTaxTarget = computed(() => economyEnabled.value && isAdmin.value && app.value?.isOfficial === true);
    const taxTargetDraft = ref('');
    const taxTargetLoading = ref(false);
    const taxTargetSaving = ref(false);
    const taxTargetMsg = ref('');
    const taxTargetOk = ref(false);

    async function loadTaxTarget() {
      if (!showTaxTarget.value) return;
      taxTargetLoading.value = true;
      const r = await adminGetAppTaxTarget(appId.value);
      taxTargetLoading.value = false;
      taxTargetDraft.value = r.success ? formatCoinsPlain(r.target?.targetBalance ?? '0') : '';
    }

    async function saveTaxTarget() {
      taxTargetMsg.value = '';
      taxTargetOk.value = false;
      const amount = taxTargetDraft.value.trim();
      // Zero is meaningful here — it turns the top-up off.
      if (!isNonNegativeCoinAmount(amount)) {
        taxTargetMsg.value = 'enter-amount-zero-or-more';
        return;
      }
      taxTargetSaving.value = true;
      const r = await adminSetAppTaxTarget(appId.value, parseCoinsToRaw(amount));
      taxTargetSaving.value = false;
      if (!r.success) {
        taxTargetMsg.value = 'save-target-failed';
        return;
      }
      taxTargetDraft.value = formatCoinsPlain(r.target?.targetBalance ?? '0');
      taxTargetMsg.value = 'target-balance-saved';
      taxTargetOk.value = true;
    }

    // ── Delete ──
    const confirmingDelete = ref(false);
    const deleting = ref(false);
    const deleteError = ref('');

    async function confirmDelete() {
      deleteError.value = '';
      deleting.value = true;
      const r = await deleteOAuthApp(appId.value);
      deleting.value = false;
      if (!r.success) {
        confirmingDelete.value = false;
        deleteError.value = 'delete-app-failed';
        return;
      }
      router.push('/oauthapps');
    }

    onMounted(async () => {
      const id = route.query.appid;
      if (!id) {
        router.push('/oauthapps');
        return;
      }
      appId.value = id;

      const result = await getOAuthApp(id);
      if (!result.success || !result.app) {
        router.push('/oauthapps');
        return;
      }

      app.value = result.app;
      resetForm();
      loading.value = false;

      const requested = route.query.tab;
      if (requested && typeof requested === 'string') {
        if (isValidTab(requested)) openTab(requested);
        else pendingTab = requested;
      }

      // Keys aren't part of the economy (the API doesn't gate them), so they always load.
      loadKeys();
      if (economyEnabled.value) loadBalance();
      loadTaxTarget();
    });

    // Flags are fetched asynchronously, so the economy may only switch on after this page mounted.
    watch(economyEnabled, (enabled) => {
      if (enabled && appId.value) loadBalance();
    });

    // Same for the signed-in user: admin status can arrive after the first render.
    watch(showTaxTarget, (visible) => {
      if (visible && appId.value) loadTaxTarget();
    });

    return {
      appId, app, loading, economyEnabled,
      tabs, activeTab, selectTab, webhooksOpened,
      copied, copy, secretVisible, maskedSecret, formatDate,
      name, description, redirectUris, newUri, addUri, removeUri,
      dirty, resetForm, submit, saving, formError, formSuccess,
      keys, keysLoading, keysError, newKeyName, creatingKey, revealedKey,
      keyMessage, keyMessageError, loadKeys, createKey, copyKey,
      pendingKeyRevoke, confirmRevokeKey,
      balanceCoins, userCoins, balanceLoading, balanceError, loadBalance,
      transferDirection, setDirection, transferAmount, transferNote, transferring,
      transferMsg, transferRaw, transferOk, submitTransfer,
      showTaxTarget, taxTargetDraft, taxTargetLoading, taxTargetSaving,
      taxTargetMsg, taxTargetOk, saveTaxTarget,
      confirmingDelete, deleting, deleteError, confirmDelete,
    };
  }
};
</script>

<template>
  <LoadingBlock v-if="loading" :padding="80" />

  <div v-else class="manage-page">

    <!-- ── Page header ── -->
    <div class="page-header">
      <RouterLink to="/oauthapps" class="back-btn" :title="$t('back-to-apps')" :aria-label="$t('back-to-apps')">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8"/>
        </svg>
      </RouterLink>
      <div class="app-icon">{{ (app.name || '?').charAt(0).toUpperCase() }}</div>
      <div class="header-text">
        <div class="header-title-row">
          <h3 class="page-title">{{ app.name }}</h3>
          <OfficialBadge v-if="app.isOfficial" />
        </div>
        <p class="page-subtitle">{{ $t('manage-application') }}</p>
      </div>
    </div>

    <!-- ── Tabs ── -->
    <div class="tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id, 'tab-danger': tab.danger }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="selectTab(tab.id)"
      >
        {{ $t(tab.label) }}
        <span v-if="tab.id === 'settings' && dirty" class="dirty-dot" :title="$t('unsaved-changes')"></span>
      </button>
    </div>

    <!-- ── Overview ── -->
    <div v-show="activeTab === 'overview'" class="tab-panel" role="tabpanel">

      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('credentials') }}</h4>
            <p class="panel-subtitle">{{ $t('credentials-subtitle') }}</p>
          </div>
        </div>

        <div class="field-label">{{ $t('app-id') }}</div>
        <button
          class="copy-chip"
          :class="{ copied: copied === 'id' }"
          :title="$t('copy-id')"
          @click="copy(app.id, 'id')"
        >
          <code class="chip-text">{{ app.id }}</code>
          <span class="chip-status">{{ copied === 'id' ? $t('copied') : $t('click-to-copy') }}</span>
        </button>

        <div class="field-label">{{ $t('client-secret') }}</div>
        <div class="secret-row">
          <button
            class="copy-chip"
            :class="{ copied: copied === 'secret' }"
            :title="$t('click-to-copy')"
            @click="copy(app.clientSecret, 'secret')"
          >
            <code class="chip-text" :class="{ masked: !secretVisible }">
              {{ secretVisible ? app.clientSecret : maskedSecret }}
            </code>
            <span class="chip-status">{{ copied === 'secret' ? $t('copied') : $t('click-to-copy') }}</span>
          </button>
          <button class="ghost-btn" @click="secretVisible = !secretVisible">
            {{ secretVisible ? $t('hide') : $t('show') }}
          </button>
        </div>
        <p class="field-hint">{{ $t('client-secret-hint') }}</p>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h4 class="panel-title">{{ $t('app-info') }}</h4>
        </div>
        <div class="facts">
          <div class="fact">
            <span class="fact-label">{{ $t('created-on') }}</span>
            <span class="fact-value">{{ formatDate(app.dateCreated) }}</span>
          </div>
          <div class="fact">
            <span class="fact-label">{{ $t('app-type') }}</span>
            <span class="fact-value">{{ app.isOfficial ? $t('official-application') : $t('standard-application') }}</span>
          </div>
          <div class="fact">
            <span class="fact-label">{{ $t('redirect-uris') }}</span>
            <span class="fact-value">{{ app.redirectUris.length }}</span>
          </div>
        </div>
      </div>

    </div>

    <!-- ── Economy ── -->
    <div v-if="economyEnabled" v-show="activeTab === 'economy'" class="tab-panel" role="tabpanel">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('app-balance') }}</h4>
            <p class="panel-subtitle">{{ $t('app-balance-subtitle') }}</p>
          </div>
          <button class="ghost-btn" :disabled="balanceLoading" @click="loadBalance">
            {{ balanceLoading ? '…' : $t('reload') }}
          </button>
        </div>

        <!-- The app's balance and yours, side by side: a move always runs between these two. -->
        <div class="balance-pair">
          <div class="balance-box">
            <span class="balance-box-label">{{ $t('app-balance') }}</span>
            <div class="balance-display">
              <CoinIcon :size="22" />
              <span v-if="balanceLoading" class="balance-value">…</span>
              <span v-else-if="balanceError" class="balance-value balance-err">{{ $t('unknown-error') }}</span>
              <span v-else class="balance-value"><CoinAmount :value="balanceCoins" /> {{ $t('coins') }}</span>
            </div>
          </div>
          <div class="balance-box">
            <span class="balance-box-label">{{ $t('your-balance') }}</span>
            <div class="balance-display">
              <CoinIcon :size="22" />
              <span v-if="balanceLoading" class="balance-value">…</span>
              <span v-else-if="userCoins === null" class="balance-value balance-err">{{ $t('unknown-error') }}</span>
              <span v-else class="balance-value"><CoinAmount :value="userCoins" /> {{ $t('coins') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('move-coins') }}</h4>
            <p class="panel-subtitle">{{ $t('move-coins-subtitle') }}</p>
          </div>
        </div>

        <div class="direction-toggle" role="group" :aria-label="$t('move-coins')">
          <button
            class="direction-btn"
            :class="{ active: transferDirection === 'deposit' }"
            :aria-pressed="transferDirection === 'deposit'"
            @click="setDirection('deposit')"
          >{{ $t('deposit') }}</button>
          <button
            class="direction-btn"
            :class="{ active: transferDirection === 'withdraw' }"
            :aria-pressed="transferDirection === 'withdraw'"
            @click="setDirection('withdraw')"
          >{{ $t('withdraw') }}</button>
        </div>
        <p class="field-hint">
          {{ transferDirection === 'deposit' ? $t('deposit-hint') : $t('withdraw-hint') }}
        </p>

        <label class="field-label" for="transfer-amount">{{ $t('amount') }}</label>
        <input
          id="transfer-amount"
          v-model="transferAmount"
          type="text"
          inputmode="decimal"
          class="dark-input"
          placeholder="0"
          :disabled="transferring"
          @keyup.enter="submitTransfer"
        >

        <label class="field-label" for="transfer-note">{{ $t('note-optional') }}</label>
        <input
          id="transfer-note"
          v-model="transferNote"
          type="text"
          class="dark-input"
          maxlength="256"
          :placeholder="$t('note-placeholder')"
          :disabled="transferring"
          @keyup.enter="submitTransfer"
        >

        <div class="panel-actions">
          <button class="add-btn" :disabled="transferring" @click="submitTransfer">
            {{ transferring ? $t('saving') : (transferDirection === 'deposit' ? $t('deposit') : $t('withdraw')) }}
          </button>
          <span v-if="transferMsg || transferRaw" class="inline-msg" :class="{ 'inline-msg-error': !transferOk }">
            {{ transferMsg ? $t(transferMsg) : transferRaw }}
          </span>
        </div>
      </div>

      <div v-if="showTaxTarget" class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('target-balance') }}</h4>
            <p class="panel-subtitle">{{ $t('target-balance-subtitle') }}</p>
          </div>
        </div>

        <label class="field-label" for="tax-target">{{ $t('target-balance') }}</label>
        <input
          id="tax-target"
          v-model="taxTargetDraft"
          type="text"
          inputmode="decimal"
          class="dark-input"
          placeholder="0"
          :disabled="taxTargetLoading || taxTargetSaving"
          @keyup.enter="saveTaxTarget"
        >
        <p class="field-hint">{{ $t('target-balance-hint') }}</p>

        <div class="panel-actions">
          <button class="add-btn" :disabled="taxTargetLoading || taxTargetSaving" @click="saveTaxTarget">
            {{ taxTargetSaving ? $t('saving') : $t('save') }}
          </button>
          <span v-if="taxTargetMsg" class="inline-msg" :class="{ 'inline-msg-error': !taxTargetOk }">
            {{ $t(taxTargetMsg) }}
          </span>
        </div>
      </div>
    </div>

    <!-- ── Settings ── -->
    <div v-show="activeTab === 'settings'" class="tab-panel" role="tabpanel">
      <div v-if="formError" class="banner banner-error" role="alert">{{ $t(formError) }}</div>
      <div v-else-if="formSuccess" class="banner banner-ok" role="status">{{ $t('save-changes-success') }}</div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('app-details') }}</h4>
            <p class="panel-subtitle">{{ $t('app-details-subtitle') }}</p>
          </div>
        </div>

        <label class="field-label" for="app-name">{{ $t('application-name') }}</label>
        <input
          id="app-name"
          v-model="name"
          type="text"
          class="dark-input"
          maxlength="255"
          :placeholder="$t('application-name')"
          @input="formSuccess = false"
        >

        <label class="field-label" for="app-desc">{{ $t('description') }}</label>
        <textarea
          id="app-desc"
          v-model="description"
          class="dark-input"
          maxlength="4095"
          rows="3"
          :placeholder="$t('description')"
          @input="formSuccess = false"
        ></textarea>
        <p class="field-hint">{{ $t('description-hint') }}</p>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('redirect-uris') }}</h4>
            <p class="panel-subtitle">{{ $t('redirect-uris-hint') }}</p>
          </div>
        </div>

        <div v-if="redirectUris.length > 0" class="uri-list">
          <div v-for="(uri, index) in redirectUris" :key="index" class="uri-item">
            <span class="uri-text">{{ uri }}</span>
            <button type="button" class="icon-danger" :title="$t('remove')" @click="removeUri(index)">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
              </svg>
            </button>
          </div>
        </div>
        <p v-else class="panel-state">{{ $t('no-redirect-uris') }}</p>

        <div class="inline-row">
          <input
            v-model="newUri"
            type="text"
            class="dark-input"
            :placeholder="$t('add-redirect-uri')"
            @keydown.enter.prevent="addUri"
          >
          <button type="button" class="add-btn" @click="addUri">{{ $t('add') }}</button>
        </div>
      </div>

      <div class="form-actions">
        <button class="ghost-btn" :disabled="!dirty || saving" @click="resetForm">{{ $t('discard') }}</button>
        <button class="add-btn" :disabled="!dirty || saving" @click="submit">
          {{ saving ? '…' : $t('save-changes') }}
        </button>
      </div>
    </div>

    <!-- ── API keys ── -->
    <div v-show="activeTab === 'keys'" class="tab-panel" role="tabpanel">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('api-keys') }}</h4>
            <p class="panel-subtitle">{{ $t('api-keys-subtitle') }} <code>SerbleAuth: ApiKey sap_…</code></p>
          </div>
          <button class="ghost-btn" :disabled="keysLoading" @click="loadKeys">
            {{ keysLoading ? '…' : $t('reload') }}
          </button>
        </div>

        <!-- Reveal-once banner -->
        <div v-if="revealedKey" class="reveal-card">
          <p class="reveal-warning">{{ $t('copy-key-warning') }}</p>
          <div class="reveal-row">
            <code class="reveal-key">{{ revealedKey.key }}</code>
            <button class="ghost-btn" @click="copyKey">{{ $t('copy') }}</button>
          </div>
          <button class="ghost-btn" @click="revealedKey = null">{{ $t('saved-it') }}</button>
        </div>

        <div v-if="keyMessage" class="banner" :class="keyMessageError ? 'banner-error' : 'banner-info'">
          {{ $t(keyMessage) }}
        </div>

        <div class="inline-row">
          <input
            v-model="newKeyName"
            type="text"
            class="dark-input"
            maxlength="128"
            :placeholder="$t('key-name-placeholder')"
            @keydown.enter.prevent="createKey"
          >
          <button type="button" class="add-btn" :disabled="creatingKey" @click="createKey">
            {{ creatingKey ? '…' : $t('create-key') }}
          </button>
        </div>

        <div v-if="keysLoading" class="panel-state">{{ $t('loading') }}</div>
        <div v-else-if="keysError" class="panel-state panel-state-error">{{ $t('unknown-error') }}</div>
        <div v-else-if="!keys || keys.length === 0" class="panel-state">{{ $t('no-api-keys') }}</div>
        <div v-else class="key-list">
          <div v-for="k in keys" :key="k.id" class="key-item">
            <div class="key-info">
              <span class="key-name">{{ k.name }}</span>
              <code class="key-prefix">{{ k.keyPrefix }}</code>
              <span v-if="k.dateCreated" class="key-date">{{ new Date(k.dateCreated).toLocaleDateString() }}</span>
            </div>
            <div v-if="pendingKeyRevoke === k.id" class="key-confirm">
              <span class="key-confirm-text">{{ $t('revoke-key-confirm') }}</span>
              <button class="danger-btn" @click="confirmRevokeKey(k.id)">{{ $t('revoke') }}</button>
              <button class="ghost-btn" @click="pendingKeyRevoke = null">{{ $t('cancel') }}</button>
            </div>
            <button v-else class="danger-btn" @click="pendingKeyRevoke = k.id">{{ $t('revoke') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Webhooks ──
         Gated on the economy flag: the events it carries are tax events only for now, so there's
         nothing to manage while the economy is switched off. -->
    <div v-if="economyEnabled" v-show="activeTab === 'webhooks'" class="tab-panel" role="tabpanel">
      <AppWebhooksPanel v-if="webhooksOpened" :app-id="appId" />
    </div>

    <!-- ── Danger zone ── -->
    <div v-show="activeTab === 'danger'" class="tab-panel" role="tabpanel">
      <div class="panel panel-danger">
        <div class="panel-head">
          <div>
            <h4 class="panel-title">{{ $t('delete-application') }}</h4>
            <p class="panel-subtitle">{{ $t('delete-app-warning') }}</p>
          </div>
        </div>

        <div v-if="deleteError" class="banner banner-error" role="alert">{{ $t(deleteError) }}</div>

        <div v-if="!confirmingDelete">
          <button class="danger-btn" @click="confirmingDelete = true">{{ $t('delete-application') }}</button>
        </div>
        <div v-else class="confirm-row">
          <span class="confirm-text">{{ $t('delete-app-confirm', { app: app.name }) }}</span>
          <div class="confirm-actions">
            <button class="ghost-btn" :disabled="deleting" @click="confirmingDelete = false">{{ $t('cancel') }}</button>
            <button class="danger-btn danger-btn-solid" :disabled="deleting" @click="confirmDelete">
              {{ deleting ? '…' : $t('confirm-delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.manage-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px 60px;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 22px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  color: var(--text-muted);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 9px;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.back-btn:hover {
  background: var(--border);
  color: var(--text);
  border-color: var(--border-strong);
}

.app-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: linear-gradient(135deg, var(--accent), var(--accent-purple));
  color: #fff;
  font-size: 1.15rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-text { min-width: 0; }

.header-title-row {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
  word-break: break-word;
}

.page-subtitle {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 2px 0 0;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar { display: none; }

.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.tab:hover { color: var(--text-secondary); }

.tab.active {
  color: var(--text);
  border-bottom-color: var(--accent);
}

.tab-danger { color: var(--danger); }
.tab-danger:hover { color: var(--danger); }
.tab-danger.active { color: var(--danger); border-bottom-color: var(--danger); }

.dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
}

/* ── Panels ── */
.tab-panel { padding-top: 4px; }

.panel {
  margin-top: 20px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
}

.panel-danger { border-color: var(--danger-border-mid); }

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
  max-width: 60ch;
}

.panel-subtitle code { font-size: 0.76rem; color: var(--text-secondary); }

.panel-state {
  font-size: 0.85rem;
  color: var(--text-faint);
  padding: 4px 0 12px;
  margin: 0;
}

.panel-state-error { color: var(--danger); }

/* ── Banners ── */
.banner {
  font-size: 0.85rem;
  border-radius: 9px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.banner-error {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  color: var(--danger);
}

.banner-ok {
  background: var(--success-bg);
  border: 1px solid var(--success-border);
  color: var(--success);
}

.banner-info {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

/* ── Fields ── */
.field-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin: 16px 0 8px;
}

.field-label:first-of-type { margin-top: 0; }

/* …unless a hint introduces it, in which case it needs its usual breathing room back. */
.field-hint + .field-label { margin-top: 16px; }

.field-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin: 8px 0 0;
}

.dark-input {
  width: 100%;
  background: var(--surface-sunken);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.9rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.dark-input::placeholder { color: var(--text-faint); }

.dark-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

textarea.dark-input { resize: vertical; line-height: 1.5; }

.inline-row {
  display: flex;
  gap: 8px;
}

.inline-row .dark-input { flex-grow: 1; }

/* ── Copy chips ── */
.copy-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.copy-chip:hover {
  background: var(--border);
  border-color: var(--border-strong);
}

.chip-text {
  flex-grow: 1;
  min-width: 0;
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-text.masked { letter-spacing: 0.08em; }

.chip-status {
  flex-shrink: 0;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-faint);
}

.copy-chip:hover .chip-status { color: var(--text-muted); }

.copy-chip.copied {
  background: var(--success-bg);
  border-color: var(--success-border);
}

.copy-chip.copied .chip-text,
.copy-chip.copied .chip-status { color: var(--success); }

.secret-row {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.secret-row .copy-chip { min-width: 0; }

/* ── Facts ── */
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.fact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 13px;
}

.fact-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.fact-value {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
}

/* ── Buttons ── */
.ghost-btn,
.add-btn,
.danger-btn {
  flex-shrink: 0;
  font-size: 0.84rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 7px 15px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ghost-btn {
  color: var(--text-secondary);
  background: var(--border);
  border: 1px solid var(--border-strong);
}

.ghost-btn:hover:not(:disabled) { background: var(--border-strong); color: var(--text); }

.add-btn {
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
}

.add-btn:hover:not(:disabled) { background: var(--accent-hover); }

.danger-btn {
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid var(--danger-border-soft);
}

.danger-btn:hover:not(:disabled) {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

.danger-btn-solid {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

.ghost-btn:disabled,
.add-btn:disabled,
.danger-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.icon-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid var(--danger-border-soft);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.icon-danger:hover {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

/* ── Redirect URIs ── */
.uri-list {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
}

.uri-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-sunken);
}

.uri-item:last-child { border-bottom: none; }

.uri-text {
  word-break: break-all;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* ── Settings actions ── */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

/* ── API keys ── */
.reveal-card {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.reveal-warning {
  font-size: 0.82rem;
  color: var(--danger);
  margin: 0 0 10px;
}

.reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.reveal-key {
  flex-grow: 1;
  min-width: 0;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--text);
  word-break: break-all;
}

.key-list {
  margin-top: 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.key-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-sunken);
}

.key-item:last-child { border-bottom: none; }

.key-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.key-name { font-size: 0.88rem; font-weight: 600; color: var(--text); }
.key-prefix { font-size: 0.76rem; color: var(--text-secondary); word-break: break-all; }
.key-date { font-size: 0.74rem; color: var(--text-faint); }

.key-confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.key-confirm-text { font-size: 0.78rem; color: var(--danger); }

/* ── Balance ── */
.balance-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.balance-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text);
  word-break: break-all;
}

.balance-err { font-size: 0.9rem; color: var(--danger); font-weight: 500; }

.balance-pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.balance-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.balance-box-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

/* ── Move coins ── */
.direction-toggle {
  display: inline-flex;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
}

.direction-btn {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-dim);
  background: transparent;
  border: none;
  border-radius: 7px;
  padding: 6px 16px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.direction-btn:hover { color: var(--text-secondary); }

.direction-btn.active {
  background: var(--accent);
  color: #fff;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.inline-msg {
  font-size: 0.82rem;
  color: var(--success);
  word-break: break-word;
}

.inline-msg-error { color: var(--danger); }

/* ── Danger zone ── */
.confirm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  border-radius: 10px;
  padding: 12px 14px;
}

.confirm-text {
  font-size: 0.85rem;
  color: var(--danger);
  word-break: break-word;
}

.confirm-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 560px) {
  .panel { padding: 18px 16px; }
  .panel-head { flex-direction: column; }
  .secret-row { flex-direction: column; align-items: stretch; }
}
</style>
