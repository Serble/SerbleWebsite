<script>
import { inject, computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import CoinIcon from '@/components/CoinIcon.vue';
import Icon from '@/components/Icon.vue';
import { FEATURES } from '@/assets/js/featureFlags.js';

export default {
  components: { CoinIcon, Icon },
  setup() {
    const userStore = inject('userStore');
    const featureStore = inject('featureStore');
    const route = useRoute();

    const user = computed(() => userStore.state.user);
    const isAdmin = computed(() => (user.value?.permLevel ?? 0) > 1);
    const economyEnabled = computed(() => featureStore?.isEnabled(FEATURES.ECONOMY) === true);
    const mobileOpen = ref(false);

    // Which dropdown is open, by key. Hover alone used to drive this in CSS,
    // which left the menus unreachable by keyboard.
    const openMenu = ref(null);

    function toggleMenu(key) {
      openMenu.value = openMenu.value === key ? null : key;
    }

    function openMenuNow(key) {
      openMenu.value = key;
    }

    function closeMenu() {
      openMenu.value = null;
    }

    // Escape closes from anywhere inside the menu.
    function onMenuKeydown(e) {
      if (e.key === 'Escape') {
        closeMenu();
        e.currentTarget.querySelector('button')?.focus();
      }
    }

    function toggleMobile() {
      mobileOpen.value = !mobileOpen.value;
    }

    function closeMobile() {
      mobileOpen.value = false;
      closeMenu();
    }

    // Before the router resolves the first navigation the route is a bare "/",
    // which would flash the Home underline on every page load. Only match once
    // a real route has been resolved.
    function isActive(path) {
      return route.matched.length > 0 && route.path === path;
    }

    // A menu opened by click stays open until something else is clicked.
    function onDocumentClick(e) {
      if (openMenu.value && !e.target.closest('.nav-dropdown-wrap')) closeMenu();
    }

    onMounted(() => document.addEventListener('click', onDocumentClick));
    onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));

    return {
      user, isAdmin, economyEnabled, userStore, mobileOpen, toggleMobile, closeMobile, isActive,
      openMenu, toggleMenu, openMenuNow, closeMenu, onMenuKeydown,
    };
  },
  methods: {
    logout() {
      this.userStore.logout();
      this.closeMobile();
      window.location = '/';
    }
  }
};
</script>

