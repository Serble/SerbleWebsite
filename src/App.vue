<script setup>
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import NavBar from "@/components/NavBar.vue";
import Footer from "@/components/Footer.vue";

// Embed routes (e.g. the embeddable item viewer) render bare — no site nav/footer — so they
// look native when iframed into another app.
const route = useRoute();
const isEmbed = computed(() => route.meta?.embed === true);
</script>

<template>
  <NavBar v-if="!isEmbed"/>
  <RouterView/>
  <Footer v-if="!isEmbed"/>
</template>

<style scoped>
</style>
