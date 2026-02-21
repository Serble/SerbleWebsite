<script setup>
import { computed } from 'vue';
import { getSupportedLocale, languageOptions } from '@/assets/js/languages.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Choose Language'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const selectedValue = computed(() => getSupportedLocale(props.modelValue));

function onChange(event) {
  const nextValue = getSupportedLocale(event.target.value);
  emit('update:modelValue', nextValue);
  emit('change', nextValue);
}
</script>

<template>
  <select name="languages" :value="selectedValue" @change="onChange">
    <option value="" disabled>{{ placeholder }}</option>
    <option v-for="option in languageOptions" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>

</style>