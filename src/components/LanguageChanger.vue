<script setup>
import { useI18n } from 'vue-i18n';
import { setCookie } from '@/assets/js/utils.js';
import { getSupportedLocale, languageOptions } from '@/assets/js/languages.js';

const { locale } = useI18n({ useScope: 'global' });

function changeLanguage(nextLocale) {
  const normalized = getSupportedLocale(nextLocale) || 'en';
  locale.value = normalized;
  setCookie('locale', normalized, 9999);
}
</script>

<template>
  <div class="dropdown">
    <button class="dropdown-toggle btn-link btn" type="button" data-bs-toggle="dropdown" aria-expanded="false">{{ $t('language') }}</button>
    <div class="dropdown-menu">
      <button
        v-for="option in languageOptions"
        :key="option.value"
        class="dropdown-item"
        @click="changeLanguage(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>

</style>