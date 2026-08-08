<script>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { confirmDialog } from '@/assets/js/dialog.js';
import {
  getWebhookEventTypes,
  getAppWebhooks,
  createAppWebhook,
  updateAppWebhook,
  deleteAppWebhook,
  rotateAppWebhookSecret,
  testAppWebhook,
  getAppWebhookDeliveries,
} from '@/assets/js/serble.js';

// Event slugs we ship a blurb for. Unknown slugs (a server newer than this build) still render
// with their raw name and no description, so a new event type is usable the moment the API ships it.
const DESCRIBED_EVENTS = ['tax.collected', 'tax.payout'];

// The delivery status enum as the API spells it, mapped to the locale key for each.
const DELIVERY_STATUS_KEYS = {
  Pending: 'delivery-status-pending',
  Delivered: 'delivery-status-delivered',
  Failed: 'delivery-status-failed',
  DeadLettered: 'delivery-status-deadlettered',
};

const DELIVERY_PAGE_SIZE = 15;

export default {
  name: 'AppWebhooksPanel',
  props: {
    appId: { type: String, required: true },
  },
  setup(props) {
    const { t } = useI18n();

    const webhooks = ref([]);
    const loading = ref(true);
    const loadError = ref(false);
    const message = ref('');
    const messageType = ref('info'); // info | error

    const eventTypes = ref([]);

    // Create form
    const createOpen = ref(false);
    const newUrl = ref('');
    const newEvents = ref([]);
    const creating = ref(false);

    // Shown once, right after create or rotate. Never retrievable again.
    const revealedSecret = ref(null); // { webhookId, url, secret }

    // Per-webhook expanded editor / delivery log, keyed by webhook id.
    const expanded = ref(null);
    const editDraft = ref(null); // { url, events }
    const busyId = ref(null);

    const deliveries = ref([]);
    const deliveriesTotal = ref(0);
    const deliveriesOffset = ref(0);
    const deliveriesLoading = ref(false);
    const openPayloadId = ref(null);

    function say(text, type = 'info') {
      message.value = text;
      messageType.value = type;
    }

    function describeEvent(slug) {
      return DESCRIBED_EVENTS.includes(slug) ? t(`event-${slug}-desc`) : '';
    }

    // An unrecognised status (a server newer than this build) shows its raw name rather than a key.
    function statusLabel(status) {
      const key = DELIVERY_STATUS_KEYS[status];
      return key ? t(key) : status;
    }

    // The server advertises only the events that can actually reach this app — an official app
    // never pays tax, a non-official one never receives a payout. A stored subscription can still
    // name the other slug (subscribed through the API, or the app changed official status), so
    // filter it out of the display too rather than showing an event that can never fire.
    //
    // Only the *display* is filtered. `editDraft.events` keeps whatever was stored, so saving an
    // unrelated change here never silently drops a subscription the form couldn't show.
    function visibleEvents(slugs) {
      if (eventTypes.value.length === 0) return slugs; // catalog still loading
      return slugs.filter(s => eventTypes.value.includes(s));
    }

    async function load() {
      loading.value = true;
      loadError.value = false;
      const r = await getAppWebhooks(props.appId);
      loading.value = false;
      if (!r.success) {
        loadError.value = true;
        return;
      }
      webhooks.value = r.webhooks;
    }

    async function loadEventTypes() {
      const r = await getWebhookEventTypes(props.appId);
      if (r.success) eventTypes.value = r.eventTypes;
    }

    function openCreate() {
      createOpen.value = true;
      newUrl.value = '';
      // Subscribing to everything is the sane default: the two tax events reach disjoint
      // audiences, so an app only ever receives the one that applies to it.
      newEvents.value = [...eventTypes.value];
      say('');
    }

    function cancelCreate() {
      createOpen.value = false;
      newUrl.value = '';
    }

    function toggleNewEvent(slug) {
      const i = newEvents.value.indexOf(slug);
      if (i === -1) newEvents.value.push(slug);
      else newEvents.value.splice(i, 1);
    }

    async function submitCreate() {
      say('');
      const url = newUrl.value.trim();
      if (!url) return say(t('webhook-url-required'), 'error');
      if (newEvents.value.length === 0) return say(t('webhook-select-event'), 'error');

      creating.value = true;
      const r = await createAppWebhook(props.appId, url, newEvents.value);
      creating.value = false;

      if (!r.success) {
        return say(r.message || t(r.error === 403 ? 'app-not-owned' : 'webhook-create-failed'), 'error');
      }

      revealedSecret.value = { webhookId: r.webhook.id, url: r.webhook.url, secret: r.webhook.secret };
      createOpen.value = false;
      await load();
    }

    function startEdit(hook) {
      expanded.value = expanded.value === hook.id ? null : hook.id;
      if (expanded.value === null) {
        editDraft.value = null;
        return;
      }
      editDraft.value = { url: hook.url, events: [...hook.eventTypes] };
      deliveries.value = [];
      deliveriesTotal.value = 0;
      deliveriesOffset.value = 0;
      openPayloadId.value = null;
      say('');
    }

    function toggleDraftEvent(slug) {
      if (!editDraft.value) return;
      const i = editDraft.value.events.indexOf(slug);
      if (i === -1) editDraft.value.events.push(slug);
      else editDraft.value.events.splice(i, 1);
    }

    function draftDirty(hook) {
      if (!editDraft.value) return false;
      if (editDraft.value.url.trim() !== hook.url) return true;
      const a = [...editDraft.value.events].sort().join(',');
      const b = [...hook.eventTypes].sort().join(',');
      return a !== b;
    }

    async function saveEdit(hook) {
      if (!editDraft.value) return;
      const url = editDraft.value.url.trim();
      if (!url) return say(t('webhook-url-empty'), 'error');
      if (editDraft.value.events.length === 0) return say(t('webhook-select-event'), 'error');

      busyId.value = hook.id;
      const updates = {};
      if (url !== hook.url) updates.url = url;
      updates.eventTypes = editDraft.value.events;
      const r = await updateAppWebhook(props.appId, hook.id, updates);
      busyId.value = null;

      if (!r.success) return say(r.message || t('webhook-save-failed'), 'error');
      say(t('webhook-updated'));
      await load();
    }

    // Re-enabling also clears the auto-disable failure count server-side, so a fixed endpoint
    // isn't disabled again by its own history.
    async function setEnabled(hook, enabled) {
      busyId.value = hook.id;
      const r = await updateAppWebhook(props.appId, hook.id, { enabled });
      busyId.value = null;
      if (!r.success) return say(r.message || t('webhook-update-failed'), 'error');
      say(t(enabled ? 'webhook-enabled-msg' : 'webhook-disabled-msg'));
      await load();
    }

    async function rotate(hook) {
      if (!await confirmDialog({
        title: t('rotate-signing-secret'),
        message: t('webhook-rotate-confirm'),
        confirmLabel: t('rotate'),
        danger: false,
      })) return;
      busyId.value = hook.id;
      const r = await rotateAppWebhookSecret(props.appId, hook.id);
      busyId.value = null;
      if (!r.success) return say(r.message || t('webhook-rotate-failed'), 'error');
      revealedSecret.value = { webhookId: hook.id, url: hook.url, secret: r.webhook.secret };
      say('');
      await load();
    }

    async function sendTest(hook) {
      busyId.value = hook.id;
      const r = await testAppWebhook(props.appId, hook.id);
      busyId.value = null;
      if (!r.success) {
        return say(r.message || t(r.error === 404 ? 'webhook-enable-before-test' : 'webhook-test-failed'), 'error');
      }
      say(t('webhook-test-queued'));
      if (expanded.value === hook.id) await loadDeliveries(hook, 0);
    }

    async function remove(hook) {
      if (!await confirmDialog({
        title: t('delete-webhook'),
        message: t('webhook-delete-confirm', { url: hook.url }),
        confirmLabel: t('delete'),
        danger: true,
      })) return;
      busyId.value = hook.id;
      const r = await deleteAppWebhook(props.appId, hook.id);
      busyId.value = null;
      if (!r.success) return say(r.message || t('webhook-delete-failed'), 'error');
      if (expanded.value === hook.id) expanded.value = null;
      say(t('webhook-deleted'));
      await load();
    }

    async function loadDeliveries(hook, offset = 0) {
      deliveriesLoading.value = true;
      const r = await getAppWebhookDeliveries(props.appId, hook.id, offset, DELIVERY_PAGE_SIZE);
      deliveriesLoading.value = false;
      if (!r.success) return say(t('webhook-deliveries-failed'), 'error');
      deliveries.value = r.deliveries;
      deliveriesTotal.value = r.totalCount;
      deliveriesOffset.value = offset;
      openPayloadId.value = null;
    }

    function togglePayload(id) {
      openPayloadId.value = openPayloadId.value === id ? null : id;
    }

    function prettyPayload(raw) {
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    }

    async function copySecret() {
      if (!revealedSecret.value?.secret) return;
      try {
        await navigator.clipboard.writeText(revealedSecret.value.secret);
        say(t('webhook-secret-copied'));
      } catch {
        say(t('copy-failed'), 'error');
      }
    }

    function formatDate(value) {
      if (!value) return '—';
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
    }

    function statusClass(status) {
      if (status === 'Delivered') return 'status-ok';
      if (status === 'DeadLettered') return 'status-bad';
      return 'status-pending';
    }

    onMounted(() => {
      loadEventTypes();
      load();
    });

    return {
      webhooks, loading, loadError, message, messageType, eventTypes, describeEvent, statusLabel, visibleEvents,
      createOpen, newUrl, newEvents, creating, openCreate, cancelCreate, toggleNewEvent, submitCreate,
      revealedSecret, copySecret,
      expanded, editDraft, busyId, startEdit, toggleDraftEvent, draftDirty, saveEdit,
      setEnabled, rotate, sendTest, remove,
      deliveries, deliveriesTotal, deliveriesOffset, deliveriesLoading, loadDeliveries,
      openPayloadId, togglePayload, prettyPayload,
      load, formatDate, statusClass,
      pageSize: DELIVERY_PAGE_SIZE,
    };
  },
};
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <div>
        <h4 class="panel-title">{{ $t('webhooks') }}</h4>
        <i18n-t keypath="webhooks-subtitle" tag="p" class="panel-subtitle" scope="global">
          <template #event><code>tax.collected</code></template>
        </i18n-t>
      </div>
      <button class="ghost-btn" :disabled="loading" @click="load">{{ loading ? '…' : $t('reload') }}</button>
    </div>

    <!-- Reveal-once secret -->
    <div v-if="revealedSecret" class="reveal-card">
      <i18n-t keypath="webhook-secret-warning" tag="p" class="reveal-warning" scope="global">
        <template #never><strong>{{ $t('webhook-secret-warning-never') }}</strong></template>
      </i18n-t>
      <p class="reveal-url">{{ revealedSecret.url }}</p>
      <div class="reveal-row">
        <code class="reveal-key">{{ revealedSecret.secret }}</code>
        <button class="ghost-btn" @click="copySecret">{{ $t('copy') }}</button>
      </div>
      <i18n-t keypath="webhook-signature-hint" tag="p" class="reveal-hint" scope="global">
        <template #hmac><code>HMAC-SHA256(secret, "{timestamp}.{rawBody}")</code></template>
        <template #header><code>X-Serble-Signature</code></template>
      </i18n-t>
      <button class="reveal-dismiss" @click="revealedSecret = null">{{ $t('saved-it') }}</button>
    </div>

    <div v-if="message" class="panel-message" :class="{ 'panel-message-error': messageType === 'error' }">
      {{ message }}
    </div>

    <!-- Create -->
    <div v-if="!createOpen" class="create-row">
      <button class="add-btn" @click="openCreate">{{ $t('add-webhook') }}</button>
    </div>

    <div v-else class="create-card">
      <label class="field-label" for="wh-url">{{ $t('endpoint-url') }}</label>
      <input
        id="wh-url"
        v-model="newUrl"
        type="text"
        class="input"
        maxlength="512"
        placeholder="https://example.com/hooks/serble"
        @keydown.enter.prevent="submitCreate"
      >
      <p class="field-hint">{{ $t('endpoint-url-hint') }}</p>

      <label class="field-label">{{ $t('events') }}</label>
      <div class="event-list">
        <label v-for="slug in eventTypes" :key="slug" class="event-option">
          <input type="checkbox" :checked="newEvents.includes(slug)" @change="toggleNewEvent(slug)">
          <span>
            <code>{{ slug }}</code>
            <span v-if="describeEvent(slug)" class="event-desc">{{ describeEvent(slug) }}</span>
          </span>
        </label>
      </div>

      <div class="create-actions">
        <button class="reveal-dismiss" @click="cancelCreate">{{ $t('cancel') }}</button>
        <button class="add-btn" :disabled="creating" @click="submitCreate">
          {{ creating ? '…' : $t('create-webhook') }}
        </button>
      </div>
    </div>

    <!-- List -->
    <div v-if="loading" class="panel-state">{{ $t('loading') }}</div>
    <div v-else-if="loadError" class="panel-state panel-state-error">{{ $t('unknown-error') }}</div>
    <div v-else-if="webhooks.length === 0" class="panel-state">{{ $t('no-webhooks') }}</div>

    <div v-else class="hook-list">
      <div v-for="hook in webhooks" :key="hook.id" class="hook-item">
        <div class="hook-head">
          <div class="hook-main">
            <span class="hook-url">{{ hook.url }}</span>
            <div class="hook-tags">
              <span v-for="slug in visibleEvents(hook.eventTypes)" :key="slug" class="tag">{{ slug }}</span>
              <span class="tag" :class="hook.enabled ? 'tag-ok' : 'tag-off'">
                {{ hook.enabled ? $t('webhook-tag-enabled') : $t('webhook-tag-disabled') }}
              </span>
              <span v-if="hook.consecutiveFailures > 0" class="tag tag-bad">
                {{ $t('webhook-consecutive-failures', { count: hook.consecutiveFailures }) }}
              </span>
            </div>
          </div>
          <button class="ghost-btn" @click="startEdit(hook)">
            {{ expanded === hook.id ? $t('close') : $t('manage') }}
          </button>
        </div>

        <p v-if="hook.disabledReason" class="hook-disabled">
          {{ $t('webhook-auto-disabled', { reason: hook.disabledReason }) }}
        </p>

        <div v-if="expanded === hook.id && editDraft" class="hook-body">
          <div class="hook-meta">
            <div><span class="meta-label">{{ $t('last-success') }}</span> {{ formatDate(hook.lastSuccessUtc) }}</div>
            <div><span class="meta-label">{{ $t('last-failure') }}</span> {{ formatDate(hook.lastFailureUtc) }}</div>
            <div v-if="hook.lastError" class="meta-error">
              <span class="meta-label">{{ $t('last-error') }}</span> {{ hook.lastError }}
            </div>
          </div>

          <label class="field-label" :for="`url-${hook.id}`">{{ $t('endpoint-url') }}</label>
          <input :id="`url-${hook.id}`" v-model="editDraft.url" type="text" class="input" maxlength="512">

          <label class="field-label">{{ $t('events') }}</label>
          <div class="event-list">
            <label v-for="slug in eventTypes" :key="slug" class="event-option">
              <input type="checkbox" :checked="editDraft.events.includes(slug)" @change="toggleDraftEvent(slug)">
              <span>
                <code>{{ slug }}</code>
                <span v-if="describeEvent(slug)" class="event-desc">{{ describeEvent(slug) }}</span>
              </span>
            </label>
          </div>

          <div class="hook-actions">
            <button class="add-btn" :disabled="busyId === hook.id || !draftDirty(hook)" @click="saveEdit(hook)">
              {{ $t('save-changes') }}
            </button>
            <button class="ghost-btn" :disabled="busyId === hook.id" @click="setEnabled(hook, !hook.enabled)">
              {{ hook.enabled ? $t('disable') : $t('enable') }}
            </button>
            <button class="ghost-btn" :disabled="busyId === hook.id || !hook.enabled" @click="sendTest(hook)">
              {{ $t('send-test-event') }}
            </button>
            <button class="ghost-btn" :disabled="busyId === hook.id" @click="rotate(hook)">{{ $t('rotate-secret') }}</button>
            <button class="danger-btn" :disabled="busyId === hook.id" @click="remove(hook)">{{ $t('delete') }}</button>
          </div>

          <!-- Deliveries -->
          <div class="deliveries">
            <div class="deliveries-head">
              <h5 class="deliveries-title">{{ $t('recent-deliveries') }}</h5>
              <button class="ghost-btn" :disabled="deliveriesLoading" @click="loadDeliveries(hook, 0)">
                {{ deliveriesLoading ? '…' : $t('load') }}
              </button>
            </div>

            <div v-if="deliveries.length === 0" class="panel-state">
              {{ $t('deliveries-empty') }}
            </div>

            <div v-else class="delivery-list">
              <div v-for="d in deliveries" :key="d.id" class="delivery-item">
                <div class="delivery-row">
                  <code class="delivery-event">{{ d.eventType }}</code>
                  <span class="delivery-status" :class="statusClass(d.status)">{{ statusLabel(d.status) }}</span>
                  <span class="delivery-dim">{{ $t('delivery-attempt', { n: d.attempts }) }}</span>
                  <span v-if="d.lastResponseCode" class="delivery-dim">{{ $t('delivery-http', { code: d.lastResponseCode }) }}</span>
                  <span v-if="d.cycleId" class="delivery-dim">{{ $t('delivery-cycle', { id: d.cycleId }) }}</span>
                  <span class="delivery-dim delivery-date">{{ formatDate(d.createdUtc) }}</span>
                  <button class="link-btn" @click="togglePayload(d.id)">
                    {{ openPayloadId === d.id ? $t('hide') : $t('payload') }}
                  </button>
                </div>
                <p v-if="d.lastError" class="delivery-error">{{ d.lastError }}</p>
                <p v-if="d.status !== 'Delivered' && d.nextAttemptUtc" class="delivery-dim">
                  {{ $t('delivery-next-attempt', { time: formatDate(d.nextAttemptUtc) }) }}
                </p>
                <pre v-if="openPayloadId === d.id" class="delivery-payload">{{ prettyPayload(d.payload) }}</pre>
              </div>
            </div>

            <div v-if="deliveries.length" class="deliveries-pager">
              <span class="delivery-dim">
                {{ $t('delivery-range', { from: deliveriesOffset + 1, to: deliveriesOffset + deliveries.length, total: deliveriesTotal }) }}
              </span>
              <div class="pager-buttons">
                <button
                  class="ghost-btn"
                  :disabled="deliveriesLoading || deliveriesOffset === 0"
                  @click="loadDeliveries(hook, Math.max(0, deliveriesOffset - pageSize))"
                >{{ $t('previous') }}</button>
                <button
                  class="ghost-btn"
                  :disabled="deliveriesLoading || deliveriesOffset + deliveries.length >= deliveriesTotal"
                  @click="loadDeliveries(hook, deliveriesOffset + pageSize)"
                >{{ $t('next') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  margin-top: 28px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 20px 24px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px;
}

.panel-subtitle {
  font-size: 0.8rem;
  color: var(--text-faint);
  margin: 0;
  line-height: 1.5;
  max-width: 60ch;
}

.panel-subtitle code,
.reveal-hint code {
  font-size: 0.76rem;
  color: var(--text-secondary);
}

.panel-message {
  font-size: 0.82rem;
  color: var(--text-secondary);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
}

.panel-message-error {
  color: var(--danger);
  background: var(--danger-bg-soft);
  border-color: var(--danger-border-soft);
}

.panel-state {
  font-size: 0.85rem;
  color: var(--text-faint);
  padding: 12px 0 4px;
}

.panel-state-error { color: var(--danger); }

/* ── Buttons ── */
.ghost-btn,
.add-btn,
.danger-btn,
.reveal-dismiss {
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 600;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.ghost-btn {
  color: var(--text-secondary);
  background: var(--border);
  border: 1px solid var(--border-strong);
}

.ghost-btn:hover:not(:disabled) {
  background: var(--border-strong);
  color: var(--text);
}

.add-btn {
  color: #fff;
  background: var(--accent);
  border: 1px solid var(--accent);
}

.add-btn:hover:not(:disabled) { background: var(--accent-hover); }

.danger-btn {
  color: var(--danger);
  background: var(--danger-bg-soft);
  border: 1px solid var(--danger-border-soft);
}

.danger-btn:hover:not(:disabled) {
  background: var(--danger-strong);
  border-color: var(--danger-strong);
  color: #fff;
}

.reveal-dismiss {
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-strong);
}

.reveal-dismiss:hover { background: var(--border); color: var(--text); }

.ghost-btn:disabled,
.add-btn:disabled,
.danger-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--accent-light);
  cursor: pointer;
}

