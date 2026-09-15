<script>
/**
 * Account settings.
 *
 * Layout: a fixed left rail - who you are, where you can go, and the read-only
 * facts about the account - beside a single pane that shows one section at a
 * time. One spine down the page instead of a scatter of cards, and the pane
 * never grows past a screen, so nothing scrolls.
 *
 * Inside a pane the unit is a panel: an optional head (what this is and how it
 * stands), a body of stacked fields, and - when the panel can be acted on - a
 * recessed foot holding its status message and its buttons. Every action lives
 * in a foot, so "where do I click to apply this" has one answer everywhere.
 * Fields stack vertically at a readable measure rather than sitting in a fixed
 * label column, which kept breaking once a translation ran longer than English.
 *
 * Saving: every panel owns its own action, and the action lives in the same
 * panel as the fields it writes. The old page had one "Save changes" button at
 * the very bottom that silently applied to the profile fields and the password
 * only - 2FA and passkeys saved themselves the moment you touched them, which
 * made the button's scope impossible to guess.
 *
 * The open section lives in the URL, matching the manage-app page, so a refresh
 * or a shared link lands back in the same place.
 */
import { computed, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ensureLoggedIn, setCookie } from '@/assets/js/utils.js';
import { getSupportedLocale, toServerLocale } from '@/assets/js/languages.js';
import {
  editUser, getUser, getAuthToken, getCredentials, setPassword, renameCredential, deleteCredential,
  setLoginFlows, registerPasskey, logoutAllSessions,
} from '@/assets/js/serble.js';
import { confirmDialog } from '@/assets/js/dialog.js';
import LanguageDropdown from '@/components/LanguageDropdown.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

const SECTIONS = ['profile', 'security'];

// Passkeys used to be a section of its own - one panel plus a heading, saying
// the same thing about signing in that the security panels do - so it now sits
// under security. Links handed out while it was separate still land there.
const LEGACY_SECTIONS = { passkeys: 'security' };

function normalizeSection(id) {
  if (SECTIONS.includes(id)) return id;
  return LEGACY_SECTIONS[id] ?? 'profile';
}

// The rail is a vertical list beside the pane above this width and a horizontal
// strip above it below - which changes both the arrow keys the tablist should
// answer to and what it reports as its orientation. Kept in sync with the
// media queries at the bottom of this file.
const RAIL_STACKS_AT = '(max-width: 900px)';

