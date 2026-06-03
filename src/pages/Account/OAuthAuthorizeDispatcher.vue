<script>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import OAuthPage from './OAuthPage.vue';
import OIDCConsentPage from './OIDCConsentPage.vue';

// Dispatcher for /oauth/authorize. The OIDC backend redirects users here with a
// `?session=<id>` query param; legacy Serble OAuth still uses `?client_id=...`
// (no session). Render the OIDC consent flow when a session id is present,
// otherwise fall through to the legacy authorize page.
export default {
  components: { OAuthPage, OIDCConsentPage },
  setup() {
    const route = useRoute();
    const isOidc = computed(() => {
      const s = route.query.session;
      return typeof s === 'string' && s.length > 0;
    });
    return { isOidc };
  }
};
</script>

<template>
  <OIDCConsentPage v-if="isOidc" />
  <OAuthPage v-else />
</template>
