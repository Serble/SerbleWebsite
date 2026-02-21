<script>
import { ensureLoggedIn, setCookie } from "@/assets/js/utils.js";
import LanguageDropdown from "@/components/LanguageDropdown.vue";
import { inject, ref, watch, onMounted } from "vue";
import { useI18n } from 'vue-i18n';
import { getSupportedLocale, toServerLocale } from '@/assets/js/languages.js';
import { editUser, getPasskeys, deletePasskey, registerPasskey } from '@/assets/js/serble.js';

export default {
  components: {LanguageDropdown},
  setup() {
    const user = ensureLoggedIn();
    const errors = ref([]);
    const successMessage = ref(false);
    const { locale } = useI18n({ useScope: 'global' });
    const userStore = inject('userStore');

    const username = ref('');
    const email = ref('');
    const password = ref('');
    const confirmPassword = ref('');

    const selectedLanguage = ref(getSupportedLocale(locale.value) || 'en');

    watch(
      () => locale.value,
      (nextLocale) => {
        const normalized = getSupportedLocale(nextLocale);
        if (normalized && normalized !== selectedLanguage.value) {
          selectedLanguage.value = normalized;
        }
      },
      { immediate: true }
    );

    watch(
      () => user.value,
      (nextUser) => {
        if (!nextUser) {
          return;
        }

        username.value = nextUser.username ?? '';
        email.value = nextUser.email ?? '';

        const normalized = getSupportedLocale(nextUser.language ?? nextUser.Language);
        if (normalized && normalized !== selectedLanguage.value) {
          selectedLanguage.value = normalized;
        }
      },
      { immediate: true }
    );

    watch(selectedLanguage, (nextLocale) => {
      const normalized = getSupportedLocale(nextLocale);
      if (!normalized) {
        return;
      }

      if (locale.value !== normalized) {
        locale.value = normalized;
      }

      setCookie('locale', normalized, 9999);
    });

    const permStr = user.permLevel === 2 ? "Admin" : "Normal";
    const premiumStr = "Free";  // Default

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let successTimeout = null;

    const save = async () => {
      errors.value = [];
      successMessage.value = false;
      if (successTimeout) {
        clearTimeout(successTimeout);
        successTimeout = null;
      }

      if (!username.value.trim()) {
        errors.value.push('invalidusername');
      }

      const currentUser = user.value;
      const trimmedEmail = email.value.trim();
      if (trimmedEmail && trimmedEmail !== (currentUser?.email ?? '')) {
        if (!emailRegex.test(trimmedEmail)) {
          errors.value.push('invalidemail');
        }
      }

      if (password.value && password.value !== confirmPassword.value) {
        errors.value.push('passworddifferent');
      }

      if (errors.value.length > 0) {
        return;
      }

      const edits = [];

      if (currentUser?.username !== username.value.trim()) {
        edits.push({ field: 'Username', newValue: username.value.trim() });
      }

      if ((currentUser?.email ?? '') !== trimmedEmail) {
        edits.push({ field: 'Email', newValue: trimmedEmail });
      }

      const normalizedLocale = getSupportedLocale(selectedLanguage.value);
      const serverLocale = toServerLocale(normalizedLocale);
      const currentServerLocale = currentUser?.language ?? currentUser?.Language ?? '';
      if (serverLocale && currentServerLocale !== serverLocale) {
        edits.push({ field: 'Language', newValue: serverLocale });
      }

      if (password.value) {
        edits.push({ field: 'Password', newValue: password.value });
      }

      if (edits.length === 0) {
        return;
      }

      const result = await editUser(edits);
      if (!result.success) {
        if (result.error === 'name-taken') {
          errors.value.push('usernametaken');
        } else if (result.error === 'email-invalid') {
          errors.value.push('invalidemail');
        }
        return;
      }

      if (result.user && userStore?.updateUser) {
        userStore.updateUser(result.user);
      }

      password.value = '';
      confirmPassword.value = '';

      successMessage.value = true;
      successTimeout = setTimeout(() => {
        successMessage.value = false;
      }, 4000);
    };

    const disabling2fa = ref(false);

    const disable2fa = async () => {
      if (disabling2fa.value) return;
      disabling2fa.value = true;
      const result = await editUser([{ field: 'TotpEnabled', newValue: 'false' }]);
      disabling2fa.value = false;
      if (!result.success) return;
      if (userStore?.state?.user) {
        userStore.updateUser({ ...userStore.state.user, totpEnabled: false });
      }
    };

    // ── Passkeys ──
    const passkeys = ref([]);
    const passkeysLoading = ref(false);
    const passkeyError = ref('');
    const registeringPasskey = ref(false);
    const deletingPasskey = ref('');

    const loadPasskeys = async () => {
      passkeysLoading.value = true;
      const result = await getPasskeys();
      passkeysLoading.value = false;
      if (result.success) passkeys.value = result.passkeys;
    };

    const addPasskey = async () => {
      if (registeringPasskey.value) return;
      passkeyError.value = '';
      registeringPasskey.value = true;
      const result = await registerPasskey();
      registeringPasskey.value = false;
      if (!result.success) {
        if (result.error === 'cancelled') {
          passkeyError.value = 'Registration was cancelled.';
        } else if (result.error === 'webauthn-unavailable') {
          passkeyError.value = 'Passkeys are not available. This page must be served over HTTPS.';
        } else {
          passkeyError.value = 'Failed to register passkey. Please try again.';
        }
        return;
      }
      await loadPasskeys();
    };

    const removePasskey = async (name) => {
      if (deletingPasskey.value) return;
      deletingPasskey.value = name;
      const result = await deletePasskey(name);
      deletingPasskey.value = '';
      if (result.success) {
        passkeys.value = passkeys.value.filter(p => p.name !== name);
      }
    };

    onMounted(loadPasskeys);

    return {
      user,
      errors,
      successMessage,
      permStr,
      premiumStr,
      selectedLanguage,
      username,
      email,
      password,
      confirmPassword,
      save,
      disable2fa,
      disabling2fa,
      passkeys,
      passkeysLoading,
      passkeyError,
      registeringPasskey,
      deletingPasskey,
      addPasskey,
      removePasskey,
    };
  }
};
</script>