export default {
  components: { LanguageDropdown, LoadingSpinner, Icon },
  setup() {
    const user = ensureLoggedIn();
    const userStore = inject('userStore');
    const { locale, t } = useI18n({ useScope: 'global' });
    const route = useRoute();
    const router = useRouter();

    // -- Sections ------------------------------------------------------------
    const section = ref(normalizeSection(route.query.tab));
    const tabNav = ref(null);
    const railHorizontal = ref(false);

    function openSection(id) {
      if (!SECTIONS.includes(id) || section.value === id) return;
      section.value = id;
      router.replace({ path: route.path, query: { ...route.query, tab: id } });
    }

    // Arrow keys move between tabs and select as they go, which is the ARIA
    // tabs pattern. Both axes are accepted so the same handler works whether
    // the rail is standing up beside the pane or lying above it.
    function onTabKeydown(event, index) {
      const steps = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
      let next;
      if (event.key in steps) next = (index + steps[event.key] + SECTIONS.length) % SECTIONS.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = SECTIONS.length - 1;
      else return;

      event.preventDefault();
      openSection(SECTIONS[next]);
      nextTick(() => tabNav.value?.querySelectorAll('[role="tab"]')[next]?.focus());
    }

    // -- Profile -------------------------------------------------------------
    const username = ref('');
    const email = ref('');
    const selectedLanguage = ref(getSupportedLocale(locale.value) || 'en');
    // The language only counts as an unsaved change once it's been picked here.
    // Accounts created before the server stored a language have nothing to
    // compare against, and without this the pane would open already dirty.
    const languageTouched = ref(false);

    const profileErrors = ref([]);
    const profileSaving = ref(false);
    const profileSaved = ref(false);

    const savedUsername = computed(() => user.value?.username ?? '');
    const savedEmail = computed(() => user.value?.email ?? '');
    const savedServerLocale = computed(() => user.value?.language ?? user.value?.Language ?? '');

    const usernameInvalid = computed(() =>
      profileErrors.value.includes('invalid-username') || profileErrors.value.includes('username-taken'));
    const emailInvalid = computed(() => profileErrors.value.includes('invalid-email'));

    const profileDirty = computed(() =>
      username.value.trim() !== savedUsername.value
      || email.value.trim() !== savedEmail.value
      || (languageTouched.value
        && toServerLocale(getSupportedLocale(selectedLanguage.value)) !== savedServerLocale.value)
    );

    // Changing the picker switches the site over straight away - the setting is
    // about the language you're reading right now, so waiting for a save would
    // feel broken. Only the server copy waits for "Save changes".
    watch(selectedLanguage, (next) => {
      const normalized = getSupportedLocale(next);
      if (!normalized) return;
      if (locale.value !== normalized) locale.value = normalized;
      setCookie('locale', normalized, 9999);
    });

    watch(
      () => locale.value,
      (next) => {
        const normalized = getSupportedLocale(next);
        if (normalized && normalized !== selectedLanguage.value) selectedLanguage.value = normalized;
      },
      { immediate: true }
    );

    // The user arrives asynchronously, and again after every successful save.
    watch(
      () => user.value,
      (next) => {
        if (!next) return;
        username.value = next.username ?? '';
        email.value = next.email ?? '';
        const normalized = getSupportedLocale(next.language ?? next.Language);
        if (normalized && normalized !== selectedLanguage.value) selectedLanguage.value = normalized;
      },
      { immediate: true }
    );

    function touchProfile() {
      profileSaved.value = false;
      profileErrors.value = [];
    }

    function resetProfile() {
      username.value = savedUsername.value;
      email.value = savedEmail.value;
      const normalized = getSupportedLocale(savedServerLocale.value);
      if (normalized) selectedLanguage.value = normalized;
      languageTouched.value = false;
      touchProfile();
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    async function saveProfile() {
      if (profileSaving.value || !profileDirty.value) return;
      profileErrors.value = [];
      profileSaved.value = false;

      const trimmedUsername = username.value.trim();
      const trimmedEmail = email.value.trim();

      if (!trimmedUsername) profileErrors.value.push('invalid-username');
      if (trimmedEmail && trimmedEmail !== savedEmail.value && !emailRegex.test(trimmedEmail)) {
        profileErrors.value.push('invalid-email');
      }
      if (profileErrors.value.length > 0) return;

      const edits = [];
      if (trimmedUsername !== savedUsername.value) {
        edits.push({ field: 'Username', newValue: trimmedUsername });
      }
      if (trimmedEmail !== savedEmail.value) {
        edits.push({ field: 'Email', newValue: trimmedEmail });
      }
      const serverLocale = toServerLocale(getSupportedLocale(selectedLanguage.value));
      if (serverLocale && serverLocale !== savedServerLocale.value) {
        edits.push({ field: 'Language', newValue: serverLocale });
      }
      if (edits.length === 0) return;

      profileSaving.value = true;
      const result = await editUser(edits);
      profileSaving.value = false;

      if (!result.success) {
        if (result.error === 'name-taken') profileErrors.value.push('username-taken');
        else if (result.error === 'email-invalid') profileErrors.value.push('invalid-email');
        else profileErrors.value.push('unknown-error');
        return;
      }

      if (result.user && userStore?.updateUser) userStore.updateUser(result.user);
      username.value = trimmedUsername;
      email.value = trimmedEmail;
      languageTouched.value = false;
      profileSaved.value = true;
    }

    // -- Credentials ---------------------------------------------------------
    const credentials = ref([]);
    const flows = ref([]);
    // Starts true: fetched on mount, and the lists would otherwise flash empty.
    const credentialsLoading = ref(true);

    const passwordCredential = computed(() => credentials.value.find(c => c.type === 'password') ?? null);
    const authenticators = computed(() => credentials.value.filter(c => c.type === 'totp'));
    const passkeys = computed(() => credentials.value.filter(c => c.type === 'passkey'));

    function applyOverview(data) {
      if (!data) return;
      credentials.value = data.credentials ?? [];
      flows.value = data.flows ?? [];
    }

    async function loadCredentials() {
      credentialsLoading.value = true;
      const result = await getCredentials();
      credentialsLoading.value = false;
      if (result.success) applyOverview(result.data);
    }

    // The user's totpEnabled follows the sign-in flows, so it is re-read after they change.
    async function refreshUser() {
      const fresh = await getUser(getAuthToken());
      if (fresh && userStore?.updateUser) userStore.updateUser(fresh);
    }

    function credentialErrorKey(result) {
      if (result.error === 'reauth-cancelled') return 'reauth-cancelled';
      if (result.status === 409) return 'credential-last-way-in';
      return 'unknown-error';
    }

    // -- Password ------------------------------------------------------------
    const password = ref('');
    const confirmPassword = ref('');
    const passwordError = ref('');
    const passwordSaving = ref(false);
    const passwordSaved = ref(false);
    const passwordRevoked = ref(false);

    const canChangePassword = computed(() => password.value !== '' && confirmPassword.value !== '');

    function touchPassword() {
      passwordSaved.value = false;
      passwordError.value = '';
    }

    async function changePassword() {
      if (passwordSaving.value || !canChangePassword.value) return;
      touchPassword();

      if (password.value !== confirmPassword.value) {
        passwordError.value = 'passwords-dont-match';
        return;
      }

      passwordSaving.value = true;
      const result = await setPassword(password.value);
      passwordSaving.value = false;

      if (!result.success) {
        passwordError.value = credentialErrorKey(result);
        return;
      }

      applyOverview(result.data);
      password.value = '';
      confirmPassword.value = '';
      passwordSaved.value = true;
      passwordRevoked.value = result.revoked;
    }

    // -- Ways to sign in -----------------------------------------------------
    const METHODS = ['password', 'totp', 'passkey'];
    const availableMethods = computed(() => METHODS.filter(m => credentials.value.some(c => c.type === m)));
    const newFlow = ref([]);
    const flowsSaving = ref(false);
    const flowsError = ref('');
    // The API explains rejected combinations; shown as it arrives.
    const flowsMessage = ref('');
    const flowsSaved = ref(false);

    function isCodeOnly(methods) {
      return methods.length > 0 && methods.every(m => m === 'totp');
    }

    // The methods being combined into a new way in, in the canonical order, plus
    // the checks that let us disable Add and explain why before the server has to.
    const newFlowOrdered = computed(() => METHODS.filter(m => newFlow.value.includes(m)));
    const flowKey = methods => [...methods].sort().join('+');
    const isSubset = (a, b) => a.every(m => b.includes(m));
    const methodList = methods => methods.map(m => t('method-' + m)).join(' + ');

    const newFlowIsDuplicate = computed(() =>
      newFlowOrdered.value.length > 0 &&
      flows.value.some(f => flowKey(f.methods) === flowKey(newFlowOrdered.value)));
    const newFlowIsCodeOnly = computed(() => isCodeOnly(newFlowOrdered.value));

    // An existing way in that needs fewer of the same methods already covers this
    // one, so the new one won't be used until that shorter way is removed.
    const newFlowRedundantVs = computed(() =>
      newFlowOrdered.value.length > 0 && !newFlowIsDuplicate.value
        ? flows.value.find(f => f.methods.length < newFlowOrdered.value.length
            && isSubset(f.methods, newFlowOrdered.value)) ?? null
        : null);

    // Existing ways the new one would make unused: it gets in with a subset of
    // their methods.
    const newFlowSupersedes = computed(() =>
      newFlowOrdered.value.length > 0 && !newFlowIsDuplicate.value
        ? flows.value.filter(f => f.methods.length > newFlowOrdered.value.length
            && isSubset(newFlowOrdered.value, f.methods))
        : []);
    const supersededSummary = computed(() =>
      newFlowSupersedes.value.map(f => methodList(f.methods)).join(', '));

    // The shortest other way in that this one contains, which makes this one unused.
    function redundantVs(flow) {
      return flows.value
        .filter(f => f.id !== flow.id && f.methods.length < flow.methods.length && isSubset(f.methods, flow.methods))
        .sort((a, b) => a.methods.length - b.methods.length)[0] ?? null;
    }

    function toggleMethod(m) {
      const i = newFlow.value.indexOf(m);
      if (i === -1) newFlow.value.push(m);
      else newFlow.value.splice(i, 1);
    }

    // How safe a given way in is, so each one can carry an honest label:
    // a code on its own is weak, a lone password is basic, and anything with a
    // second factor or a passkey is strong.
    function flowStrength(methods) {
      if (isCodeOnly(methods)) return 'weak';
      if (methods.length >= 2 || methods.includes('passkey')) return 'strong';
      return 'basic';
    }

    // The builder is hidden until asked for, so the panel reads as the list of
    // ways in first and an editor second, not a permanent form.
    const showBuilder = ref(false);
    function openBuilder() {
      flowsError.value = '';
      flowsMessage.value = '';
      flowsSaved.value = false;
      newFlow.value = [];
      showBuilder.value = true;
    }
    function closeBuilder() {
      showBuilder.value = false;
      newFlow.value = [];
    }

    async function saveFlows(next) {
      if (flowsSaving.value) return;
      flowsError.value = '';
      flowsMessage.value = '';
      flowsSaved.value = false;

      flowsSaving.value = true;
      const result = await setLoginFlows(next);
      flowsSaving.value = false;

      if (!result.success) {
        if (result.status === 400 && result.message) flowsMessage.value = result.message;
        else flowsError.value = credentialErrorKey(result);
        return;
      }

      applyOverview(result.data);
      newFlow.value = [];
      showBuilder.value = false;
      flowsSaved.value = true;
      await refreshUser();
    }

    function addFlow() {
      const next = newFlowOrdered.value;
      if (next.length === 0 || newFlowIsDuplicate.value) return;
      saveFlows([...flows.value.map(f => f.methods), next]);
    }

    async function removeFlow(flow) {
      if (!await confirmDialog({
        title: t('remove-sign-in-way'),
        message: t('remove-sign-in-way-confirm', { methods: flow.methods.map(m => t('method-' + m)).join(' + ') }),
        confirmLabel: t('remove'),
        danger: true,
      })) return;
      saveFlows(flows.value.filter(f => f.id !== flow.id).map(f => f.methods));
    }

    // -- Sessions ------------------------------------------------------------
    // Changing the password ends every session on the account. This one survives
    // because the API hands back a replacement token that serble.js adopts, but
    // the other devices are signed out and the user should be told that happened
    // rather than discovering it on their phone.
    const signingOutAll = ref(false);
    const sessionsError = ref('');
    const sessionsEnded = ref(false);

    async function logoutEverywhere() {
      if (signingOutAll.value) return;
      sessionsError.value = '';
      sessionsEnded.value = false;

      if (!await confirmDialog({
        title: t('logout-all-sessions'),
        message: t('logout-all-confirm'),
        confirmLabel: t('logout-all-confirm-action'),
        danger: true,
      })) return;

      signingOutAll.value = true;
      const result = await logoutAllSessions();
      signingOutAll.value = false;

      if (!result.success) {
        sessionsError.value = 'logout-all-failed';
        return;
      }
      sessionsEnded.value = true;
    }

    // -- Authenticator apps and passkeys -------------------------------------
    const totpError = ref('');
    const passkeyError = ref('');
    const removingId = ref('');
    const renamingId = ref('');
    const renameValue = ref('');
    const savingRename = ref(false);
    const renameInput = ref(null);
    const registeringPasskey = ref(false);
    const passkeyAlone = ref(true);

    function setError(type, key) {
      if (type === 'totp') totpError.value = key;
      else passkeyError.value = key;
    }

    function displayName(credential) {
      return credential.name || t(credential.type === 'totp' ? 'authenticator-app' : 'method-passkey');
    }

    // A template ref written from inside v-for arrives as an array, and the
    // unmount of the previous row can land after the mount of the next one.
    // Ignoring the null call sidesteps both.
    function setRenameInput(el) {
      if (el) renameInput.value = el;
    }

    function startRename(credential) {
      if (savingRename.value) return;
      setError(credential.type, '');
      renamingId.value = credential.id;
      renameValue.value = credential.name ?? '';
      nextTick(() => renameInput.value?.select());
    }

    function cancelRename() {
      renamingId.value = '';
      renameValue.value = '';
    }

    async function submitRename(credential) {
      if (savingRename.value) return;
      const newName = renameValue.value.trim();
      if (!newName || newName === credential.name) {
        cancelRename();
        return;
      }
      savingRename.value = true;
      const result = await renameCredential(credential.id, newName);
      savingRename.value = false;
      if (!result.success) {
        setError(credential.type, credential.type === 'totp' ? 'unknown-error' : 'passkey-rename-failed');
        return;
      }
      applyOverview(result.data);
      cancelRename();
    }

    async function removeCredential(credential) {
      if (removingId.value) return;
      const name = displayName(credential);
      if (!await confirmDialog({
        title: t(credential.type === 'totp' ? 'remove-authenticator' : 'remove-passkey'),
        message: t(credential.type === 'totp' ? 'remove-authenticator-confirm' : 'passkey-remove-confirm', { name }),
        confirmLabel: t('remove'),
        danger: true,
      })) return;

      setError(credential.type, '');
      removingId.value = credential.id;
      const result = await deleteCredential(credential.id);
      removingId.value = '';
      if (!result.success) {
        setError(credential.type, credentialErrorKey(result));
        return;
      }
      applyOverview(result.data);
      await refreshUser();
    }

    async function addPasskey() {
      if (registeringPasskey.value) return;
      passkeyError.value = '';
      registeringPasskey.value = true;
      const result = await registerPasskey({ signInAlone: passkeyAlone.value });
      registeringPasskey.value = false;
      if (!result.success) {
        if (result.error === 'cancelled') passkeyError.value = 'passkey-register-cancelled';
        else if (result.error === 'webauthn-unavailable') passkeyError.value = 'passkey-unavailable';
        else if (result.error === 'reauth-cancelled') passkeyError.value = 'reauth-cancelled';
        else passkeyError.value = 'passkey-register-failed';
        return;
      }
      await loadCredentials();
    }

    // -- Identity rail -------------------------------------------------------
    // The security tab covers two things worth advertising at a glance, and
    // only has room for one: 2FA wins because it's the stronger claim about the
    // account, and the passkey count stands in when there's no 2FA to report.
    const securityNote = computed(() => {
      if (user.value?.totpEnabled) return t('2fa-short');
      return passkeys.value.length ? String(passkeys.value.length) : '';
    });

    const accountTypeKey = computed(() =>
      (user.value?.permLevel ?? 0) >= 2 ? 'account-type-admin' : 'account-type-standard');
    // Premium isn't wired up to anything yet, so every account reads as free.
    const premiumKey = 'account-type-free';

    const initial = computed(() => (user.value?.username || '?').charAt(0).toUpperCase());

    // Both return '' rather than a placeholder so the caller picks the wording.
    function parseDate(value) {
      if (!value) return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? null : date;
    }

    function formatDay(value) {
      const date = parseDate(value);
      return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    }

    function formatMoment(value) {
      const date = parseDate(value);
      return date ? date.toLocaleString() : '';
    }

    const idCopied = ref(false);
    let copyTimer = null;

    async function copyId() {
      try {
        await navigator.clipboard.writeText(user.value?.id ?? '');
      } catch {
        return;
      }
      idCopied.value = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { idCopied.value = false; }, 2000);
    }

    // -- Lifecycle -----------------------------------------------------------
    let railQuery = null;
    const syncRail = (event) => { railHorizontal.value = event.matches; };

    onMounted(() => {
      loadCredentials();
      // A retired or misspelled ?tab= still opens the right pane, but the URL
      // would keep the old name - rewrite it so a link copied from here is
      // written the way the page names its sections now.
      if (route.query.tab && route.query.tab !== section.value) {
        router.replace({ path: route.path, query: { ...route.query, tab: section.value } });
      }
      railQuery = window.matchMedia(RAIL_STACKS_AT);
      railHorizontal.value = railQuery.matches;
      railQuery.addEventListener('change', syncRail);
    });

    onUnmounted(() => {
      clearTimeout(copyTimer);
      railQuery?.removeEventListener('change', syncRail);
    });

    return {
      user, initial, accountTypeKey, premiumKey, formatDay, formatMoment, idCopied, copyId,
      sections: SECTIONS, section, openSection, onTabKeydown, tabNav, railHorizontal, securityNote,
      username, email, selectedLanguage, languageTouched, savedUsername,
      profileErrors, profileSaving, profileSaved, profileDirty, usernameInvalid, emailInvalid,
      touchProfile, resetProfile, saveProfile,
      credentials, flows, credentialsLoading, passwordCredential, authenticators, passkeys,
      password, confirmPassword, passwordError, passwordSaving, passwordSaved, passwordRevoked,
      canChangePassword, touchPassword, changePassword,
      availableMethods, newFlow, newFlowOrdered, newFlowIsDuplicate, newFlowIsCodeOnly, toggleMethod,
      newFlowRedundantVs, newFlowSupersedes, supersededSummary, methodList, redundantVs,
      flowStrength, showBuilder, openBuilder, closeBuilder,
      flowsSaving, flowsError, flowsMessage, flowsSaved, isCodeOnly, addFlow, removeFlow,
      signingOutAll, sessionsError, sessionsEnded, logoutEverywhere,
      totpError, passkeyError, removingId, renamingId, renameValue, savingRename, setRenameInput,
      registeringPasskey, passkeyAlone, displayName, startRename, cancelRename, submitRename,
      removeCredential, addPasskey,
    };
  }
};
</script>

