<script>
import {loginUser, submitTotpCode} from "@/assets/js/serble.js";
import {inject, computed, ref} from 'vue';
import router from "@/router/index.js";

export default {
  setup() {
    const userStore = inject('userStore');

    const user = computed(() => userStore.state.user);
    const isAdmin = user.permLevel > 1;

    if (userStore.state.user) {
      router.push("/");
      console.log("User is already logged in, redirecting to home page.");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const mfaToken = urlParams.get('mfa_token');
    if (!mfaToken) {
      console.log("No MFA token provided, redirecting to login page.");
      router.push("/login");
    }

    const error = ref(0);
    return {
      user,
      isAdmin,
      error,
      mfaToken
    };
  },
  methods: {
    async login() {
      console.log("Logging in...");
      const code = document.getElementById("otp").value;

      const resp = await submitTotpCode(this.mfaToken, code);
      if (!resp) {
        this.error = 1;
        console.log("Invalid code");
        return false;
      }

      // Success, navigate home, and force reload (to update user info), so don't use router
      window.location = "/";
      console.log("Logged in successfully: ", resp);
      return false;
    },
  },
};
</script>

<template>
  <div class="text-center form-signin">
    <form onsubmit="return false" @onsubmit="login">
      <img class="mb-4" src="/images/icon.png" alt="" width="72" height="72">
      <h1 class="h3 mb-3 fw-normal">{{ $t('sign-in') }}</h1>

      <div style="color: red;">
        <div v-if="error === 0"></div>
        <p v-else-if="error === 1">{{ $t('invalid-code') }}</p>
      </div>

      <div class="form-floating">
        <input
            type="text"
            class="form-control"
            id="otp"
            placeholder="{{ $t('otp-code') }}"
        style="background-color: rgb(34, 34, 34); color: #ffffff">
        <label for="otp">{{ $t('otp-code') }}</label>
      </div>

      <div class="checkbox mb-3">
        <label>
          <input
              type="checkbox"
              value="remember-me"> {{ $t('remember-me') }}
        </label>
      </div>
      <button class="w-100 btn btn-lg btn-primary" @click="login" style="padding-bottom: 10px">{{ $t('sign-in') }}</button>
    </form>
  </div>
</template>

<style scoped>
html,
body {
  height: 100%;
}

/*max width was 330*/
.form-signin {
  width: 100%;
  max-width: 400px;
  padding: 15px;
  margin: auto;
}

.form-signin .checkbox {
  font-weight: 400;
}

.form-signin .form-floating:focus-within {
  z-index: 2;
}

.form-signin input[type="email"] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.form-signin input[type="password"] {
  margin-bottom: 10px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}
</style>