/* ── Inputs ── */



.field-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-faint);
  margin: 14px 0 8px;
}

.field-label:first-child { margin-top: 0; }

.field-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  margin: 6px 0 0;
}

/* ── Create ── */
.create-row { margin-bottom: 4px; }

.create-card {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

/* ── Event checkboxes ── */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-option {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  font-size: 0.84rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.event-option input { margin-top: 3px; flex-shrink: 0; }

.event-option code {
  color: var(--text);
  font-size: 0.82rem;
}

.event-desc {
  display: block;
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.45;
  margin-top: 2px;
}

/* ── Webhook list ── */
.hook-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hook-item {
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
}

.hook-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hook-main { min-width: 0; }

.hook-url {
  display: block;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text);
  word-break: break-all;
}

.hook-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--border);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  padding: 2px 9px;
}

.tag-ok {
  color: var(--success);
  background: var(--success-bg-soft);
  border-color: var(--success-border-soft);
}

.tag-off { color: var(--text-faint); }

.tag-bad {
  color: var(--danger);
  background: var(--danger-bg-soft);
  border-color: var(--danger-border-soft);
}

.hook-disabled {
  font-size: 0.79rem;
  color: var(--danger);
  margin: 10px 0 0;
  line-height: 1.5;
}

.hook-body {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.hook-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.meta-label {
  color: var(--text-faint);
  margin-right: 5px;
}

.meta-error {
  flex-basis: 100%;
  color: var(--danger);
  word-break: break-word;
}

.hook-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

/* ── Deliveries ── */
.deliveries {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.deliveries-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.deliveries-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin: 0;
}

.delivery-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delivery-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 11px;
}