<template>
  <div class="account-page">

    <!-- -- Identity + navigation rail -- -->
    <aside class="rail">
      <div class="identity">
        <!-- The initial only restates the username sitting next to it. -->
        <div class="avatar" aria-hidden="true">{{ initial }}</div>
        <div class="identity-text">
          <h1 class="identity-name">{{ user?.username }}</h1>
          <div class="identity-badges">
            <span class="badge badge-accent">{{ $t(accountTypeKey) }}</span>
            <!-- Neutral until there is a paid tier to distinguish it from. -->
            <span class="badge badge-neutral">{{ $t(premiumKey) }}</span>
          </div>
        </div>
      </div>

      <nav
        ref="tabNav"
        class="rail-nav"
        role="tablist"
        :aria-orientation="railHorizontal ? 'horizontal' : 'vertical'"
        :aria-label="$t('settings')"
      >
        <button
          v-for="(id, index) in sections"
          :id="`tab-${id}`"
          :key="id"
          type="button"
          class="rail-link"
          :class="{ active: section === id }"
          role="tab"
          :aria-selected="section === id"
          :aria-controls="`panel-${id}`"
          :tabindex="section === id ? 0 : -1"
          @click="openSection(id)"
          @keydown="onTabKeydown($event, index)"
        >
          <span class="rail-link-label">{{ $t(id) }}</span>
          <template v-if="id === 'profile' && profileDirty">
            <span class="dirty-dot" aria-hidden="true"></span>
            <span class="sr-only">{{ $t('unsaved-changes') }}</span>
          </template>
          <span v-else-if="id === 'security' && securityNote" class="rail-link-note">{{ securityNote }}</span>
        </button>
      </nav>
    </aside>

    <!-- -- Read-only account facts -- -->
    <aside class="facts" aria-labelledby="facts-title">
      <h2 id="facts-title" class="facts-title">{{ $t('account-details') }}</h2>
      <dl class="fact-list">
        <div class="fact">
          <dt class="fact-label">{{ $t('id') }}</dt>
          <dd class="fact-value">
            <button
              type="button"
              class="id-chip"
              :class="{ copied: idCopied }"
              :title="$t('copy-id')"
              @click="copyId"
            >
              <code class="id-text">{{ user?.id }}</code>
              <Icon :name="idCopied ? 'check' : 'copy'" :size="12" />
              <span class="sr-only">{{ idCopied ? $t('copied') : $t('copy-id') }}</span>
            </button>
          </dd>
        </div>
        <div class="fact">
          <dt class="fact-label">{{ $t('account-type') }}</dt>
          <dd class="fact-value">{{ $t(accountTypeKey) }}</dd>
        </div>
        <div class="fact">
          <dt class="fact-label">{{ $t('premium-level') }}</dt>
          <dd class="fact-value">{{ $t(premiumKey) }}</dd>
        </div>
        <div class="fact">
          <dt class="fact-label">{{ $t('account-created') }}</dt>
          <dd class="fact-value">{{ formatDay(user?.dateCreated) || $t('unknown') }}</dd>
        </div>
        <div class="fact">
          <dt class="fact-label">{{ $t('last-login') }}</dt>
          <dd class="fact-value">{{ formatMoment(user?.lastLogin) || $t('never') }}</dd>
        </div>
      </dl>
    </aside>

    <!-- -- Section pane -- -->
    <main class="pane">

      <!-- Profile -->
      <section
        v-show="section === 'profile'"
        id="panel-profile"
        role="tabpanel"
        aria-labelledby="tab-profile"
      >
        <header class="pane-head">
          <div class="pane-head-text">
            <h2 class="pane-title">{{ $t('profile') }}</h2>
            <p class="pane-subtitle">{{ $t('profile-section-hint') }}</p>
          </div>
        </header>

        <form class="panel" @submit.prevent="saveProfile">
          <div class="panel-body form-stack">
            <div class="field">
              <div class="label-row">
                <label class="field-label field-label-plain" for="username">{{ $t('username') }}</label>
              </div>
              <input
                id="username"
                v-model="username"
                type="text"
                class="input"
                :class="{ 'is-invalid': usernameInvalid }"
                :aria-invalid="usernameInvalid || undefined"
                autocomplete="username"
                @input="touchProfile"
              >
            </div>

            <div class="field">
              <div class="label-row">
                <label class="field-label field-label-plain" for="email">{{ $t('email') }}</label>
                <span v-if="user?.email && user?.verifiedEmail" class="inline-note inline-note-ok">
                  <Icon name="check" :size="12" />{{ $t('verified') }}
                </span>
                <span v-else-if="user?.email" class="inline-note inline-note-warn">
                  <Icon name="alert" :size="12" />{{ $t('not-verified') }}
                </span>
              </div>
              <input
                id="email"
                v-model="email"
                type="email"
                class="input"
                :class="{ 'is-invalid': emailInvalid }"
                :aria-invalid="emailInvalid || undefined"
                autocomplete="email"
                @input="touchProfile"
              >
            </div>

            <div class="field">
              <div class="label-row">
                <label class="field-label field-label-plain" for="language">{{ $t('language') }}</label>
              </div>
              <LanguageDropdown
                id="language"
                v-model="selectedLanguage"
                :placeholder="$t('language')"
                @change="languageTouched = true; touchProfile()"
              />
            </div>
          </div>

          <div class="panel-foot">
            <div class="panel-status" role="status">
              <p v-for="key in profileErrors" :key="key" class="status status-error">
                <Icon name="alert" :size="13" />{{ $t(key) }}
              </p>
              <p v-if="profileSaved && profileErrors.length === 0" class="status status-ok">
                <Icon name="check" :size="13" />{{ $t('save-changes-success') }}
              </p>
            </div>
            <div class="panel-actions">
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                :disabled="!profileDirty || profileSaving"
                @click="resetProfile"
              >
                {{ $t('discard') }}
              </button>
              <button type="submit" class="btn btn-primary btn-sm" :disabled="!profileDirty || profileSaving">
                <LoadingSpinner v-if="profileSaving" :size="13" />
                {{ profileSaving ? $t('saving') : $t('save-changes') }}
              </button>
            </div>
          </div>
        </form>
      </section>

      <!-- Security -->
      <section
        v-show="section === 'security'"
        id="panel-security"
        role="tabpanel"
        aria-labelledby="tab-security"
      >
        <header class="pane-head">
          <div class="pane-head-text">
            <h2 class="pane-title">{{ $t('security') }}</h2>
            <p class="pane-subtitle">{{ $t('security-section-hint') }}</p>
          </div>
        </header>

        <div class="panel-stack">
          <form class="panel" @submit.prevent="changePassword">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ passwordCredential || credentialsLoading ? $t('change-password') : $t('set-password') }}</h3>
                <p class="panel-note">{{ $t('password-section-hint') }}</p>
              </div>
            </div>

            <div class="panel-body">
              <!--
                Password managers only offer to update a saved login when the
                form says which login it belongs to. Kept out of the tab order
                and out of the accessibility tree - it is machine-facing only.
              -->
              <input
                class="sr-only"
                type="text"
                autocomplete="username"
                :value="savedUsername"
                tabindex="-1"
                aria-hidden="true"
                readonly
              >
              <div class="pair">
                <div class="field">
                  <label class="field-label field-label-plain" for="password">{{ $t('new-password') }}</label>
                  <input
                    id="password"
                    v-model="password"
                    type="password"
                    class="input"
                    :class="{ 'is-invalid': passwordError === 'passwords-dont-match' }"
                    :aria-invalid="passwordError === 'passwords-dont-match' || undefined"
                    autocomplete="new-password"
                    @input="touchPassword"
                  >
                </div>
                <div class="field">
                  <label class="field-label field-label-plain" for="confirmPassword">{{ $t('confirm-password') }}</label>
                  <input
                    id="confirmPassword"
                    v-model="confirmPassword"
                    type="password"
                    class="input"
                    :class="{ 'is-invalid': passwordError === 'passwords-dont-match' }"
                    :aria-invalid="passwordError === 'passwords-dont-match' || undefined"
                    autocomplete="new-password"
                    @input="touchPassword"
                  >
                </div>
              </div>
            </div>

            <div class="panel-foot">
              <div class="panel-status" role="status">
                <p v-if="passwordError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(passwordError) }}
                </p>
                <template v-else-if="passwordSaved">
                  <p class="status status-ok">
                    <Icon name="check" :size="13" />{{ $t('password-updated') }}
                  </p>
                  <p v-if="passwordRevoked" class="status status-note">{{ $t('other-sessions-signed-out') }}</p>
                </template>
              </div>
              <div class="panel-actions">
                <button type="submit" class="btn btn-primary btn-sm" :disabled="!canChangePassword || passwordSaving">
                  <LoadingSpinner v-if="passwordSaving" :size="13" />
                  {{ passwordSaving ? $t('saving') : (passwordCredential ? $t('update-password') : $t('set-password')) }}
                </button>
              </div>
            </div>
          </form>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ $t('ways-to-sign-in') }}</h3>
                <p class="panel-note">{{ $t('ways-to-sign-in-hint') }}</p>
              </div>
            </div>

            <p v-if="credentialsLoading" class="panel-state">
              <LoadingSpinner :size="14" />{{ $t('loading') }}
            </p>

            <div v-else class="panel-body ways">
              <!-- Each way in is a card: the methods it needs, chained by "+", with
                   an honest strength label so a weak one is obvious at a glance. -->
              <ul class="ways-grid">
                <li
                  v-for="flow in flows"
                  :key="flow.id"
                  class="way"
                  :class="'way-' + flowStrength(flow.methods)"
                >
                  <button
                    type="button"
                    class="way-remove"
                    :title="$t('remove-sign-in-way')"
                    :aria-label="$t('remove-sign-in-way')"
                    :disabled="flowsSaving || flows.length < 2"
                    @click="removeFlow(flow)"
                  >
                    <Icon name="trash" :size="13" />
                  </button>
                  <div class="way-chain">
                    <template v-for="(m, i) in flow.methods" :key="m">
                      <span v-if="i > 0" class="way-and" aria-hidden="true">
                        <Icon name="plus" :size="10" />
                      </span>
                      <span class="way-method">{{ $t('method-' + m) }}</span>
                    </template>
                  </div>
                  <p v-if="redundantVs(flow)" class="way-redundant">
                    <Icon name="alert" :size="12" />
                    {{ $t('sign-in-way-unused', { methods: methodList(redundantVs(flow).methods) }) }}
                  </p>
                  <span class="way-strength">
                    <span class="way-dot" aria-hidden="true" />
                    {{ $t('strength-' + flowStrength(flow.methods)) }}
                  </span>
                </li>

                <!-- The add control lives in the grid as a peer of the ways, so
                     "make another one" reads as the obvious next tile. -->
                <li v-if="!showBuilder" class="way-add">
                  <button type="button" class="way-add-btn" @click="openBuilder">
                    <span class="way-add-icon" aria-hidden="true"><Icon name="plus" :size="16" /></span>
                    {{ $t('add-sign-in-way') }}
                  </button>
                </li>
              </ul>

              <!-- Builder: revealed only when adding, so the panel is a list first. -->
              <div v-if="showBuilder" class="builder">
                <div class="builder-head">
                  <p class="builder-title">{{ $t('add-sign-in-way') }}</p>
                  <button
                    type="button"
                    class="way-remove"
                    :aria-label="$t('cancel')"
                    :title="$t('cancel')"
                    @click="closeBuilder"
                  >
                    <Icon name="close" :size="14" />
                  </button>
                </div>
                <p class="builder-hint">{{ $t('pick-methods-hint') }}</p>

                <div class="flow-toggles" role="group" :aria-label="$t('add-sign-in-way')">
                  <button
                    v-for="m in availableMethods"
                    :key="m"
                    type="button"
                    class="flow-toggle"
                    role="checkbox"
                    :class="{ on: newFlow.includes(m) }"
                    :aria-checked="newFlow.includes(m)"
                    @click="toggleMethod(m)"
                  >
                    <span class="flow-toggle-box" aria-hidden="true">
                      <Icon v-if="newFlow.includes(m)" name="check" :size="11" />
                    </span>
                    {{ $t('method-' + m) }}
                  </button>
                </div>

                <div class="builder-foot">
                  <div class="builder-msgs">
                    <p v-if="newFlowIsDuplicate" class="builder-msg builder-msg-warn">
                      <Icon name="alert" :size="13" />{{ $t('sign-in-way-exists') }}
                    </p>
                    <template v-else-if="newFlowOrdered.length">
                      <p class="builder-msg">
                        {{ $t('new-way-preview') }}
                        <span class="way-chain way-chain-inline">
                          <template v-for="(m, i) in newFlowOrdered" :key="m">
                            <span v-if="i > 0" class="way-and" aria-hidden="true"><Icon name="plus" :size="10" /></span>
                            <span class="way-method">{{ $t('method-' + m) }}</span>
                          </template>
                        </span>
                      </p>
                      <p v-if="newFlowRedundantVs" class="builder-msg builder-msg-warn">
                        <Icon name="alert" :size="13" />{{ $t('sign-in-way-redundant', { methods: methodList(newFlowRedundantVs.methods) }) }}
                      </p>
                      <p v-if="newFlowSupersedes.length" class="builder-msg builder-msg-warn">
                        <Icon name="alert" :size="13" />{{ $t('sign-in-way-replaces', { methods: supersededSummary }) }}
                      </p>
                      <p v-if="newFlowIsCodeOnly" class="builder-msg builder-msg-warn">
                        <Icon name="alert" :size="13" />{{ $t('flow-code-only-warning') }}
                      </p>
                    </template>
                    <p v-else class="builder-msg builder-msg-hint">{{ $t('nothing-picked-yet') }}</p>
                  </div>

                  <button
                    type="button"
                    class="btn btn-primary btn-sm builder-add"
                    :disabled="flowsSaving || newFlowOrdered.length === 0 || newFlowIsDuplicate"
                    @click="addFlow"
                  >
                    <LoadingSpinner v-if="flowsSaving" :size="13" />
                    <Icon v-else name="plus" :size="13" />
                    {{ $t('add') }}
                  </button>
                </div>
              </div>

              <div
                class="ways-status"
                :class="{ 'has-msg': flowsMessage || flowsError || flowsSaved }"
                role="status"
              >
                <p v-if="flowsMessage" class="status status-error">
                  <Icon name="alert" :size="13" />{{ flowsMessage }}
                </p>
                <p v-else-if="flowsError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(flowsError) }}
                </p>
                <template v-else-if="flowsSaved">
                  <p class="status status-ok">
                    <Icon name="check" :size="13" />{{ $t('sign-in-methods-updated') }}
                  </p>
                  <p class="status status-note">{{ $t('other-sessions-signed-out') }}</p>
                </template>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ $t('authenticator-apps') }}</h3>
                <p class="panel-note">{{ $t('totp-section-hint') }}</p>
              </div>
              <span class="badge" :class="user?.totpEnabled ? 'badge-success' : 'badge-neutral'">
                {{ user?.totpEnabled ? $t('enabled') : $t('disabled') }}
              </span>
            </div>

            <p v-if="credentialsLoading" class="panel-state">
              <LoadingSpinner :size="14" />{{ $t('loading') }}
            </p>

            <div v-else-if="authenticators.length === 0" class="empty">
              <span class="empty-icon" aria-hidden="true"><Icon name="lock" :size="18" /></span>
              <p class="empty-title">{{ $t('no-authenticators') }}</p>
            </div>

            <ul v-else class="pk-list">
              <li v-for="cred in authenticators" :key="cred.id" class="pk-row">
                <template v-if="renamingId === cred.id">
                  <label class="sr-only" :for="'rename-' + cred.id">{{ $t('authenticator-name') }}</label>
                  <input
                    :id="'rename-' + cred.id"
                    :ref="setRenameInput"
                    v-model="renameValue"
                    class="input input-sm pk-input"
                    maxlength="255"
                    :disabled="savingRename"
                    @keyup.enter="submitRename(cred)"
                    @keyup.esc="cancelRename"
                  >
                  <div class="pk-actions">
                    <button type="button" class="btn btn-primary btn-sm" :disabled="savingRename" @click="submitRename(cred)">
                      <LoadingSpinner v-if="savingRename" :size="12" />
                      {{ $t('save') }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" :disabled="savingRename" @click="cancelRename">
                      {{ $t('cancel') }}
                    </button>
                  </div>
                </template>

                <template v-else>
                  <span class="pk-icon" aria-hidden="true"><Icon name="lock" :size="14" /></span>
                  <div class="pk-text">
                    <span class="pk-name" :title="displayName(cred)">{{ displayName(cred) }}</span>
                    <span v-if="formatDay(cred.createdAt)" class="pk-meta">{{ $t('added-on', { date: formatDay(cred.createdAt) }) }}</span>
                  </div>
                  <div class="pk-actions">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-icon"
                      :title="$t('rename')"
                      :aria-label="$t('rename')"
                      :disabled="removingId === cred.id"
                      @click="startRename(cred)"
                    >
                      <Icon name="pencil" :size="13" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger-ghost btn-sm btn-icon"
                      :title="$t('remove-authenticator')"
                      :aria-label="$t('remove-authenticator')"
                      :disabled="removingId === cred.id"
                      @click="removeCredential(cred)"
                    >
                      <LoadingSpinner v-if="removingId === cred.id" :size="13" />
                      <Icon v-else name="trash" :size="13" />
                    </button>
                  </div>
                </template>
              </li>
            </ul>

            <div class="panel-foot">
              <div class="panel-status" role="status">
                <p v-if="totpError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(totpError) }}
                </p>
              </div>
              <div class="panel-actions">
                <RouterLink to="/setuptotp" class="btn btn-primary btn-sm">
                  <Icon name="plus" :size="13" />{{ $t('add-authenticator') }}
                </RouterLink>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ $t('passkeys') }}</h3>
                <p class="panel-note">{{ $t('passkey-section-hint') }}</p>
              </div>
              <span v-if="passkeys.length" class="badge badge-neutral">{{ passkeys.length }}</span>
            </div>

            <p v-if="credentialsLoading" class="panel-state">
              <LoadingSpinner :size="14" />{{ $t('loading') }}
            </p>

            <div v-else-if="passkeys.length === 0" class="empty">
              <span class="empty-icon" aria-hidden="true"><Icon name="lock" :size="18" /></span>
              <p class="empty-title">{{ $t('no-passkeys') }}</p>
              <p class="empty-note">{{ $t('no-passkeys-hint') }}</p>
            </div>

            <ul v-else class="pk-list">
              <li v-for="pk in passkeys" :key="pk.id" class="pk-row">
                <template v-if="renamingId === pk.id">
                  <label class="sr-only" :for="'rename-' + pk.id">{{ $t('passkey-name') }}</label>
                  <input
                    :id="'rename-' + pk.id"
                    :ref="setRenameInput"
                    v-model="renameValue"
                    class="input input-sm pk-input"
                    maxlength="255"
                    :disabled="savingRename"
                    @keyup.enter="submitRename(pk)"
                    @keyup.esc="cancelRename"
                  >
                  <div class="pk-actions">
                    <button type="button" class="btn btn-primary btn-sm" :disabled="savingRename" @click="submitRename(pk)">
                      <LoadingSpinner v-if="savingRename" :size="12" />
                      {{ $t('save') }}
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" :disabled="savingRename" @click="cancelRename">
                      {{ $t('cancel') }}
                    </button>
                  </div>
                </template>

                <template v-else>
                  <span class="pk-icon" aria-hidden="true"><Icon name="lock" :size="14" /></span>
                  <div class="pk-text">
                    <span class="pk-name" :title="displayName(pk)">{{ displayName(pk) }}</span>
                    <span v-if="pk.passkey?.isBackedUp" class="badge badge-success">{{ $t('passkey-synced') }}</span>
                    <span v-else-if="pk.passkey?.isBackupEligible" class="badge badge-accent">
                      {{ $t('passkey-sync-eligible') }}
                    </span>
                  </div>
                  <div class="pk-actions">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-icon"
                      :title="$t('rename-passkey')"
                      :aria-label="$t('rename-passkey-named', { name: displayName(pk) })"
                      :disabled="removingId === pk.id"
                      @click="startRename(pk)"
                    >
                      <Icon name="pencil" :size="13" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger-ghost btn-sm btn-icon"
                      :title="$t('remove-passkey')"
                      :aria-label="$t('remove-passkey-named', { name: displayName(pk) })"
                      :disabled="removingId === pk.id"
                      @click="removeCredential(pk)"
                    >
                      <LoadingSpinner v-if="removingId === pk.id" :size="13" />
                      <Icon v-else name="trash" :size="13" />
                    </button>
                  </div>
                </template>
              </li>
            </ul>

            <div class="panel-foot panel-foot-split">
              <!-- Kept in the DOM whether or not it has anything to say, so that
                   a failure that arrives later is announced rather than missed. -->
              <div class="panel-status pk-foot-status" :class="{ 'has-msg': passkeyError }" role="status">
                <p v-if="passkeyError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(passkeyError) }}
                </p>
              </div>
              <!-- Option on the left, its action on the right - the switch reads
                   as a setting for the passkey being added, not a stray control. -->
              <button
                type="button"
                role="switch"
                class="switch"
                :class="{ on: passkeyAlone }"
                :aria-checked="passkeyAlone"
                @click="passkeyAlone = !passkeyAlone"
              >
                <span class="switch-track" aria-hidden="true"><span class="switch-knob" /></span>
                <span class="switch-label">{{ $t('passkey-sign-in-alone') }}</span>
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="registeringPasskey"
                @click="addPasskey"
              >
                <LoadingSpinner v-if="registeringPasskey" :size="13" />
                <Icon v-else name="plus" :size="13" />
                {{ $t('add-passkey') }}
              </button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ $t('active-sessions') }}</h3>
                <p class="panel-note">{{ $t('sessions-section-hint') }}</p>
              </div>
            </div>

            <div class="panel-foot">
              <div class="panel-status" role="status">
                <p v-if="sessionsError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(sessionsError) }}
                </p>
                <p v-else-if="sessionsEnded" class="status status-ok">
                  <Icon name="check" :size="13" />{{ $t('logout-all-done') }}
                </p>
              </div>
              <div class="panel-actions">
                <button
                  type="button"
                  class="btn btn-danger-ghost btn-sm"
                  :disabled="signingOutAll"
                  @click="logoutEverywhere"
                >
                  <LoadingSpinner v-if="signingOutAll" :size="13" />
                  {{ $t('logout-all-sessions') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* -- Page frame --------------------------------------------------------------
   Rail and facts stack down the left, the pane spans both of their rows on the
   right. Below 900px the three become one column, facts last. */
.account-page {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  grid-template-areas:
    'rail  pane'
    'facts pane';
  grid-template-rows: auto 1fr;
  align-items: start;
  gap: var(--space-6) var(--space-7);
  width: 100%;
  max-width: var(--container);
  margin-inline: auto;
  padding: var(--space-7) var(--space-6) var(--space-8);
}

.rail  { grid-area: rail; }
.facts { grid-area: facts; }

/* Capped so a panel is only ever as wide as the form inside it. Left to fill
   the column, a card stretches past 700px and its fields either sprawl with it
   or sit in a puddle of empty card. The page still uses --container, so its
   outer edges keep lining up with the nav and footer. */
.pane {
  grid-area: pane;
  min-width: 0;
  max-width: 36rem;
}

@media (max-width: 900px) {
  .account-page {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: 'rail' 'pane' 'facts';
    grid-template-rows: auto;
    gap: var(--space-5);
    padding: var(--space-6) var(--space-4) var(--space-7);
  }
  /* Once everything is in one column the cap has nothing to protect the pane
     from, and holding it would leave a gutter beside the panels only. */
  .pane { max-width: none; }
}

/* -- Identity -- */
.identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.avatar {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: linear-gradient(140deg, var(--accent-purple), var(--accent));
  /* A hairline of page colour between the fill and its glow keeps the disc from
     bleeding into the surface behind it. */
  box-shadow: 0 0 0 1px var(--surface-sunken), 0 0 0 3px var(--accent-ring);
  color: #fff;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.identity-text { min-width: 0; }

.identity-name {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--text);
  margin: 0 0 5px;
  word-break: break-word;
}

.identity-badges {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

/* -- Rail navigation ---------------------------------------------------------
   The selected tab is marked by a filled bar rather than colour alone, so it
   still reads when the accent is hard to pick out. */
.rail-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rail-link {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  padding: 9px 12px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  text-align: left;
  cursor: pointer;
  transition: background var(--t), color var(--t);
}

.rail-link:hover {
  background: var(--surface);
  color: var(--text-secondary);
}

.rail-link.active {
  background: var(--accent-ring);
  color: var(--accent-light);
  font-weight: 600;
}

/* The marker sits in the gutter of the rail on desktop and underlines the tab
   once the rail turns horizontal. */
.rail-link.active::before {
  content: '';
  position: absolute;
  inset-block: 7px;
  inset-inline-start: -9px;
  width: 3px;
  border-radius: var(--radius-pill);
  background: var(--accent-light);
}

.rail-link-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-link-note {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

.rail-link.active .rail-link-note { color: var(--accent-light); }

.dirty-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--accent-light);
}

@media (max-width: 900px) {
  /* The rail becomes a scrolling strip, so the pane starts near the top. */
  .rail-nav {
    flex-direction: row;
    gap: var(--space-1);
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--border);
    /* Deep enough that the marker below each tab clears the scroll container's
       clip, which overflow-x turns on for both axes. */
    padding-bottom: var(--space-3);
  }
  .rail-nav::-webkit-scrollbar { display: none; }
  .rail-link { width: auto; flex-shrink: 0; }
  .rail-link.active::before {
    inset-block: auto -7px;
    inset-inline: 10px;
    width: auto;
    height: 2px;
  }
}

/* -- Account facts -- */
.facts {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  border-top: 1px solid var(--border);
  padding-top: var(--space-5);
}

.facts-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-faint);
  margin: 0;
}