<template>
  <nav class="site-nav">
    <div class="nav-inner">

      <!-- Brand -->
      <RouterLink to="/" class="nav-brand" @click="closeMobile">
        <img src="/images/icon.png" width="22" height="22" :alt="''" class="nav-logo" />
        <span class="nav-brand-name">{{ $t('serble') }}</span>
      </RouterLink>

      <!-- Centre links (desktop) -->
      <ul class="nav-links">
        <li>
          <RouterLink to="/" class="nav-link" :class="{ active: isActive('/') }">{{ $t('home') }}</RouterLink>
        </li>
        <li>
          <a href="https://status.serble.net" target="_blank" rel="noopener" class="nav-link">{{ $t('status') }}</a>
        </li>
        <li>
          <RouterLink to="/store" class="nav-link" :class="{ active: isActive('/store') }">{{ $t('store') }}</RouterLink>
        </li>

        <!-- Games dropdown -->
        <li
          class="nav-dropdown-wrap"
          @mouseenter="openMenuNow('games')"
          @mouseleave="closeMenu"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === 'games'"
            @click="toggleMenu('games')"
          >
            {{ $t('games') }}
            <Icon name="chevronDown" :size="10" class="chevron" />
          </button>
          <div class="nav-dropdown" :class="{ open: openMenu === 'games' }">
            <RouterLink to="/wordmaster" class="nav-dropdown-item" @click="closeMenu">{{ $t('word-master') }}</RouterLink>
          </div>
        </li>

        <!-- Info dropdown -->
        <li
          class="nav-dropdown-wrap"
          @mouseenter="openMenuNow('info')"
          @mouseleave="closeMenu"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === 'info'"
            @click="toggleMenu('info')"
          >
            {{ $t('info') }}
            <Icon name="chevronDown" :size="10" class="chevron" />
          </button>
          <div class="nav-dropdown" :class="{ open: openMenu === 'info' }">
            <RouterLink to="/discord" class="nav-dropdown-item" @click="closeMenu">{{ $t('serble-discord') }}</RouterLink>
            <RouterLink to="/contact" class="nav-dropdown-item" @click="closeMenu">{{ $t('contact') }}</RouterLink>
          </div>
        </li>

        <!-- Vault dropdown -->
        <li
          class="nav-dropdown-wrap"
          @mouseenter="openMenuNow('vault')"
          @mouseleave="closeMenu"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === 'vault'"
            @click="toggleMenu('vault')"
          >
            {{ $t('vault') }}
            <Icon name="chevronDown" :size="10" class="chevron" />
          </button>
          <div class="nav-dropdown" :class="{ open: openMenu === 'vault' }">
            <RouterLink to="/notes" class="nav-dropdown-item" @click="closeMenu">{{ $t('notes') }}</RouterLink>
          </div>
        </li>
      </ul>

      <!-- Right side -->
      <div class="nav-right">
        <!-- Logged in: user menu -->
        <div
          v-if="user"
          class="nav-dropdown-wrap"
          @mouseenter="openMenuNow('user')"
          @mouseleave="closeMenu"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-user-btn nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === 'user'"
            @click="toggleMenu('user')"
          >
            <span class="nav-username">{{ user.username }}</span>
            <Icon name="chevronDown" :size="10" class="chevron" />
          </button>
          <div class="nav-dropdown nav-dropdown-right" :class="{ open: openMenu === 'user' }">
            <RouterLink to="/account" class="nav-dropdown-item">{{ $t('account') }}</RouterLink>
            <RouterLink to="/oauthapps" class="nav-dropdown-item">{{ $t('my-applications') }}</RouterLink>
            <RouterLink to="/authorizedapps" class="nav-dropdown-item">{{ $t('authorized-applications') }}</RouterLink>
            <RouterLink v-if="economyEnabled" to="/account/balance" class="nav-dropdown-item">{{ $t('balance') }}</RouterLink>
            <RouterLink v-if="economyEnabled" to="/account/inventory" class="nav-dropdown-item">{{ $t('inventory') }}</RouterLink>
            <RouterLink v-if="economyEnabled" to="/account/trades" class="nav-dropdown-item">{{ $t('trades') }}</RouterLink>
            <RouterLink to="/account/paymentportal" class="nav-dropdown-item">{{ $t('manage-payments') }}</RouterLink>
            <RouterLink v-if="isAdmin" to="/admin" class="nav-dropdown-item">{{ $t('admin-dashboard') }}</RouterLink>
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item nav-dropdown-danger" @click="logout">{{ $t('logout') }}</button>
          </div>
        </div>

        <!-- Logged out -->
        <div v-else class="nav-auth">
          <RouterLink to="/login" class="nav-link">{{ $t('login') }}</RouterLink>
          <RouterLink to="/register" class="btn-nav-register">{{ $t('register') }}</RouterLink>
        </div>

        <!-- Mobile toggle -->
        <button class="nav-hamburger" @click="toggleMobile" :aria-expanded="mobileOpen" :aria-label="$t('menu')">
          <span></span><span></span>
        </button>
      </div>

    </div>

    <!-- Mobile menu -->
    <div class="nav-mobile" :class="{ open: mobileOpen }">
      <RouterLink to="/" class="nav-mobile-link" @click="closeMobile">{{ $t('home') }}</RouterLink>
      <a href="https://status.serble.net" class="nav-mobile-link" @click="closeMobile">{{ $t('status') }}</a>
      <RouterLink to="/store" class="nav-mobile-link" @click="closeMobile">{{ $t('store') }}</RouterLink>
      <RouterLink to="/wordmaster" class="nav-mobile-link" @click="closeMobile">{{ $t('word-master') }}</RouterLink>
      <RouterLink to="/notes" class="nav-mobile-link" @click="closeMobile">{{ $t('notes') }}</RouterLink>
      <RouterLink to="/discord" class="nav-mobile-link" @click="closeMobile">{{ $t('serble-discord') }}</RouterLink>
      <RouterLink to="/contact" class="nav-mobile-link" @click="closeMobile">{{ $t('contact') }}</RouterLink>
      <div class="nav-mobile-divider"></div>
      <template v-if="user">
        <RouterLink to="/account" class="nav-mobile-link" @click="closeMobile">{{ $t('account') }}</RouterLink>
        <RouterLink to="/oauthapps" class="nav-mobile-link" @click="closeMobile">{{ $t('my-applications') }}</RouterLink>
        <RouterLink to="/authorizedapps" class="nav-mobile-link" @click="closeMobile">{{ $t('authorized-applications') }}</RouterLink>
        <RouterLink v-if="economyEnabled" to="/account/balance" class="nav-mobile-link" @click="closeMobile">{{ $t('balance') }}</RouterLink>
        <RouterLink v-if="economyEnabled" to="/account/inventory" class="nav-mobile-link" @click="closeMobile">{{ $t('inventory') }}</RouterLink>
        <RouterLink v-if="economyEnabled" to="/account/trades" class="nav-mobile-link" @click="closeMobile">{{ $t('trades') }}</RouterLink>
        <RouterLink to="/account/paymentportal" class="nav-mobile-link" @click="closeMobile">{{ $t('manage-payments') }}</RouterLink>
        <button class="nav-mobile-link nav-mobile-danger" @click="logout">{{ $t('logout') }}</button>
      </template>
      <template v-else>
        <RouterLink to="/login" class="nav-mobile-link" @click="closeMobile">{{ $t('login') }}</RouterLink>
        <RouterLink to="/register" class="nav-mobile-link" @click="closeMobile">{{ $t('register') }}</RouterLink>
      </template>
    </div>
  </nav>