.delivery-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.delivery-event {
  font-size: 0.79rem;
  color: var(--text);
  font-weight: 600;
}

.delivery-status {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-ok { color: var(--success); }
.status-bad { color: var(--danger); }
.status-pending { color: var(--warning); }

.delivery-dim {
  font-size: 0.76rem;
  color: var(--text-faint);
}

.delivery-date { margin-left: auto; }

.delivery-error {
  font-size: 0.76rem;
  color: var(--danger);
  margin: 6px 0 0;
  word-break: break-word;
}

.delivery-payload {
  margin: 8px 0 0;
  padding: 9px 11px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 0.74rem;
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: pre;
}

.deliveries-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.pager-buttons { display: flex; gap: 8px; }

/* ── Reveal-once secret ── */
.reveal-card {
  background: var(--danger-bg);
  border: 1px solid var(--danger-border-mid);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.reveal-warning {
  font-size: 0.82rem;
  color: var(--danger);
  margin: 0 0 8px;
}

.reveal-url {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 0 0 10px;
  word-break: break-all;
}

.reveal-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

.reveal-key {
  flex-grow: 1;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 0.8rem;
  color: var(--text);
  word-break: break-all;
}

.reveal-hint {
  font-size: 0.78rem;
  color: var(--text-faint);
  line-height: 1.5;
  margin: 0 0 10px;
}
</style>