.fact-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin: 0;
}

.fact {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.fact-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
}

.fact-value {
  font-size: 0.83rem;
  color: var(--text-secondary);
  margin: 0;
  min-width: 0;
}

.id-chip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-faint);
  padding: 5px 8px;
  cursor: pointer;
  transition: background var(--t), border-color var(--t), color var(--t);
}

.id-chip:hover {
  background: var(--border);
  border-color: var(--border-strong);
  color: var(--text-muted);
}

.id-chip.copied {
  background: var(--success-bg);
  border-color: var(--success-border);
  color: var(--success);
}

.id-text {
  flex-grow: 1;
  min-width: 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-chip.copied .id-text { color: var(--success); }

@media (max-width: 900px) {
  .fact-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: var(--space-4);
  }
}

/* -- Pane heading -- */
.pane-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-5);
}

.pane-head-text { min-width: 0; }

.pane-title {
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--text);
  margin: 0;
}

.pane-subtitle {
  font-size: 0.85rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 5px 0 0;
  max-width: 60ch;
}

/* -- Panels ------------------------------------------------------------------
   One panel per topic: what it is (head), what you change (body), and what you
   press (foot). The foot is recessed to the page colour so the action bar reads
   as a tray under the fields rather than another row of them. */
.panel-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) 0;
}

