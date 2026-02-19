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
    <div class="footer-top">

      <!-- Brand -->
      <div class="footer-col">
        <div class="footer-brand">
          <img src="/images/icon.png" width="32" height="32" alt="Serble" class="footer-logo" />
          <span class="footer-brand-name">Serble</span>
        </div>
        <p class="footer-tagline">A collection of services and tools,<br>built as a hobby.</p>
      </div>

      <!-- Navigation -->
      <div class="footer-col">
        <p class="footer-heading">Navigate</p>
        <ul class="footer-links">
          <li><a href="/">Home</a></li>
          <li><a href="/store">Store</a></li>
          <li><RouterLink to="/notes">Vault</RouterLink></li>
          <li><RouterLink to="/wordmaster">Games</RouterLink></li>
          <li><RouterLink to="/contact">Contact</RouterLink></li>
          <li><a href="https://status.serble.net" target="_blank" rel="noopener">Status ↗</a></li>
        </ul>
      </div>

      <!-- Account -->
      <div class="footer-col">
        <p class="footer-heading">Account</p>
        <ul class="footer-links">
          <li><RouterLink to="/login">Login</RouterLink></li>
          <li><RouterLink to="/register">Register</RouterLink></li>
          <li><RouterLink to="/account">Profile</RouterLink></li>
          <li><RouterLink to="/oauthapps">My Applications</RouterLink></li>
          <li><RouterLink to="/authorizedapps">Authorized Apps</RouterLink></li>
        </ul>
      </div>

      <!-- Language -->
      <div class="footer-col">
        <p class="footer-heading">{{ $t('language') }}</p>
        <div class="lang-select-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="lang-icon">
            <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.7 13.7 0 0 1-.312 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z"/>
          </svg>
          <select class="lang-select" :value="currentLocale" @change="changeLanguage">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

    </div>

    <div class="footer-bottom">
      <span>&copy; 2020–{{ new Date().getFullYear() }} CoPokBl &middot; <a href="/">Serble</a></span>
      <span class="footer-discord">
        <a href="/discord/" class="footer-discord-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
          </svg>
          Discord
        </a>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  border-top: 1px solid #27272a;
  background: #111113;
  margin-top: 48px;
}

.footer-top {
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px 32px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
}

@media (max-width: 768px) {
  .footer-top {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
}

@media (max-width: 480px) {
  .footer-top {
    grid-template-columns: 1fr;
  }
}

/* Brand column */
.footer-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.footer-logo {
  border-radius: 8px;
}

.footer-brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f4f4f5;
}

.footer-tagline {
  font-size: 0.82rem;
  color: #52525b;
  line-height: 1.6;
  margin: 0;
}

/* Link columns */
.footer-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #71717a;
  margin-bottom: 12px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-links a {
  font-size: 0.85rem;
  color: #a1a1aa;
  text-decoration: none;
  transition: color 0.15s;
}

.footer-links a:hover {
  color: #f4f4f5;
}

/* Bottom bar */
.footer-bottom {
  border-top: 1px solid #1f1f23;
  max-width: 1000px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.8rem;
  color: #52525b;
}

.footer-bottom a {
  color: #71717a;
  text-decoration: none;
}

.footer-bottom a:hover {
  color: #a1a1aa;
}

.footer-discord-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #7289da !important;
  transition: opacity 0.15s;
}

.footer-discord-link:hover {
  opacity: 0.8;
}

/* Language select */
.lang-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.lang-icon {
  position: absolute;
  left: 10px;
  color: #71717a;
  pointer-events: none;
  flex-shrink: 0;
}

.lang-select {
  appearance: none;
  background-color: #1c1c1f;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  color: #a1a1aa;
  font-size: 0.82rem;
  padding: 6px 28px 6px 30px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s, color 0.15s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2371717a' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 9px center;
}

.lang-select:hover,
.lang-select:focus {
  border-color: #71717a;
  color: #f4f4f5;
}

.lang-select option {
  background-color: #18181b;
  color: #e4e4e7;
}
</style>