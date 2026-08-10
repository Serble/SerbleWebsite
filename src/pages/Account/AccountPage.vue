<script>
/**
 * Account settings.
 *
 * Layout: a fixed left rail — who you are, where you can go, and the read-only
 * facts about the account — beside a single pane that shows one section at a
 * time. One spine down the page instead of a scatter of cards, and the pane
 * never grows past a screen, so nothing scrolls.
 *
 * Inside a pane the unit is a panel: an optional head (what this is and how it
 * stands), a body of stacked fields, and — when the panel can be acted on — a
 * recessed foot holding its status message and its buttons. Every action lives
 * in a foot, so "where do I click to apply this" has one answer everywhere.
 * Fields stack vertically at a readable measure rather than sitting in a fixed
 * label column, which kept breaking once a translation ran longer than English.
 *
 * Saving: every panel owns its own action, and the action lives in the same
 * panel as the fields it writes. The old page had one "Save changes" button at
 * the very bottom that silently applied to the profile fields and the password
 * only — 2FA and passkeys saved themselves the moment you touched them, which
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
import { editUser, getPasskeys, deletePasskey, registerPasskey, renamePasskey } from '@/assets/js/serble.js';
import { confirmDialog } from '@/assets/js/dialog.js';
import LanguageDropdown from '@/components/LanguageDropdown.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import Icon from '@/components/Icon.vue';

const SECTIONS = ['profile', 'security'];

// Passkeys used to be a section of its own — one panel plus a heading, saying
// the same thing about signing in that the security panels do — so it now sits
// under security. Links handed out while it was separate still land there.
const LEGACY_SECTIONS = { passkeys: 'security' };

function normalizeSection(id) {
  if (SECTIONS.includes(id)) return id;
  return LEGACY_SECTIONS[id] ?? 'profile';
}

// The rail is a vertical list beside the pane above this width and a horizontal
// strip above it below — which changes both the arrow keys the tablist should
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

    // ── Sections ────────────────────────────────────────────────────────────
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

    // ── Profile ─────────────────────────────────────────────────────────────
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

    // Changing the picker switches the site over straight away — the setting is
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

    // ── Password ────────────────────────────────────────────────────────────
    const password = ref('');
    const confirmPassword = ref('');
    const passwordError = ref('');
    const passwordSaving = ref(false);
    const passwordSaved = ref(false);

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
      const result = await editUser([{ field: 'Password', newValue: password.value }]);
      passwordSaving.value = false;

      if (!result.success) {
        passwordError.value = 'unknown-error';
        return;
      }

      if (result.user && userStore?.updateUser) userStore.updateUser(result.user);
      password.value = '';
      confirmPassword.value = '';
      passwordSaved.value = true;
    }

    // ── Two-factor ──────────────────────────────────────────────────────────
    const disabling2fa = ref(false);

    async function disable2fa() {
      if (disabling2fa.value) return;
      if (!await confirmDialog({
        title: t('disable-2fa'),
        message: t('disable-2fa-confirm'),
        confirmLabel: t('disable'),
        danger: true,
      })) return;

      disabling2fa.value = true;
      const result = await editUser([{ field: 'TotpEnabled', newValue: 'false' }]);
      disabling2fa.value = false;
      if (!result.success) return;
      if (userStore?.state?.user) {
        userStore.updateUser({ ...userStore.state.user, totpEnabled: false });
      }
    }

    // ── Passkeys ────────────────────────────────────────────────────────────
    const passkeys = ref([]);
    // Starts true: the list is fetched on mount, and opening straight onto
    // ?tab=passkeys would otherwise flash "no passkeys" before the answer lands.
    const passkeysLoading = ref(true);
    const passkeyError = ref('');
    const registeringPasskey = ref(false);
    const deletingPasskey = ref('');
    const renamingPasskey = ref('');
    const renameValue = ref('');
    const savingRename = ref(false);
    const renameInput = ref(null);

    // A template ref written from inside v-for arrives as an array, and the
    // unmount of the previous row can land after the mount of the next one.
    // Ignoring the null call sidesteps both.
    function setRenameInput(el) {
      if (el) renameInput.value = el;
    }

    async function loadPasskeys() {
      passkeysLoading.value = true;
      const result = await getPasskeys();
      passkeysLoading.value = false;
      if (result.success) passkeys.value = result.passkeys;
    }

    async function addPasskey() {
      if (registeringPasskey.value) return;
      passkeyError.value = '';
      registeringPasskey.value = true;
      const result = await registerPasskey();
      registeringPasskey.value = false;
      if (!result.success) {
        if (result.error === 'cancelled') passkeyError.value = 'passkey-register-cancelled';
        else if (result.error === 'webauthn-unavailable') passkeyError.value = 'passkey-unavailable';
        else passkeyError.value = 'passkey-register-failed';
        return;
      }
      await loadPasskeys();
    }

    async function removePasskey(name) {
      if (deletingPasskey.value) return;
      if (!await confirmDialog({
        title: t('remove-passkey'),
        message: t('passkey-remove-confirm', { name }),
        confirmLabel: t('remove'),
        danger: true,
      })) return;

      passkeyError.value = '';
      deletingPasskey.value = name;
      const result = await deletePasskey(name);
      deletingPasskey.value = '';
      if (result.success) {
        passkeys.value = passkeys.value.filter(p => p.name !== name);
      }
    }

    function startRename(name) {
      if (savingRename.value) return;
      passkeyError.value = '';
      renamingPasskey.value = name;
      renameValue.value = name;
      // The row swaps its contents for an input, so move the caret there —
      // otherwise focus is left on a button that no longer exists.
      nextTick(() => renameInput.value?.select());
    }

    function cancelRename() {
      renamingPasskey.value = '';
      renameValue.value = '';
    }

    async function submitRename(oldName) {
      if (savingRename.value) return;
      const newName = renameValue.value.trim();
      if (!newName || newName === oldName) {
        cancelRename();
        return;
      }
      savingRename.value = true;
      const result = await renamePasskey(oldName, newName);
      savingRename.value = false;
      if (result.success) {
        const pk = passkeys.value.find(p => p.name === oldName);
        if (pk) pk.name = newName;
        cancelRename();
      } else {
        passkeyError.value = 'passkey-rename-failed';
      }
    }

    // ── Identity rail ───────────────────────────────────────────────────────
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

    // ── Lifecycle ───────────────────────────────────────────────────────────
    let railQuery = null;
    const syncRail = (event) => { railHorizontal.value = event.matches; };

    onMounted(() => {
      loadPasskeys();
      // A retired or misspelled ?tab= still opens the right pane, but the URL
      // would keep the old name — rewrite it so a link copied from here is
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
      password, confirmPassword, passwordError, passwordSaving, passwordSaved,
      canChangePassword, touchPassword, changePassword,
      disabling2fa, disable2fa,
      passkeys, passkeysLoading, passkeyError, registeringPasskey, deletingPasskey,
      renamingPasskey, renameValue, savingRename, setRenameInput,
      addPasskey, removePasskey, startRename, cancelRename, submitRename,
    };
  }
};
</script>

<template>
  <div class="account-page">

    <!-- ── Identity + navigation rail ── -->
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

    <!-- ── Read-only account facts ── -->
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

    <!-- ── Section pane ── -->
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
                <h3 class="panel-heading">{{ $t('change-password') }}</h3>
                <p class="panel-note">{{ $t('password-section-hint') }}</p>
              </div>
            </div>

            <div class="panel-body">
              <!--
                Password managers only offer to update a saved login when the
                form says which login it belongs to. Kept out of the tab order
                and out of the accessibility tree — it is machine-facing only.
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
                <p v-else-if="passwordSaved" class="status status-ok">
                  <Icon name="check" :size="13" />{{ $t('password-updated') }}
                </p>
              </div>
              <div class="panel-actions">
                <button type="submit" class="btn btn-primary btn-sm" :disabled="!canChangePassword || passwordSaving">
                  <LoadingSpinner v-if="passwordSaving" :size="13" />
                  {{ passwordSaving ? $t('saving') : $t('update-password') }}
                </button>
              </div>
            </div>
          </form>

          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-text">
                <h3 class="panel-heading">{{ $t('2fa') }}</h3>
                <p class="panel-note">{{ $t('totp-section-hint') }}</p>
              </div>
              <span class="badge" :class="user?.totpEnabled ? 'badge-success' : 'badge-neutral'">
                {{ user?.totpEnabled ? $t('enabled') : $t('disabled') }}
              </span>
            </div>

            <div class="panel-foot">
              <div class="panel-status"></div>
              <div class="panel-actions">
                <template v-if="user?.totpEnabled">
                  <RouterLink to="/setuptotp" class="btn btn-ghost btn-sm">{{ $t('setup-totp-app') }}</RouterLink>
                  <button
                    type="button"
                    class="btn btn-danger-ghost btn-sm"
                    :disabled="disabling2fa"
                    @click="disable2fa"
                  >
                    <LoadingSpinner v-if="disabling2fa" :size="13" />
                    {{ $t('disable-2fa') }}
                  </button>
                </template>
                <RouterLink v-else to="/setuptotp" class="btn btn-primary btn-sm">
                  <Icon name="lock" :size="13" />{{ $t('setup-2fa') }}
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

            <p v-if="passkeysLoading" class="panel-state">
              <LoadingSpinner :size="14" />{{ $t('loading') }}
            </p>

            <div v-else-if="passkeys.length === 0" class="empty">
              <span class="empty-icon" aria-hidden="true"><Icon name="lock" :size="18" /></span>
              <p class="empty-title">{{ $t('no-passkeys') }}</p>
              <p class="empty-note">{{ $t('no-passkeys-hint') }}</p>
            </div>

            <ul v-else class="pk-list">
              <li v-for="pk in passkeys" :key="pk.name" class="pk-row">
                <template v-if="renamingPasskey === pk.name">
                  <label class="sr-only" for="pk-rename">{{ $t('passkey-name') }}</label>
                  <input
                    id="pk-rename"
                    :ref="setRenameInput"
                    v-model="renameValue"
                    class="input input-sm pk-input"
                    :disabled="savingRename"
                    @keyup.enter="submitRename(pk.name)"
                    @keyup.esc="cancelRename"
                  >
                  <div class="pk-actions">
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      :disabled="savingRename"
                      @click="submitRename(pk.name)"
                    >
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
                    <span class="pk-name" :title="pk.name">{{ pk.name }}</span>
                    <span v-if="pk.isBackedUp" class="badge badge-success">{{ $t('passkey-synced') }}</span>
                    <span v-else-if="pk.isBackupEligible" class="badge badge-accent">
                      {{ $t('passkey-sync-eligible') }}
                    </span>
                  </div>
                  <div class="pk-actions">
                    <button
                      type="button"
                      class="btn btn-ghost btn-sm btn-icon"
                      :title="$t('rename-passkey')"
                      :aria-label="$t('rename-passkey-named', { name: pk.name })"
                      :disabled="deletingPasskey === pk.name"
                      @click="startRename(pk.name)"
                    >
                      <Icon name="pencil" :size="13" />
                    </button>
                    <button
                      type="button"
                      class="btn btn-danger-ghost btn-sm btn-icon"
                      :title="$t('remove-passkey')"
                      :aria-label="$t('remove-passkey-named', { name: pk.name })"
                      :disabled="deletingPasskey === pk.name"
                      @click="removePasskey(pk.name)"
                    >
                      <LoadingSpinner v-if="deletingPasskey === pk.name" :size="13" />
                      <Icon v-else name="trash" :size="13" />
                    </button>
                  </div>
                </template>
              </li>
            </ul>

            <div class="panel-foot">
              <!-- Kept in the DOM whether or not it has anything to say, so that
                   a failure that arrives later is announced rather than missed. -->
              <div class="panel-status" role="status">
                <p v-if="passkeyError" class="status status-error">
                  <Icon name="alert" :size="13" />{{ $t(passkeyError) }}
                </p>
              </div>
              <div class="panel-actions">
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
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<style scoped>
/* ── Page frame ──────────────────────────────────────────────────────────────
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

/* ── Identity ── */
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

/* ── Rail navigation ─────────────────────────────────────────────────────────
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

/* ── Account facts ── */
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

/* ── Pane heading ── */
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

/* ── Panels ──────────────────────────────────────────────────────────────────
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
   body — the passkey list and the two states that stand in for it — takes a
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

.panel-state {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 0.85rem;
  color: var(--text-faint);
  margin: 0;
  padding: var(--space-5);
}

/* ── Fields ──────────────────────────────────────────────────────────────────
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

/* ── Passkeys ── */
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

/* ── Empty state ── */
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
  /* The row stays on one line at every width — wrapping it puts the icon, the
     name and the buttons on three lines each and the list stops being a list.
     The name truncates instead. */
  .pk-row { padding-inline: var(--space-3); }
}
</style>