.panel-head-text { min-width: 0; }

.panel-heading {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.panel-note {
  font-size: 0.82rem;
  color: var(--text-dim);
  line-height: 1.5;
  margin: 4px 0 0;
  max-width: 56ch;
}

.panel-body { padding: var(--space-5); }

.panel-head + .panel-body { padding-top: var(--space-4); }

/* A panel that is only a heading and an action still needs air under the text. */
.panel-head + .panel-foot { margin-top: var(--space-5); }

/* Content that fills the panel edge to edge rather than sitting in a padded
   body - the passkey list and the two states that stand in for it - takes a
   rule under the head, so the first row doesn't read as part of the heading. */
.panel-head + .pk-list,
.panel-head + .empty,
.panel-head + .panel-state {
  margin-top: var(--space-4);
  border-top: 1px solid var(--border);
}

.panel-head + .empty { padding-top: var(--space-6); }

.panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  background: var(--surface-sunken);
  border-top: 1px solid var(--border);
  padding: var(--space-3) var(--space-5);
}

/* Present even when empty, so the row keeps its shape and a screen reader has
   a stable region to announce into. */
.panel-status {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1 1 14ch;
  min-width: 0;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-inline-start: auto;
}

.status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.8rem;
  line-height: 1.4;
  margin: 0;
}

