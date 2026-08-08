<script>
import { computed } from 'vue';

// Renders a translated string where the part wrapped in [square brackets] becomes
// the link, e.g. "User already exists, [trying to login?]". Pass `to` for an
// internal route or `href` for an external URL. If the string has no brackets it
// is rendered as plain text.
export default {
  name: 'LinkedText',
  props: {
    text: { type: String, required: true },
    // Internal route target, handed straight to RouterLink.
    to: { type: [String, Object], default: null },
    // External URL, used when `to` isn't given.
    href: { type: String, default: null },
    target: { type: String, default: null },
  },
  setup(props) {
    const parts = computed(() => {
      const start = props.text.indexOf('[');
      const end = props.text.indexOf(']', start + 1);
      if (start === -1 || end === -1) {
        return { before: props.text, link: '', after: '' };
      }
      return {
        before: props.text.slice(0, start),
        link: props.text.slice(start + 1, end),
        after: props.text.slice(end + 1),
      };
    });

    const rel = computed(() => (props.target === '_blank' ? 'noopener' : null));

    return { parts, rel };
  },
};
</script>

<template><span>{{ parts.before }}<template v-if="parts.link"><RouterLink v-if="to" :to="to">{{ parts.link }}</RouterLink><a v-else :href="href" :target="target" :rel="rel">{{ parts.link }}</a></template>{{ parts.after }}</span></template>
