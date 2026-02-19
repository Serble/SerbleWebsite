<script>
import { ensureLoggedIn, setCookie } from "@/assets/js/utils.js";
import LanguageDropdown from "@/components/LanguageDropdown.vue";
import { inject, ref, watch } from "vue";
import { useI18n } from 'vue-i18n';
import { getSupportedLocale, toServerLocale } from '@/assets/js/languages.js';
import { editUser } from '@/assets/js/serble.js';

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
      save
    };
  }
};
</script>

<template>
  <div class="row">
    <div class="col-md-3 border-right">
      <div class="d-flex flex-column align-items-center text-center p-3 py-5"><img class="rounded-circle mt-5" width="150px" src="https://st3.depositphotos.com/15648834/17930/v/600/depositphotos_179308454-stock-illustration-unknown-person-silhouette-glasses-profile.jpg" alt="Generic profile picture">
        <span class="font-weight-bold">{{ user.username }}</span><span> </span></div>
    </div>
    <div class="col-md-5 border-right">
      <div class="p-3 py-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4 class="text-right">{{ $t('profile-settings') }}</h4>
        </div>

        <transition name="fade">
          <div v-if="successMessage" class="alert alert-success d-flex align-items-center" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-check-circle-fill me-2 flex-shrink-0" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            <span>{{ $t('save-changes-success') || 'Changes saved successfully!' }}</span>
          </div>
        </transition>

        <div class="row mt-2">
          <div class="col-md-6"><label class="labels">{{ $t('username') }}</label><input style="background-color: rgb(34, 34, 34); color: #ffffff" type="text" class="form-control" v-bind:placeholder="$t('username')" v-model="username" id="username"></div>
          <p v-if="errors.includes('invalidusername')" style="color: red; font-size: 13px">{{ $t('invalid-username') }}</p>
          <p v-else-if="errors.includes('usernametaken')" style="color: red; font-size: 13px">{{ $t('username-taken') }}</p>
        </div>
        <div class="row mt-3">
          <div class="col-md-12">
            <label class="labels">
              {{ $t('email') }}
              <span v-if="!user.email || !user.email.trim()"></span>
              <span v-else-if="user.verifiedEmail" class='text-success'>({{ $t('verified') }})</span>
              <span v-else class='text-warning'>({{ $t('not-verified') }})</span>
            </label><input style="background-color: rgb(34, 34, 34); color: #ffffff" type="text" class="form-control" placeholder="{{ $t('email') }}" v-model="email" id="email">
          </div>
          <p v-if="errors.includes('invalidemail')" style="color: red; font-size: 13px">{{ $t('invalid-email') }}</p>

          <div class="row mt-2">
            <div class="col-md-6">
              <label class="labels">{{ $t('language') }}</label>
              <LanguageDropdown
                v-model="selectedLanguage"
                placeholder="Choose Language"
                class="form-control text-white"
                style="background-color: rgb(34, 34, 34); color: #ffffff"
                id="language"
              ></LanguageDropdown>
            </div>
          </div>

          <div style="padding-top: 20px"></div>
          <hr/>

          <h4>{{ $t('change-password') }}</h4>
          <div class="col-md-12">
            <label class="labels">{{ $t('password') }}</label>
            <input style="background-color: rgb(34, 34, 34); color: #ffffff" id="password" type="password" class="form-control" placeholder="***********" v-model="password">
          </div>
          <div class="col-md-12">
            <label class="labels">{{ $t('confirm-password') }}</label>
            <input style="background-color: rgb(34, 34, 34); color: #ffffff" id="confirmPassword" type="password" class="form-control" placeholder="***********" v-model="confirmPassword">
          </div>
          <p v-if="errors.includes('passworddifferent')" style="color: red; font-size: 13px">{{ $t('passwords-dont-match') }}</p>
          <div style="padding-top: 20px"></div>

          <h4>{{ $t('security') }}</h4>

          <!-- 2FA -->
          <div v-if="user.totpEnabled" class="row mt-3">
            <button @onclick="Disable2Fa" class="btn btn-danger">{{ $t('disable-2fa') }}</button>
            <div style="padding-top: 10px"></div>
            <RouterLink to="/setuptotp" class="btn btn-primary">{{ $t('setup-totp-app') }}</RouterLink>
          </div>
          <RouterLink v-else to="/setuptotp" class="btn btn-success">{{ $t('setup-2fa') }}</RouterLink>

          <div style="padding-top: 20px"></div>
          <hr/>

        </div>

        <div class="row mt-3">
          <div class="col-md-6">
            <label class="labels">{{ $t('id') }}</label>
            <input type="text" style="background-color: rgb(34, 34, 34); color: #ffffff" class="form-control" v-bind:placeholder="$t('id')" v-bind:value="user.id" readonly>
          </div>
          <div class="col-md-6">
            <label class="labels">{{ $t('account-type') }}</label>
            <input type="text" style="background-color: rgb(34, 34, 34); color: #ffffff" class="form-control" placeholder="Normal" v-bind:value="$t(permStr)" readonly>
          </div>
          <div class="col-md-6">
            <label class="labels">{{ $t('premium-level') }}</label>
            <input type="text" style="background-color: rgb(34, 34, 34); color: #ffffff" class="form-control" placeholder="Normal" v-bind:value="$t(premiumStr)" readonly>
          </div>
        </div>
        <div class="mt-5 text-center">
          <button class="btn btn-primary profile-button" type="button" @click="save">{{ $t('save-changes') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active {
  animation: fadeSlideIn 0.35s ease-out;
}
.fade-leave-active {
  animation: fadeSlideIn 0.25s ease-in reverse;
}
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>