.status-error { color: var(--danger); }
.status-ok { color: var(--success); }
/* The consequence of the action, under the confirmation of it - quieter than the
   result itself, and indented past the icon so the two read as one message. */
.status-note {
  color: var(--text-faint);
  padding-inline-start: calc(13px + var(--space-2));
}

.panel-state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: 0;
  padding: var(--space-5);
}

/* -- Fields ------------------------------------------------------------------
   Stacked, not columned: a fixed label column has to be sized for the longest
   translation, and every other language then sits in a trench of dead space.
   Width is held by the pane instead, so every control lines up on one edge. */
.form-stack {
  display: grid;
  gap: var(--space-4);
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-height: 17px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: var(--space-3);
}

.inline-note {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  font-weight: 500;
}

.inline-note-ok { color: var(--success); }
.inline-note-warn { color: var(--warning); }

/* -- Passkeys -- */
.pk-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.pk-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  transition: background var(--t-fast);
}

.pk-row:last-child { border-bottom: none; }
.pk-row:hover { background: rgba(255, 255, 255, 0.02); }

.pk-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.pk-text {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1 1 auto;
  min-width: 0;
}

.pk-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pk-input {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 20rem;
}

.pk-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  margin-inline-start: auto;
}

/* -- Empty state -- */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-7) var(--space-5);
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  color: var(--text-dim);
  margin-bottom: var(--space-1);
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
}

