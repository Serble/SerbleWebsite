import { reactive } from 'vue';
import i18n from '@/assets/js/i18n.js';

/**
 * Promise-based replacement for window.confirm / window.alert.
 *
 * The browser's own dialogs can't be styled or translated, block the whole tab,
 * and look nothing like the rest of the site — which was especially bad given
 * they guarded the destructive admin actions. These render in-page instead.
 *
 * Usage mirrors the old calls closely enough to be a drop-in:
 *
 *   if (!await confirmDialog({ message: 'Delete this?' })) return;
 *
 * A single <DialogHost /> in App.vue renders whatever is in `dialogState`.
 */

export const dialogState = reactive({
  open: false,
  kind: 'confirm',      // 'confirm' | 'alert'
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  danger: false,
  resolve: null,
});

function open(options, kind) {
  // If a dialog is somehow already open, settle it first so its caller isn't
  // left awaiting a promise that never resolves.
  if (dialogState.open && dialogState.resolve) {
    dialogState.resolve(false);
  }

  return new Promise((resolve) => {
    dialogState.kind = kind;
    dialogState.title = options.title ?? '';
    dialogState.message = options.message ?? '';
    // Resolved per open() so a language change between dialogs is picked up.
    const t = i18n.global.t;
    dialogState.confirmLabel = options.confirmLabel ?? (kind === 'alert' ? t('ok') : t('confirm'));
    dialogState.cancelLabel = options.cancelLabel ?? t('cancel');
    dialogState.danger = options.danger === true;
    dialogState.resolve = resolve;
    dialogState.open = true;
  });
}

function settle(result) {
  const resolve = dialogState.resolve;
  dialogState.open = false;
  dialogState.resolve = null;
  if (resolve) resolve(result);
}

/** Resolves true if the user confirmed, false if they cancelled or dismissed. */
export function confirmDialog(options = {}) {
  return open(options, 'confirm');
}

/** Resolves once the user acknowledges. Single button, no cancel. */
export function alertDialog(options = {}) {
  return open(options, 'alert');
}

export function resolveDialog(result) {
  settle(result);
}