<template>
  <div class="account-page">

    <!-- Profile header -->
    <div class="profile-header bg-dark border rounded-3 d-flex align-items-center gap-4 mb-4">
      <img
        class="avatar rounded-circle flex-shrink-0"
        src="https://st3.depositphotos.com/15648834/17930/v/600/depositphotos_179308454-stock-illustration-unknown-person-silhouette-glasses-profile.jpg"
        alt="Profile picture"
      >
      <div>
        <h4 class="mb-1">{{ user.username }}</h4>
        <div class="d-flex gap-2 flex-wrap">
          <span class="badge-pill badge-account">{{ $t(permStr) }}</span>
          <span class="badge-pill badge-premium">{{ $t(premiumStr) }}</span>
          <span v-if="user.totpEnabled" class="badge-pill badge-2fa">2FA</span>
        </div>
      </div>
    </div>

    <!-- Success toast -->
    <transition name="fade">
      <div v-if="successMessage" class="alert alert-success d-flex align-items-center mb-4 py-2" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="me-2 flex-shrink-0" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>
        <span>{{ $t('save-changes-success') }}</span>
      </div>
    </transition>

    <!-- Profile settings card -->
    <div class="form-card bg-dark border rounded-3 mb-4">
      <div class="card-header-row px-4 py-3 border-bottom border-secondary">
        <h6 class="mb-0 fw-semibold">{{ $t('profile-settings') }}</h6>
      </div>

      <!-- Username -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label" for="username">{{ $t('username') }}</label>
        <input
          id="username"
          type="text"
          class="form-control dark-input"
          :class="{ 'is-invalid': errors.includes('invalidusername') || errors.includes('usernametaken') }"
          :placeholder="$t('username')"
          v-model="username"
        >
        <p v-if="errors.includes('invalidusername')" class="field-error">{{ $t('invalid-username') }}</p>
        <p v-else-if="errors.includes('usernametaken')" class="field-error">{{ $t('username-taken') }}</p>
      </div>

      <!-- Email -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label" for="email">
          {{ $t('email') }}
          <span v-if="user.email && user.email.trim() && user.verifiedEmail" class="verified-badge">✓ {{ $t('verified') }}</span>
          <span v-else-if="user.email && user.email.trim()" class="unverified-badge">{{ $t('not-verified') }}</span>
        </label>
        <input
          id="email"
          type="text"
          class="form-control dark-input"
          :class="{ 'is-invalid': errors.includes('invalidemail') }"
          :placeholder="$t('email')"
          v-model="email"
        >
        <p v-if="errors.includes('invalidemail')" class="field-error">{{ $t('invalid-email') }}</p>
      </div>

      <!-- Language -->
      <div class="form-section">
        <label class="section-label" for="language">{{ $t('language') }}</label>
        <LanguageDropdown
          id="language"
          v-model="selectedLanguage"
          :placeholder="$t('language')"
          class="form-control dark-input"
        />
      </div>
    </div>

    <!-- Security card -->
    <div class="form-card bg-dark border rounded-3 mb-4">
      <div class="card-header-row px-4 py-3 border-bottom border-secondary">
        <h6 class="mb-0 fw-semibold">{{ $t('security') }}</h6>
      </div>

      <!-- Password -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label" for="password">{{ $t('change-password') }}</label>
        <p class="section-hint">Leave blank to keep your current password.</p>
        <div class="row g-3">
          <div class="col-md-6">
            <label class="field-label" for="password">{{ $t('password') }}</label>
            <input
              id="password"
              type="password"
              class="form-control dark-input"
              :class="{ 'is-invalid': errors.includes('passworddifferent') }"
              placeholder="••••••••••••"
              v-model="password"
            >
          </div>
          <div class="col-md-6">
            <label class="field-label" for="confirmPassword">{{ $t('confirm-password') }}</label>
            <input
              id="confirmPassword"
              type="password"
              class="form-control dark-input"
              :class="{ 'is-invalid': errors.includes('passworddifferent') }"
              placeholder="••••••••••••"
              v-model="confirmPassword"
            >
          </div>
        </div>
        <p v-if="errors.includes('passworddifferent')" class="field-error mt-1">{{ $t('passwords-dont-match') }}</p>
      </div>

      <!-- 2FA -->
      <div class="form-section border-bottom border-secondary">
        <label class="section-label">{{ $t('2fa') }}</label>
        <p class="section-hint">Protect your account with a time-based one-time password app.</p>
        <div v-if="user.totpEnabled" class="d-flex gap-2 flex-wrap">
          <RouterLink to="/setuptotp" class="btn btn-sm btn-outline-secondary">{{ $t('setup-totp-app') }}</RouterLink>
          <button class="btn btn-sm btn-outline-danger" @click="disable2fa" :disabled="disabling2fa">
            <span v-if="disabling2fa" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {{ $t('disable-2fa') }}
          </button>
        </div>
        <RouterLink v-else to="/setuptotp" class="btn btn-sm btn-success">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/>
          </svg>
          {{ $t('setup-2fa') }}
        </RouterLink>
      </div>

      <!-- Passkeys -->
      <div class="form-section">
        <label class="section-label">{{ $t('passkeys') }}</label>
        <p class="section-hint">Sign in without a password using a passkey stored on your device.</p>

        <div v-if="passkeyError" class="passkey-error mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" class="flex-shrink-0"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/></svg>
          {{ passkeyError }}
        </div>

        <div v-if="passkeysLoading" class="passkey-empty">
          <span class="spinner-border spinner-border-sm me-2" role="status"></span> Loading...
        </div>
        <div v-else-if="passkeys.length === 0" class="passkey-empty">{{ $t('no-passkeys') }}</div>
        <ul v-else class="passkey-list">
          <li v-for="pk in passkeys" :key="pk.name" class="passkey-item">
            <div class="passkey-info">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16" class="passkey-icon"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
              <span class="passkey-name" :title="pk.name">{{ pk.name }}</span>
              <span v-if="pk.isBackedUp" class="passkey-badge passkey-badge-synced">Synced</span>
              <span v-else-if="pk.isBackupEligible" class="passkey-badge passkey-badge-eligible">Sync eligible</span>
            </div>
            <button
              class="btn btn-sm btn-outline-danger passkey-delete-btn"
              :disabled="deletingPasskey === pk.name"
              @click="removePasskey(pk.name)"
            >
              <span v-if="deletingPasskey === pk.name" class="spinner-border spinner-border-sm" role="status"></span>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
              {{ $t('remove') }}
            </button>
          </li>
        </ul>

        <button class="btn btn-sm btn-outline-primary mt-3" @click="addPasskey" :disabled="registeringPasskey">
          <span v-if="registeringPasskey" class="spinner-border spinner-border-sm me-1" role="status"></span>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-1"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/></svg>
          {{ $t('add-passkey') }}
        </button>
      </div>
    </div>

    <!-- Account info card (read-only) -->
    <div class="form-card bg-dark border rounded-3 mb-4">
      <div class="card-header-row px-4 py-3 border-bottom border-secondary">
        <h6 class="mb-0 fw-semibold">{{ $t('account-page') }}</h6>
      </div>
      <div class="form-section d-flex flex-column gap-3">
        <div class="info-row">
          <span class="info-label">{{ $t('id') }}</span>
          <code class="info-value" style="color: #ccc;">{{ user.id }}</code>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('account-type') }}</span>
          <span class="info-value">{{ $t(permStr) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">{{ $t('premium-level') }}</span>
          <span class="info-value">{{ $t(premiumStr) }}</span>
        </div>
      </div>
    </div>

    <!-- Save button -->
    <div class="d-flex justify-content-end">
      <button class="btn btn-primary px-4" @click="save">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" class="me-2">
          <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
        </svg>
        {{ $t('save-changes') }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.account-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 32px 24px;
}

/* Profile header */
.profile-header {
  padding: 24px 28px;
}

.avatar {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border: 2px solid #444;
}

.badge-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.04em;
}

.badge-account {
  background-color: #1e3a5f;
  color: #90cdf4;
}

.badge-premium {
  background-color: #3b2a0a;
  color: #f6c458;
}

.badge-2fa {
  background-color: #1a3d2b;
  color: #68d391;
}

/* Form card */
.form-card {
  overflow: hidden;
}

.card-header-row {
  background-color: rgba(255,255,255,0.03);
}

.form-section {
  padding: 18px 24px;
}

.section-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  margin-bottom: 8px;
}

