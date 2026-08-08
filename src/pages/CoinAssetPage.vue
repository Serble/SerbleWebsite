<script>
import { ref, computed, onUnmounted } from 'vue';

export default {
  setup() {
    // Assets live in /public, so they're served from the site root and are hotlinkable as-is.
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://serble.net';

    const svgUrl = computed(() => `${origin}/images/coin.svg`);
    const pngSizes = [64, 128, 256, 512];
    const pngUrl = (size) => `${origin}/images/coin-${size}.png`;

    const snippets = computed(() => [
      {
        key: 'img',
        label: 'HTML',
        hint: 'Scales to any size — set width/height in CSS or attributes.',
        code: `<img src="${svgUrl.value}" :alt="$t('serble-coin')" width="24" height="24">`,
      },
      {
        key: 'inline',
        label: 'Inline with text',
        hint: 'Aligns the coin with a balance or price.',
        code: `<span style="display:inline-flex;align-items:center;gap:4px">
  <img src="${svgUrl.value}" :alt="$t('serble-coin')" width="16" height="16">
  1,250
</span>`,
      },
      {
        key: 'markdown',
        label: 'Markdown',
        hint: 'For READMEs, docs and wikis.',
        code: `![Serble coin](${pngUrl(64)})`,
      },
      {
        key: 'css',
        label: 'CSS background',
        hint: 'When the coin is decoration rather than content.',
        code: `.coin {
  background: url("${svgUrl.value}") no-repeat center / contain;
  width: 24px;
  height: 24px;
}`,
      },
    ]);

    const copied = ref(null);
    let copyTimer = null;

    async function copy(key, text) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
      copied.value = key;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copied.value = null; }, 2000);
    }

    onUnmounted(() => clearTimeout(copyTimer));

    return { svgUrl, pngSizes, pngUrl, snippets, copied, copy };
  }
};
</script>

<template>
  <div class="coin-page">
    <div class="coin-inner">

      <!-- Header -->
      <div class="coin-header">
        <img :src="svgUrl" :alt="$t('serble-coin')" width="72" height="72" class="hero-coin">
        <h1 class="coin-title">{{ $t('serble-coin-asset') }}</h1>
        <p class="coin-sub">
          The Serble coin, hosted for anyone to embed. Hotlink it directly — no download, no
          attribution required, and it stays up to date if the artwork ever changes.
        </p>
      </div>

      <!-- Direct links -->
      <section class="coin-section">
        <h2 class="section-title">{{ $t('direct-links') }}</h2>
        <div class="link-list">
          <button class="link-row" type="button" @click="copy('svg', svgUrl)">
            <span class="link-badge svg">SVG</span>
            <span class="link-url">{{ svgUrl }}</span>
            <span class="link-note">{{ $t('any-size') }}</span>
            <span class="link-copy">{{ copied === 'svg' ? $t('copied') : $t('copy') }}</span>
          </button>
          <button
            v-for="size in pngSizes"
            :key="size"
            class="link-row"
            type="button"
            @click="copy(`png-${size}`, pngUrl(size))"
          >
            <span class="link-badge png">PNG</span>
            <span class="link-url">{{ pngUrl(size) }}</span>
            <span class="link-note">{{ size }}&times;{{ size }}</span>
            <span class="link-copy">{{ copied === `png-${size}` ? 'Copied' : 'Copy' }}</span>
          </button>
        </div>
        <p class="section-note">
          Prefer the SVG — it's under 1&nbsp;KB and stays sharp at every size. The PNGs are there
          for places that don't render SVG, like some chat embeds and email clients.
        </p>
      </section>

      <!-- Preview at real sizes -->
      <section class="coin-section">
        <h2 class="section-title">{{ $t('how-it-looks') }}</h2>
        <div class="preview-grid">
          <div v-for="size in [16, 24, 32, 48, 64]" :key="size" class="preview-cell">
            <div class="preview-box">
              <img :src="svgUrl" :alt="$t('serble-coin')" :width="size" :height="size">
            </div>
            <span class="preview-label">{{ size }}px</span>
          </div>
        </div>
        <div class="bg-checks">
          <div class="bg-check light">
            <img :src="svgUrl" :alt="$t('serble-coin')" width="40" height="40">
            <span>{{ $t('light') }}</span>
          </div>
          <div class="bg-check dark">
            <img :src="svgUrl" :alt="$t('serble-coin')" width="40" height="40">
            <span>{{ $t('dark') }}</span>
          </div>
          <div class="bg-check checker">
            <img :src="svgUrl" :alt="$t('serble-coin')" width="40" height="40">
            <span>{{ $t('transparent') }}</span>
          </div>
        </div>
      </section>

      <!-- Copy-paste snippets -->
      <section class="coin-section">
        <h2 class="section-title">{{ $t('snippets') }}</h2>
        <div class="snippet-list">
          <div v-for="s in snippets" :key="s.key" class="snippet">
            <div class="snippet-head">
              <div class="snippet-head-text">
                <span class="snippet-label">{{ s.label }}</span>
                <span class="snippet-hint">{{ s.hint }}</span>
              </div>
              <button class="snippet-copy" type="button" @click="copy(s.key, s.code)">
                {{ copied === s.key ? $t('copied') : $t('copy') }}
              </button>
            </div>
            <pre class="snippet-code"><code>{{ s.code }}</code></pre>
          </div>
        </div>
      </section>

      <!-- Usage -->
      <section class="coin-section">
        <h2 class="section-title">{{ $t('usage') }}</h2>
        <ul class="usage-list">
          <li>{{ $t('coin-usage-1') }}</li>
          <li>{{ $t('coin-usage-2') }}</li>
          <li>{{ $t('coin-usage-3') }}</li>
          <li>{{ $t('coin-usage-4') }}</li>
        </ul>
      </section>

    </div>
  </div>
