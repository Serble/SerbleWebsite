<script>
import {ensureLoggedIn} from "@/assets/js/utils.js";
import LanguageDropdown from "@/components/LanguageDropdown.vue";
import {ref} from "vue";

export default {
  components: {LanguageDropdown},
  setup() {
    const user = ensureLoggedIn();
    const errors = ref([]);

    const permStr = user.permLevel === 2 ? "Admin" : "Normal";
    const premiumStr = "Free";  // Default

    return {
      user,
      errors,
      permStr,
      premiumStr
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
        <div class="row mt-2">
          <div class="col-md-6"><label class="labels">{{ $t('username') }}</label><input style="background-color: rgb(34, 34, 34); color: #ffffff" type="text" class="form-control" v-bind:placeholder="$t('username')" v-bind:value="user.username" id="username"></div>
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
            </label><input style="background-color: rgb(34, 34, 34); color: #ffffff" type="text" class="form-control" placeholder="{{ $t('email') }}" v-bind:value="user.email" id="email">
          </div>
          <p v-if="errors.includes('invalidemail')" style="color: red; font-size: 13px">{{ $t('invalid-email') }}</p>

          <div class="row mt-2">
            <div class="col-md-6">
              <label class="labels">{{ $t('language') }}</label>
              <LanguageDropdown DefaultValue="@_user.Language" Placeholder="Choose Language" Class="form-control text-white" Style="background-color: rgb(34, 34, 34); color: #ffffff" Id="language"></LanguageDropdown>
            </div>
          </div>

          <div style="padding-top: 20px"></div>
          <hr/>

          <h4>{{ $t('change-password') }}</h4>
          <div class="col-md-12">
            <label class="labels">{{ $t('password') }}</label>
            <input style="background-color: rgb(34, 34, 34); color: #ffffff" id="password" type="password" class="form-control" placeholder="***********" value="">
          </div>
          <div class="col-md-12">
            <label class="labels">{{ $t('confirm-password') }}</label>
            <input style="background-color: rgb(34, 34, 34); color: #ffffff" id="confirmPassword" type="password" class="form-control" placeholder="***********" value="">
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
          <button class="btn btn-primary profile-button" type="button" @onclick="Save">{{ $t('save-changes') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>

</style>