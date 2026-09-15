import { reactive } from 'vue';
import { setReauthHandler } from '@/assets/js/serble.js';

/** Rendered by <ReauthDialog /> in App.vue. */
export const reauthState = reactive({
  open: false,
  resolve: null,
});

setReauthHandler(() => new Promise((resolve) => {
  if (reauthState.resolve) reauthState.resolve(null);
  reauthState.resolve = resolve;
  reauthState.open = true;
}));

/** Closes the dialog with a reauth token, or null if the user gave up. */
export function settleReauth(token) {
  const resolve = reauthState.resolve;
  reauthState.open = false;
  reauthState.resolve = null;
  if (resolve) resolve(token);
}