</template>

<style scoped>
.coin-page {
  padding: 48px 24px 72px;
  display: flex;
  justify-content: center;
}

.coin-inner {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* Header */
.coin-header {
  text-align: center;
}

.hero-coin {
  margin-bottom: 16px;
}

.coin-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 10px;
}

.coin-sub {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--text-dim);
  margin: 0 auto;
  max-width: 520px;
}

/* Sections */
.coin-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin: 0;
}

.section-note {
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-dim);
  margin: 0;
}

/* Direct links */
.link-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.link-row:hover {
  border-color: var(--border-strong);
}

.link-badge {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 3px 7px;
  border-radius: 5px;
  flex-shrink: 0;
}

.link-badge.svg {
  background: rgba(59, 130, 246, 0.14);
  color: var(--accent-light);
}

.link-badge.png {
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-dim);
}

.link-url {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-note {
  font-size: 0.75rem;
  color: var(--text-dim);
  flex-shrink: 0;
}

.link-copy {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-dim);
  flex-shrink: 0;
  min-width: 46px;
  text-align: right;
}

.link-row:hover .link-copy {
  color: var(--text-secondary);
}

/* Previews */
.preview-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.preview-cell {
  flex: 1 1 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-box {
  width: 100%;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
}

.preview-label {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.bg-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.bg-check {
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 12px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.bg-check span {
  font-size: 0.72rem;
  font-weight: 600;
}

.bg-check.light {
  background: #ffffff;
}

.bg-check.light span {
  color: #64748b;
}

.bg-check.dark {
  background: #101014;
}

.bg-check.dark span {
  color: #94a3b8;
}

.bg-check.checker {
  background-color: #f8fafc;
  background-image:
    linear-gradient(45deg, #d7dde5 25%, transparent 25%, transparent 75%, #d7dde5 75%),
    linear-gradient(45deg, #d7dde5 25%, transparent 25%, transparent 75%, #d7dde5 75%);
  background-size: 16px 16px;
  background-position: 0 0, 8px 8px;
}

.bg-check.checker span {
  color: #475569;
}

/* Snippets */
.snippet-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snippet {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.snippet-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
}

.snippet-head-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.snippet-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text);
}

.snippet-hint {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.snippet-copy {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 5px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}

.snippet-copy:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.snippet-code {
  margin: 0;
  padding: 14px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre;
}

/* Usage */
.usage-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--text-dim);
}
</style>