.field-label {
  display: block;
  font-size: 0.82rem;
  color: #aaa;
  margin-bottom: 5px;
}

.section-hint {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 12px;
}

.field-error {
  color: #fc8181;
  font-size: 0.8rem;
  margin-top: 5px;
  margin-bottom: 0;
}

.verified-badge {
  font-size: 0.72rem;
  color: #68d391;
  font-weight: 600;
  margin-left: 6px;
  text-transform: none;
  letter-spacing: 0;
}

.unverified-badge {
  font-size: 0.72rem;
  color: #f6c458;
  font-weight: 600;
  margin-left: 6px;
  text-transform: none;
  letter-spacing: 0;
}

/* Inputs */
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

/* Read-only info rows */
.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.info-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #888;
  min-width: 110px;
  flex-shrink: 0;
}

.info-value {
  font-size: 0.85rem;
  word-break: break-all;
}

/* Success toast animation */
.fade-enter-active {
  animation: fadeSlideIn 0.3s ease-out;
}
.fade-leave-active {
  animation: fadeSlideIn 0.2s ease-in reverse;
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Passkeys */
.passkey-empty {
  font-size: 0.82rem;
  color: #555;
  padding: 8px 0;
}

.passkey-error {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #fc8181;
  background: rgba(252,129,129,0.08);
  border: 1px solid rgba(252,129,129,0.2);
  border-radius: 6px;
  padding: 7px 10px;
}

.passkey-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.passkey-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 14px;
}

.passkey-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.passkey-icon {
  color: #71717a;
  flex-shrink: 0;
}

.passkey-name {
  font-size: 0.85rem;
  color: #d4d4d8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.passkey-badge {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
  flex-shrink: 0;
}

.passkey-badge-synced {
  background: #1a3d2b;
  color: #68d391;
}

.passkey-badge-eligible {
  background: #1e3a5f;
  color: #90cdf4;
}

.passkey-delete-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
}
</style>
