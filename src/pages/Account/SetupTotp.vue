<script>
import LanguageDropdown from "@/components/LanguageDropdown.vue";
import {ensureLoggedIn} from "@/assets/js/utils.js";
import {ref} from "vue";
import TotpQr from "@/components/TotpQr.vue";
import {checkTotpCode} from "@/assets/js/serble.js";

export default {
  components: {TotpQr, LanguageDropdown},
  setup() {
    const user = ensureLoggedIn();
    const errors = ref([]);

    return {
      user,
      errors
    };
  },
  methods: {
    async Submit() {
      const otp = document.getElementById("otp").value;
      const result = await checkTotpCode(otp);
      if (result && result.valid) {  // enable it
        window.location = "/account";
      } else {  // don't let em
        this.errors.push("bad-code");
        console.log("Invalid code");
      }
    }
  }
};
</script>

<template>
  <div class="d-flex flex-row justify-content-center">
    <div class="p-4 half-page justify-content-center text-center">
      <div class="bg-black bg-opacity-25 rounded-3 p-4">
        <h3>{{ $t("setup-totp-app") }}</h3>
        <p>
          {{ $t("setup-totp-instructions") }}
        </p>
        <Suspense>
          <template #default>
            <TotpQr></TotpQr>
          </template>
          <template #fallback>
            Loading qr code...
          </template>
        </Suspense>
        <p class="text-danger pt-2">
          {{ $t("totp-warning") }}
        </p>
      </div>

    </div>

    <div class="text-center form-setup-2fa half-page justify-content-center">
      <form onsubmit="return false">
        <img class="mb-4" src="/images/icon.png" alt="" width="72" height="72">
        <h1 class="h3 mb-3 fw-normal">{{ $t("2fa") }}</h1>

        <div style="color: red;">
          <p v-if="errors.includes('bad-code')">{{ $t("invalid-code") }}</p>
        </div>

        <div class="form-floating">
          <input
              type="text"
              class="form-control"
              id="otp"
              placeholder="{{ $t('otp-code') }}"
          style="background-color: rgb(34, 34, 34); color: #ffffff">
          <label for="otp">{{ $t("otp-code") }}</label>
        </div>

        <button class="w-100 btn btn-lg btn-primary" @click="Submit" style="padding-bottom: 10px">{{ $t("submit") }}</button>
      </form>

    </div>
  </div>
</template>

<style scoped>

</style>