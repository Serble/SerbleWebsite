<script>
import { ref, onMounted } from 'vue';
import { getAuthToken } from '@/assets/js/serble.js';

// Landing page for the embed "connect account" popup.
//
// The embeddable item viewer (which is iframed into a third-party app) can't reliably share the
// user's Serble login because browsers partition storage for cross-site iframes. So instead the
// viewer opens this page in a top-level popup; the user logs in here as first-party Serble, and we
// hand the resulting session token back to the opener (the iframe) via postMessage. The iframe
// stores it in its own (partitioned) storage and proceeds. The token only ever travels same-origin
// (opener is the same Serble origin), so we target window.location.origin explicitly.
export default {
  name: 'EmbedAuthBridge',
  setup() {
    const done = ref(false);
    const noOpener = ref(false);

    onMounted(() => {
      const token = getAuthToken();
      const opener = window.opener;
      if (!opener || !token) {
        noOpener.value = !opener;
        return;
      }
      opener.postMessage({ type: 'serble-embed-auth', token }, window.location.origin);
      done.value = true;
      setTimeout(() => { try { window.close(); } catch { /* ignore */ } }, 300);
    });

    return { done, noOpener };
  },
};
</script>

<template>
  <div class="bridge">
    <div class="bridge-card">
      <div class="spinner" v-if="!noOpener"></div>
      <p v-if="noOpener">You're signed in. You can close this window and return to the app.</p>
      <p v-else-if="done">Connected — returning to the app…</p>
      <p v-else>Connecting your Serble account…</p>
    </div>
  </div>
</template>

<style scoped>
.bridge {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg, #0e0f13);
  color: var(--text, #e8e8ea);
  font-family: system-ui, sans-serif;
  padding: 24px;
}
.bridge-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border, #333);
  border-top-color: var(--accent, #5865f2);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
