<script>
import { registerUser } from "@/assets/js/serble.js";
import { inject, computed, ref } from 'vue';
import router from "@/router/index.js";
import VueTurnstile from 'vue-turnstile';

export default {
  setup() {
    const userStore = inject('userStore');

    const user = computed(() => userStore.state.user);
    const isAdmin = user.permLevel > 1;

    if (userStore.state.user) {
      router.push("/");
      console.log("User is already logged in, redirecting to home page.");
    }

    const error = ref(0);
    const recapToken = ref("");
    return {
      user,
      isAdmin,
      error,
      recapToken
    };
  },
  components: { VueTurnstile },
  computed: {
    wantLogin() {
      return this.$t('want-login-go-here').replace("[", "<\a href='/login'>").replace("]", "<\/a>");
    },
    userExists() {
      return this.$t('user-exists-trying-to-login').replace("[", "<\a href='/login'>").replace("]", "<\/a>");
    }
  },
  methods: {
    async register() {
      console.log("Registering with recaptcha token... ", this.recapToken);
      const username = document.getElementById("floatingUsername").value;
      const password = document.getElementById("floatingPassword").value;

      const resp = await registerUser(username, password, this.recapToken);
      if (!resp.success) {
        switch (resp.error) {
          case 409:
            this.error = 2;
            return false;
        }
        this.error = 1;
        return false;
      }

      // Success, navigate home, and force reload (to update user info), so don't use router
      window.location = "/login";
      console.log("Registered successfully: ", resp.user);
      return false;
    }
  },
};
</script>

<template>
  <div class="text-center form-signin">
    <form onsubmit="return false" @onsubmit="login">
      <img class="mb-4" src="/images/icon.png" alt="" width="72" height="72">
      <h1 class="h3 mb-3 fw-normal">{{ $t('register') }}</h1>

      <div style="color: red;">
        <div v-if="error === 0"></div>
        <p v-else-if="error === 1">{{ $t('username-password-required') }}</p>
        <p v-else-if="error === 2" v-html="userExists"></p>
      </div>

      <div class="form-floating">
        <input
            type="text"
            class="form-control"
            id="floatingUsername"
            placeholder="{{ $t('username') }}"
        style="background-color: rgb(34, 34, 34); color: #ffffff">
        <label for="floatingUsername">{{ $t('username') }}</label>
      </div>
      <div class="form-floating">
        <input
            type="password"
            class="form-control"
            id="floatingPassword"
            placeholder="{{ $t('password') }}"
        style="background-color: rgb(34, 34, 34); color: #ffffff">
        <label for="floatingPassword">{{ $t('password') }}</label>
      </div>

      <vue-turnstile theme="dark" site-key="0x4AAAAAABDes5z9y1_Rb-8A" v-model="recapToken" action="register"/>
      <div v-if="recapToken">
        <button id="register-button" class="w-100 btn btn-lg btn-primary" @click="register" style="padding-bottom: 10px">{{ $t('register') }}</button>
      </div>
      <div v-else>
        <button id="register-button" disabled class="w-100 btn btn-lg btn-primary" @click="register" style="padding-bottom: 10px">{{ $t('register') }}</button>
      </div>
      <p v-html="wantLogin"></p>
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