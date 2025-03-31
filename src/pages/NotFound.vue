<script>
export default {
  computed: {
    soz() {
      return this.$t('sorry-not-found').replace("[", "<\a href='/'>").replace("]", "<\/a>");
    }
  }
}
</script>

<template>
  <div class="text-center" style="justify-content: center; display: contents;">
    <h1 class="display-4">{{ $t('404-not-found') }}</h1>
    <div role="alert">
      <p v-html="soz"></p>
      <hr class="my-4">
      <div style="display: flex; justify-content: center">
        <img src="https://http.cat/404" style="text-align: center;" alt="A picture of a cat hiding under paper"/>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
</script>