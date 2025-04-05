<script>
import {ensureLoggedIn} from "@/assets/js/utils.js";
import {getTotpQrCode} from "@/assets/js/serble.js";

export default {
  async setup() {
    const user = ensureLoggedIn();
    const qr = await getTotpQrCode();

    return {
      user,
      qr
    };
  }
};
</script>

<template>
  <img v-bind:src="qr" class="crisp-image" height="300" width="300" alt="QR Code for setting up a TOTP App"/>
</template>

<style scoped>

</style>