</template>

<style scoped>
.site-nav {
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--surface-sunken);
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  /* Shares --container with the footer so their edges line up on wide screens. */
  max-width: var(--container);
  margin: 0 auto;
  padding: 0 var(--space-6);
  height: 60px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* -- Brand -- */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.nav-logo {
  border-radius: 4px;
}

.nav-brand-name {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

/* -- Links -- */
.nav-links {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0 auto;
  padding: 0;
  gap: 4px;
}

/* Text links with an underline that draws in from the left. The active page
   keeps its underline. */
.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.25s var(--ease);
}

.nav-link::after {
  content: '';
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease);
}

.nav-link:hover,
.nav-link.active,
.nav-dropdown-wrap:has(.nav-dropdown.open) > .nav-link {
  color: var(--text);
}

.nav-link:hover::after,
.nav-link.active::after {
  transform: scaleX(1);
}

/* -- Dropdowns -- */
.nav-dropdown-wrap {
  position: relative;
}

.chevron {
  opacity: 0.6;
  transition: transform 0.3s var(--ease);
}

.nav-dropdown-wrap:has(.nav-dropdown.open) .chevron {
  transform: rotate(180deg);
}

.nav-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  padding: 6px;
  background: var(--surface-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-popover);
  opacity: 0;
  /* visibility (not just opacity) so the links leave the tab order when
     closed - otherwise keyboard users tab through an invisible menu. */
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.2s var(--ease), transform 0.25s var(--ease), visibility 0.2s;
  z-index: 200;
}

.nav-dropdown.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

/* Invisible bridge so the mouse can travel from trigger into the dropdown */
.nav-dropdown::before {
  content: '';
  position: absolute;
  top: -14px;
  left: 0;
  right: 0;
  height: 14px;
}

.nav-dropdown-right {
  left: auto;
  right: 0;
  min-width: 220px;
}

/* Menu items: a row that lightens on hover, with the same underline that
   draws in under the top-level links. */
.nav-dropdown-item {
  position: relative;
  display: block;
  width: 100%;
  padding: 9px 12px 10px;
  border-radius: 4px;
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color var(--t), background var(--t);
}

.nav-dropdown-item + .nav-dropdown-item {
  margin-top: 2px;
}

.nav-dropdown-item::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 6px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease);
}

.nav-dropdown-item:hover,
.nav-dropdown-item:focus-visible {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}

.nav-dropdown-item:hover::after,
.nav-dropdown-item:focus-visible::after {
  transform: scaleX(1);
}

.nav-dropdown-danger {
  color: var(--danger);
}

.nav-dropdown-danger:hover,
.nav-dropdown-danger:focus-visible {
  color: var(--danger);
  background: var(--danger-bg-soft);
}

.nav-dropdown-divider {
  height: 1px;
  background: var(--border-strong);
  margin: 6px 6px;
}

/* -- Right side -- */
.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-user-btn {
  color: var(--text-secondary);
}

.nav-username {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-auth {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nav-register {
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  text-decoration: none;
  transition: background 0.25s var(--ease), transform 0.25s var(--ease);
}

.btn-nav-register:hover {
  background: var(--accent-hover);
  color: #fff;
}

.btn-nav-register:active {
  transform: scale(0.98);
}

/* -- Mobile toggle: two bars that ease into a cross -- */
.nav-hamburger {
  display: none;
  position: relative;
  width: 36px;
  height: 36px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.nav-hamburger span {
  position: absolute;
  left: 9px;
  right: 9px;
  height: 1.5px;
  background: var(--text);
  transition: transform 0.3s var(--ease);
}

.nav-hamburger span:first-child { top: 14px; }
.nav-hamburger span:last-child  { top: 21px; }

.nav-hamburger[aria-expanded="true"] span:first-child {
  transform: translateY(3.5px) rotate(45deg);
}

.nav-hamburger[aria-expanded="true"] span:last-child {
  transform: translateY(-3.5px) rotate(-45deg);
}

/* -- Mobile menu -- */
.nav-mobile {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--border);
  padding: 8px var(--space-3) 12px;
}

.nav-mobile.open {
  display: flex;
}

.nav-mobile-link {
  position: relative;
  display: block;
  width: 100%;
  padding: 11px var(--space-2) 12px;
  font-size: 1rem;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color var(--t);
}

.nav-mobile-link::after {
  content: '';
  position: absolute;
  left: var(--space-2);
  right: var(--space-2);
  bottom: 7px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s var(--ease);
}

.nav-mobile-link:hover,
.nav-mobile-link:focus-visible {
  color: var(--text);
}

.nav-mobile-link:hover::after,
.nav-mobile-link:focus-visible::after {
  transform: scaleX(1);
}

.nav-mobile-danger {
  color: var(--danger);
}

.nav-mobile-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
}

/* -- Responsive -- */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .nav-hamburger {
    display: block;
  }

  .nav-auth {
    display: none;
  }

  .nav-username {
    display: none;
  }
}
</style>
