<script>
import { inject, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '@/components/Icon.vue';
import { FEATURES } from '@/assets/js/featureFlags.js';

// Below this width the bar collapses to the brand and one menu button. Keep in step with the
// @media query at the bottom of the styles.
const MOBILE_QUERY = '(max-width: 768px)';

export default {
  components: { Icon },
  setup() {
    const userStore = inject('userStore');
    const featureStore = inject('featureStore');
    const route = useRoute();

    const user = computed(() => userStore.state.user);
    const isAdmin = computed(() => (user.value?.permLevel ?? 0) > 1);
    const economyEnabled = computed(() => featureStore?.isEnabled(FEATURES.ECONOMY) === true);

    // One source for every link, so the desktop bar, its dropdowns and the phone menu always
    // list the same places in the same order. Labels are locale keys.
    const topLinks = [
      { to: '/', label: 'home' },
      { href: 'https://status.serble.net', label: 'status' },
      { to: '/store', label: 'store' },
    ];
    const groups = [
      { key: 'games', label: 'games', items: [{ to: '/wordmaster', label: 'word-master' }] },
      { key: 'info', label: 'info', items: [{ to: '/discord', label: 'serble-discord' }, { to: '/contact', label: 'contact' }] },
      { key: 'vault', label: 'vault', items: [{ to: '/notes', label: 'notes' }] },
    ];
    const accountLinks = computed(() => [
      { to: '/account', label: 'account' },
      { to: '/oauthapps', label: 'my-applications' },
      { to: '/authorizedapps', label: 'authorized-applications' },
      ...(economyEnabled.value ? [
        { to: '/account/balance', label: 'balance' },
        { to: '/account/inventory', label: 'inventory' },
        { to: '/account/trades', label: 'trades' },
      ] : []),
      { to: '/account/paymentportal', label: 'manage-payments' },
      ...(isAdmin.value ? [{ to: '/admin', label: 'admin-dashboard' }] : []),
    ]);

    // -- Desktop dropdowns --
    // Which dropdown is open, by key. A click toggles it; hovering opens it only for a real
    // mouse. Touch screens fire pointerenter and then click on the same tap, which used to
    // open the menu and shut it again straight away.
    const openMenu = ref(null);

    function toggleMenu(key) {
      openMenu.value = openMenu.value === key ? null : key;
    }

    function hoverOpen(e, key) {
      if (e.pointerType === 'mouse') openMenu.value = key;
    }

    function hoverClose(e) {
      if (e.pointerType === 'mouse') openMenu.value = null;
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

    // A menu opened by click stays open until something else is clicked.
    function onDocumentClick(e) {
      if (openMenu.value && !e.target.closest('.nav-dropdown-wrap')) closeMenu();
    }

    // -- Phone menu --
    const mobileOpen = ref(false);
    const toggleButton = ref(null);

    function toggleMobile() {
      mobileOpen.value = !mobileOpen.value;
    }

    function closeMobile() {
      mobileOpen.value = false;
      closeMenu();
    }

    // The panel covers the page, so the page behind must not scroll with it.
    watch(mobileOpen, (open) => {
      document.documentElement.style.overflow = open ? 'hidden' : '';
    });

    // Close on any navigation, including back/forward.
    watch(() => route.fullPath, closeMobile);

    function onDocumentKeydown(e) {
      if (e.key === 'Escape' && mobileOpen.value) {
        closeMobile();
        toggleButton.value?.focus();
      }
    }

    // Widening past the breakpoint (rotating a tablet) leaves no panel behind.
    let mql = null;
    function onBreakpoint(e) {
      if (!e.matches) closeMobile();
    }

    onMounted(() => {
      document.addEventListener('click', onDocumentClick);
      document.addEventListener('keydown', onDocumentKeydown);
      mql = window.matchMedia(MOBILE_QUERY);
      mql.addEventListener('change', onBreakpoint);
    });
    onBeforeUnmount(() => {
      document.removeEventListener('click', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
      mql?.removeEventListener('change', onBreakpoint);
      document.documentElement.style.overflow = '';
    });

    // Before the router resolves the first navigation the route is a bare "/",
    // which would flash the Home underline on every page load. Only match once
    // a real route has been resolved.
    function isActive(path) {
      return route.matched.length > 0 && route.path === path;
    }

    return {
      user, userStore, topLinks, groups, accountLinks, isActive,
      openMenu, toggleMenu, hoverOpen, hoverClose, closeMenu, onMenuKeydown,
      mobileOpen, toggleMobile, closeMobile, toggleButton,
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
        <li v-for="link in topLinks" :key="link.label">
          <a v-if="link.href" :href="link.href" target="_blank" rel="noopener" class="nav-link">{{ $t(link.label) }}</a>
          <RouterLink v-else :to="link.to" class="nav-link" :class="{ active: isActive(link.to) }">{{ $t(link.label) }}</RouterLink>
        </li>

        <li
          v-for="group in groups"
          :key="group.key"
          class="nav-dropdown-wrap"
          @pointerenter="hoverOpen($event, group.key)"
          @pointerleave="hoverClose"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === group.key"
            @click="toggleMenu(group.key)"
          >
            {{ $t(group.label) }}
            <Icon name="chevronDown" :size="12" class="chevron" />
          </button>
          <div class="nav-dropdown" :class="{ open: openMenu === group.key }">
            <RouterLink
              v-for="item in group.items"
              :key="item.to"
              :to="item.to"
              class="nav-dropdown-item"
              @click="closeMenu"
            >{{ $t(item.label) }}</RouterLink>
          </div>
        </li>
      </ul>

      <!-- Right side -->
      <div class="nav-right">
        <!-- Logged in: user menu (desktop) -->
        <div
          v-if="user"
          class="nav-dropdown-wrap nav-user"
          @pointerenter="hoverOpen($event, 'user')"
          @pointerleave="hoverClose"
          @keydown="onMenuKeydown"
        >
          <button
            class="nav-link nav-user-btn nav-dropdown-btn"
            aria-haspopup="true"
            :aria-expanded="openMenu === 'user'"
            @click="toggleMenu('user')"
          >
            <span class="nav-username">{{ user.username }}</span>
            <Icon name="chevronDown" :size="12" class="chevron" />
          </button>
          <div class="nav-dropdown nav-dropdown-right" :class="{ open: openMenu === 'user' }">
            <RouterLink
              v-for="item in accountLinks"
              :key="item.to"
              :to="item.to"
              class="nav-dropdown-item"
              @click="closeMenu"
            >{{ $t(item.label) }}</RouterLink>
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item nav-dropdown-danger" @click="logout">{{ $t('logout') }}</button>
          </div>
        </div>

        <!-- Logged out (desktop) -->
        <div v-else class="nav-auth">
          <RouterLink to="/login" class="nav-link">{{ $t('login') }}</RouterLink>
          <RouterLink to="/register" class="btn-nav-register">{{ $t('register') }}</RouterLink>
        </div>

        <!-- Phone: the one control on the right -->
        <button
          ref="toggleButton"
          class="nav-hamburger"
          :aria-expanded="mobileOpen"
          aria-controls="nav-mobile"
          :aria-label="$t('menu')"
          @click="toggleMobile"
        >
          <span></span><span></span>
        </button>
      </div>

    </div>

    <!-- Phone menu: the same links as the bar, grouped under the same names as its dropdowns. -->
    <div id="nav-mobile" class="nav-mobile" :class="{ open: mobileOpen }">
      <div class="nav-mobile-inner">
        <section class="nav-mobile-section">
          <p class="nav-mobile-label">{{ $t('navigate') }}</p>
          <template v-for="link in topLinks" :key="link.label">
            <a v-if="link.href" :href="link.href" target="_blank" rel="noopener" class="nav-mobile-link" @click="closeMobile">
              {{ $t(link.label) }}<Icon name="arrowUpRight" :size="14" class="nav-mobile-external" />
            </a>
            <RouterLink
              v-else
              :to="link.to"
              class="nav-mobile-link"
              :class="{ active: isActive(link.to) }"
              @click="closeMobile"
            >{{ $t(link.label) }}</RouterLink>
          </template>
        </section>

        <!-- The small groups sit side by side so the account links stay near the top. -->
        <div class="nav-mobile-groups">
        <section v-for="group in groups" :key="group.key" class="nav-mobile-section" :style="{ gridArea: group.key }">
          <p class="nav-mobile-label">{{ $t(group.label) }}</p>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-mobile-link"
            :class="{ active: isActive(item.to) }"
            @click="closeMobile"
          >{{ $t(item.label) }}</RouterLink>
        </section>
        </div>

        <!-- Signed in: headed by the username, as the desktop menu is -->
        <section v-if="user" class="nav-mobile-section nav-mobile-account">
          <p class="nav-mobile-label nav-mobile-user">
            <Icon name="person" :size="14" />
            <span>{{ user.username }}</span>
          </p>
          <RouterLink
            v-for="item in accountLinks"
            :key="item.to"
            :to="item.to"
            class="nav-mobile-link"
            :class="{ active: isActive(item.to) }"
            @click="closeMobile"
          >{{ $t(item.label) }}</RouterLink>
          <button class="nav-mobile-link nav-mobile-danger" @click="logout">{{ $t('logout') }}</button>
        </section>

        <!-- Signed out -->
        <div v-else class="nav-mobile-auth">
          <RouterLink to="/login" class="nav-mobile-btn" @click="closeMobile">{{ $t('login') }}</RouterLink>
          <RouterLink to="/register" class="nav-mobile-btn nav-mobile-btn-primary" @click="closeMobile">{{ $t('register') }}</RouterLink>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.site-nav {
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
  --nav-h: 60px;
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
  height: var(--nav-h);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* -- Brand -- */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  /* a full-height tap target without moving the logo */
  align-self: stretch;
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

/* -- Menu button: two bars that ease into a cross. 44px square to suit a thumb. -- */
.nav-hamburger {
  display: none;
  position: relative;
  width: 44px;
  height: 44px;
  /* optically align the bars with the page gutter */
  margin-right: -11px;
  padding: 0;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.nav-hamburger:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.nav-hamburger span {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 1.5px;
  background: var(--text);
  transition: transform 0.3s var(--ease);
}

.nav-hamburger span:first-child { top: 18px; }
.nav-hamburger span:last-child  { top: 25px; }

.nav-hamburger[aria-expanded="true"] span:first-child {
  transform: translateY(3.5px) rotate(45deg);
}

.nav-hamburger[aria-expanded="true"] span:last-child {
  transform: translateY(-3.5px) rotate(-45deg);
}

/* -- Phone menu --
   Covers the page below the bar and scrolls on its own, so every item is reachable on a short
   screen without the page moving underneath. */
.nav-mobile {
  display: none;
  position: fixed;
  top: var(--nav-h);
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--surface-sunken);
  border-top: 1px solid var(--border);
}

.nav-mobile.open {
  display: block;
}

.nav-mobile-inner {
  padding: var(--space-1) var(--space-5) calc(var(--space-7) + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.nav-mobile-groups {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: "games info" "vault info";
  column-gap: var(--space-5);
  row-gap: var(--space-2);
}

.nav-mobile-section {
  display: flex;
  flex-direction: column;
}

/* Section names: the footer's mono headings, and the desktop dropdown names. */
.nav-mobile-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 2px;
  padding-top: var(--space-3);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: var(--text-faint);
}

.nav-mobile-user {
  color: var(--text-muted);
}

.nav-mobile-user span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-mobile-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  padding: 0;
  font: inherit;
  font-size: 1.05rem;
  color: var(--text-muted);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color var(--t);
}

.nav-mobile-link:hover,
.nav-mobile-link:focus-visible,
.nav-mobile-link.active {
  color: var(--text);
  outline: none;
}

/* The current page keeps an underline under its words, as the desktop links do. */
.nav-mobile-link.active,
.nav-mobile-link:focus-visible {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 6px;
}

.nav-mobile-external {
  opacity: 0.6;
}

.nav-mobile-danger {
  margin-top: var(--space-2);
  color: var(--danger);
}

.nav-mobile-danger:hover,
.nav-mobile-danger:focus-visible {
  color: var(--danger);
}

.nav-mobile-auth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding-top: var(--space-3);
}

.nav-mobile-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  text-decoration: none;
  transition: background var(--t), border-color var(--t);
}

.nav-mobile-btn-primary {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
}

/* -- Responsive -- */
@media (max-width: 768px) {
  .nav-inner {
    padding: 0 var(--space-5);
  }

  .nav-links,
  .nav-auth,
  .nav-user {
    display: none;
  }

  .nav-right {
    margin-left: auto;
  }

  .nav-hamburger {
    display: block;
  }
}

@media (min-width: 769px) {
  /* never leave a phone panel open on a wide screen */
  .nav-mobile.open {
    display: none;
  }
}

/* Tablets get the desktop bar; give its links and menu rows room for a finger. */
@media (pointer: coarse) {
  .nav-link {
    min-height: 44px;
  }

  .nav-dropdown-item {
    padding-block: 13px 14px;
  }

  .nav-dropdown-item::after {
    bottom: 9px;
  }
}
</style>
