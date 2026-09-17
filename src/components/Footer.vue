<script setup>
import { useI18n } from 'vue-i18n';
import { setCookie } from '@/assets/js/utils.js';
import { getSupportedLocale, languageOptions } from '@/assets/js/languages.js';
import { computed } from 'vue';

const { locale } = useI18n({ useScope: 'global' });

const currentLocale = computed(() => getSupportedLocale(locale.value) || 'en');

function changeLanguage(e) {
  const normalized = getSupportedLocale(e.target.value) || 'en';
  locale.value = normalized;
  setCookie('locale', normalized, 9999);
}
</script>

<template>
  <footer class="site-footer">
    <div class="footer-inner">

      <div class="footer-grid">
        <!-- Brand: the wordmark set large in the display face, no logo tile. -->
        <div class="footer-brand">
          <RouterLink to="/" class="footer-wordmark">{{ $t('serble') }}</RouterLink>
          <p class="footer-tagline">{{ $t('footer-tagline-1') }}<br>{{ $t('footer-tagline-2') }}</p>
        </div>

        <div class="footer-col">
          <p class="footer-heading">{{ $t('navigate') }}</p>
          <ul class="footer-links">
            <li><RouterLink to="/">{{ $t('home') }}</RouterLink></li>
            <li><RouterLink to="/store">{{ $t('store') }}</RouterLink></li>
            <li><RouterLink to="/notes">{{ $t('vault') }}</RouterLink></li>
            <li><RouterLink to="/wordmaster">{{ $t('games') }}</RouterLink></li>
            <li><RouterLink to="/contact">{{ $t('contact') }}</RouterLink></li>
            <li><a href="https://status.serble.net" target="_blank" rel="noopener">{{ $t('status') }}</a></li>
          </ul>
        </div>

        <div class="footer-col">
          <p class="footer-heading">{{ $t('account') }}</p>
          <ul class="footer-links">
            <li><RouterLink to="/login">{{ $t('login') }}</RouterLink></li>
            <li><RouterLink to="/register">{{ $t('register') }}</RouterLink></li>
            <li><RouterLink to="/account">{{ $t('profile') }}</RouterLink></li>
            <li><RouterLink to="/oauthapps">{{ $t('my-applications') }}</RouterLink></li>
            <li><RouterLink to="/authorizedapps">{{ $t('authorized-apps') }}</RouterLink></li>
          </ul>
        </div>

        <div class="footer-col">
          <label class="footer-heading" for="footer-language">{{ $t('language') }}</label>
          <select id="footer-language" class="lang-select" :value="currentLocale" @change="changeLanguage">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; 2020-{{ new Date().getFullYear() }} CoPokBl</span>
        <a href="/discord/" class="footer-bottom-link">Discord</a>
      </div>

    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  margin-top: var(--space-8);
  border-top: 1px solid var(--border);
  background: var(--surface-sunken);
}

.footer-inner {
  max-width: var(--container);
  margin: 0 auto;
  padding: 56px var(--space-6) 0;
}

.footer-grid {
  display: grid;
  grid-template-columns: minmax(0, 5fr) repeat(3, minmax(0, 2fr));
  gap: 40px;
  padding-bottom: 56px;
}

/* Brand */
.footer-wordmark {
  display: inline-block;
  margin-bottom: 14px;
  font-weight: 700;
  font-size: 2.2rem;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--text);
  text-decoration: none;
  transition: color 0.25s var(--ease);
}

.footer-wordmark:hover {
  color: var(--text-muted);
}

.footer-tagline {
  margin: 0;
  max-width: 32ch;
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-dim);
}

/* Link columns */
.footer-heading {
  display: block;
  margin: 0 0 14px;
  font-family: var(--font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  color: var(--text-faint);
}

.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.footer-links a,
.footer-bottom-link {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: color 0.25s var(--ease), border-color 0.25s var(--ease);
}

.footer-links a:hover,
.footer-bottom-link:hover {
  color: var(--text);
  border-color: var(--text);
}

/* Language select: a bare control on a rule, matching the rest of the footer. */
.lang-select {
  appearance: none;
  width: 100%;
  max-width: 220px;
  padding: 6px 26px 8px 0;
  border: 0;
  border-bottom: 1px solid var(--border-strong);
  border-radius: 0;
  background-color: transparent;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='none' stroke='%238e8e99' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3.5 6.5 8 11l4.5-4.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 4px center;
  color: var(--text-muted);
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.25s var(--ease), border-color 0.25s var(--ease);
}

.lang-select:hover,
.lang-select:focus {
  color: var(--text);
  border-color: var(--text);
}

.lang-select:focus-visible {
  outline: none;
}

.lang-select option {
  background-color: var(--surface-raised);
  color: var(--text-secondary);
}

/* Bottom line */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 0 22px;
  border-top: 1px solid var(--border-subtle);
  font-size: 0.82rem;
  color: var(--text-faint);
}

.footer-bottom-link {
  font-size: 0.82rem;
}

@media (max-width: 768px) {
  .footer-inner {
    padding-top: 44px;
  }

  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    padding-bottom: 40px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
