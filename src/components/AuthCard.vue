<script setup>
/**
 * Centred card used by the sign-in, register and two-factor pages.
 *
 * These three pages previously carried byte-identical copies of the page,
 * card and header CSS under `.auth-*` and `.mfa-*` names. Layout changes now
 * happen here once.
 */
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <img src="/images/icon.png" width="52" height="52" alt="" class="auth-logo" />
        <h1 class="auth-title">{{ title }}</h1>
        <p v-if="subtitle" class="auth-sub">{{ subtitle }}</p>
      </div>

      <slot />
    </div>

    <!-- Secondary content below the card, e.g. a "back" link. -->
    <slot name="below" />
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-5);
}

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-7) var(--space-7);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.auth-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  text-align: center;
}

.auth-logo {
  border-radius: var(--radius);
}

.auth-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text);
  margin: 0;
}

.auth-sub {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 0;
}
</style>