.empty-note {
  font-size: 0.82rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin: 0;
  max-width: 44ch;
}

@media (max-width: 620px) {
  .panel-foot { align-items: stretch; }
  .panel-actions { margin-inline-start: 0; }
  /* The row stays on one line at every width - wrapping it puts the icon, the
     name and the buttons on three lines each and the list stops being a list.
     The name truncates instead. */
  .pk-row { padding-inline: var(--space-3); }
}

/* -- Ways to sign in --------------------------------------------------------
   A grid of cards, one per way into the account. Each card shows the methods it
   needs chained by "+", carries an honest strength label, and the add tile is a
   peer in the same grid so making another reads as the next card. */
.ways {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.ways-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-3);
}

.way {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-height: 104px;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface-sunken);
}

/* The strength shows as a coloured left edge, so a weak way is spottable
   without reading the label. */
.way::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  border-radius: var(--radius) 0 0 var(--radius);
  background: var(--strength);
}

.way-strong { --strength: var(--success); }
.way-basic  { --strength: var(--border-strong); }
.way-weak   { --strength: var(--warning); }

.way-chain {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding-right: 26px; /* clear of the remove button */
}

.way-method {
  padding: 4px 11px;
  border-radius: var(--radius-pill);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.way-and {
  display: inline-flex;
  align-items: center;
  color: var(--text-faint);
}

.way-strength {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-dim);
}

