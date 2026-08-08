<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getSupportedLocale, languageOptions } from '@/assets/js/languages.js';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  // Left empty so the translated default is resolved at render time rather than
  // frozen when the component is defined.
  placeholder: {
    type: String,
    default: ''
  }
});

const placeholderText = computed(() => props.placeholder || t('choose-language'));

const emit = defineEmits(['update:modelValue', 'change']);

const selectedValue = computed(() => getSupportedLocale(props.modelValue));

function onChange(event) {
  const nextValue = getSupportedLocale(event.target.value);
  emit('update:modelValue', nextValue);
  emit('change', nextValue);
}
</script>

<template>
  <select class="select" name="languages" :value="selectedValue" @change="onChange">
    <option value="" disabled>{{ placeholderText }}</option>
    <option v-for="option in languageOptions" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>