.way-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--strength);
}

.way-weak .way-strength { color: var(--warning); }

.way-redundant {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 0.76rem;
  line-height: 1.4;
  color: var(--warning);
}

.way-redundant svg { flex-shrink: 0; margin-top: 2px; }

/* A ghost trash tucked in the corner - present but quiet until hovered. */
.way-remove {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
}

.way-remove:hover:not(:disabled) { background: var(--danger-bg); color: var(--danger); }
.way-remove:disabled { opacity: 0.35; cursor: not-allowed; }

/* The add tile: dashed, centred, the same footprint as a way. */
.way-add { display: flex; }

.way-add-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 104px;
  padding: var(--space-4);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: transparent;
  color: var(--text-dim);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color var(--t-fast), color var(--t-fast), background var(--t-fast);
}

.way-add-btn:hover {
  border-color: var(--accent);
  color: var(--text-secondary);
  background: var(--accent-ring);
}

.way-add-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-pill);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-secondary);
}

/* -- New-way builder --------------------------------------------------------
   Revealed only when adding. Methods are toggle pills, not bare checkboxes:
   click to include, and the selected set lights up. */
.builder {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: var(--surface);
}

.builder-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.builder-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
}

.builder-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.builder-foot {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-1);
}

.builder-msgs {
  flex: 1 1 12ch;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.builder-msg {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.builder-msg-hint { color: var(--text-faint); }
.builder-msg-warn { color: var(--warning); }
.way-chain-inline { display: inline-flex; padding-right: 0; }
.builder-add { margin-inline-start: auto; }

.ways-status {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.ways-status:not(.has-msg) { display: none; }

.flow-toggles {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.flow-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px 12px 7px 10px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  background: var(--surface-sunken);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color var(--t-fast), background var(--t-fast), color var(--t-fast);
}

.flow-toggle:hover { border-color: var(--border-strong); }

.flow-toggle.on {
  border-color: var(--accent);
  background: var(--accent-ring);
  color: var(--text);
}

/* A custom check square, so the control is dark-themed instead of the browser's
   light default and stays aligned with its label. */
.flow-toggle-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  border-radius: 5px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: #fff;
  transition: border-color var(--t-fast), background var(--t-fast);
}

.flow-toggle.on .flow-toggle-box {
  border-color: var(--accent);
  background: var(--accent);
}

/* -- Passkey foot -----------------------------------------------------------
   The "sign in alone" switch sits on the left as an option, its Add button on
   the right, and any error takes its own full-width line above the two. The
   status stays mounted for the live region; with no message it is a zero-height
   row, so row-gap is off and the gap is added back only when it has content. */
.panel-foot-split { row-gap: 0; }
.panel-foot-split .switch { margin-inline-end: auto; }

.pk-foot-status { flex: 1 1 100%; margin: 0; }
.pk-foot-status.has-msg { margin-bottom: var(--space-2); }

/* -- Switch -----------------------------------------------------------------
   A dark, self-contained toggle for a persistent setting - replaces the light
   native checkbox that broke against the dark panel. */
.switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.82rem;
}

.switch-track {
  position: relative;
  width: 34px;
  height: 20px;
  flex-shrink: 0;
  border-radius: var(--radius-pill);
  background: var(--border-strong);
  transition: background var(--t-fast);
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform var(--t-fast);
}

.switch.on .switch-track { background: var(--accent); }
.switch.on .switch-knob { transform: translateX(14px); }

.switch:focus-visible { outline: none; }
.switch:focus-visible .switch-track { box-shadow: var(--focus-ring); }

.switch-label { line-height: 1.3; text-align: left; }

.pk-meta {
  font-size: 0.75rem;
  color: var(--text-faint);
}
</style>
