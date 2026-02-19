<script>
import { inject, computed, ref } from 'vue';
import { useRoute } from 'vue-router';

export default {
  setup() {
    const userStore = inject('userStore');
    const route = useRoute();

    const user = computed(() => userStore.state.user);
    const isAdmin = computed(() => (user.value?.permLevel ?? 0) > 1);
    const mobileOpen = ref(false);

    function toggleMobile() {
      mobileOpen.value = !mobileOpen.value;
    }

    function closeMobile() {
      mobileOpen.value = false;
    }

    function isActive(path) {
      return route.path === path;
    }

    return { user, isAdmin, userStore, mobileOpen, toggleMobile, closeMobile, isActive };
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
        <img src="/images/icon.png" width="32" height="32" alt="Serble" class="nav-logo" />
        <span class="nav-brand-name">Serble</span>
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
        <li class="nav-dropdown-wrap">
          <button class="nav-link nav-dropdown-btn">
            {{ $t('games') }}
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" class="chevron">
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          </button>
          <div class="nav-dropdown">
            <RouterLink to="/wordmaster" class="nav-dropdown-item">{{ $t('word-master') }}</RouterLink>
          </div>
        </li>

        <!-- Info dropdown -->
        <li class="nav-dropdown-wrap">
          <button class="nav-link nav-dropdown-btn">
            {{ $t('info') }}
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" class="chevron">
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          </button>
          <div class="nav-dropdown">
            <RouterLink to="/discord" class="nav-dropdown-item">{{ $t('serble-discord') }}</RouterLink>
            <RouterLink to="/contact" class="nav-dropdown-item">{{ $t('contact') }}</RouterLink>
          </div>
        </li>

        <!-- Vault dropdown -->
        <li class="nav-dropdown-wrap">
          <button class="nav-link nav-dropdown-btn">
            {{ $t('vault') }}
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" class="chevron">
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          </button>
          <div class="nav-dropdown">
            <RouterLink to="/notes" class="nav-dropdown-item">{{ $t('notes') }}</RouterLink>
          </div>
        </li>
      </ul>

      <!-- Right side -->
      <div class="nav-right">
        <!-- Logged in: user menu -->
        <div v-if="user" class="nav-dropdown-wrap">
          <button class="nav-user-btn nav-dropdown-btn">
            <span class="nav-avatar">{{ (user.username ?? '?')[0].toUpperCase() }}</span>
            <span class="nav-username">{{ user.username }}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" class="chevron">
              <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
          </button>
          <div class="nav-dropdown nav-dropdown-right">
            <RouterLink to="/account" class="nav-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/></svg>
              {{ $t('account') }}
            </RouterLink>
            <RouterLink to="/oauthapps" class="nav-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2"/></svg>
              {{ $t('my-applications') }}
            </RouterLink>
            <RouterLink to="/authorizedapps" class="nav-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path d="M5.338 1.59a61 61 0 0 0-2.837.856.48.48 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.7 10.7 0 0 0 2.287 2.233c.346.244.652.42.893.533.18.085.293.118.293.118s.114-.033.294-.118c.24-.113.547-.29.893-.533a10.7 10.7 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524z"/></svg>
              {{ $t('authorized-applications') }}
            </RouterLink>
            <RouterLink to="/account/paymentportal" class="nav-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/></svg>
              {{ $t('manage-payments') }}
            </RouterLink>
            <RouterLink v-if="isAdmin" to="/admin" class="nav-dropdown-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/></svg>
              {{ $t('admin-dashboard') }}
            </RouterLink>
            <div class="nav-dropdown-divider"></div>
            <button class="nav-dropdown-item nav-dropdown-danger" @click="logout">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" class="me-2 opacity-50"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/></svg>
              {{ $t('logout') }}
            </button>
          </div>
        </div>

        <!-- Logged out -->
        <div v-else class="nav-auth">
          <RouterLink to="/login" class="btn-nav-login">{{ $t('login') }}</RouterLink>
          <RouterLink to="/register" class="btn-nav-register">{{ $t('register') }}</RouterLink>
        </div>

        <!-- Mobile hamburger -->
        <button class="nav-hamburger" @click="toggleMobile" :aria-expanded="mobileOpen">
          <span></span><span></span><span></span>
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
/* ── Base ── */
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(17, 17, 19, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #27272a;
}

.nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Brand ── */
.nav-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}

.nav-logo {
  border-radius: 7px;
}

.nav-brand-name {
  font-size: 1rem;
  font-weight: 700;
  color: #f4f4f5;
  letter-spacing: -0.01em;
}

/* ── Centre links ── */
.nav-links {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0 auto;
  padding: 0;
  gap: 2px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 11px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #a1a1aa;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.nav-link:hover,
.nav-link.active {
  color: #f4f4f5;
  background: rgba(255,255,255,0.06);
}

.nav-link.active {
  color: #fff;
}

/* ── Dropdowns ── */
.nav-dropdown-wrap {
  position: relative;
}

.nav-dropdown-wrap:hover .nav-dropdown {
  opacity: 1;
  pointer-events: all;
  transform: translateY(0);
}

.nav-dropdown-btn {
  /* inherits .nav-link */
}

.chevron {
  opacity: 0.5;
  transition: transform 0.15s;
}

.nav-dropdown-wrap:hover .chevron {
  transform: rotate(180deg);
}

.nav-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  padding: 6px 4px 4px;
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s, transform 0.15s;
  z-index: 200;
}

/* Invisible bridge so the mouse can travel from trigger into the dropdown */
.nav-dropdown::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 8px;
}

.nav-dropdown-right {
  left: auto;
  right: 0;
  min-width: 200px;
}

.nav-dropdown-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 7px 10px;
  border-radius: 5px;
  font-size: 0.83rem;
  color: #a1a1aa;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color 0.12s, background 0.12s;
}

.nav-dropdown-item:hover {
  color: #f4f4f5;
  background: rgba(255,255,255,0.06);
}

.nav-dropdown-danger {
  color: #f87171;
}

.nav-dropdown-danger:hover {
  color: #fca5a5;
  background: rgba(239,68,68,0.08);
}

.nav-dropdown-divider {
  height: 1px;
  background: #27272a;
  margin: 4px 0;
}

/* ── Right side ── */
.nav-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* User button */
.nav-user-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 5px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid #3f3f46;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.nav-user-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: #52525b;
}

.nav-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-username {
  font-size: 0.85rem;
  font-weight: 500;
  color: #d4d4d8;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Auth buttons */
.nav-auth {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nav-login {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #a1a1aa;
  text-decoration: none;
  transition: color 0.15s;
}

.btn-nav-login:hover {
  color: #f4f4f5;
}

.btn-nav-register {
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background: #2563eb;
  text-decoration: none;
  border: none;
  transition: background 0.15s;
}

.btn-nav-register:hover {
  background: #1d4ed8;
}

/* ── Hamburger ── */
.nav-hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.nav-hamburger:hover {
  background: rgba(255,255,255,0.06);
}

.nav-hamburger span {
  display: block;
  height: 2px;
  background: #a1a1aa;
  border-radius: 2px;
  transition: background 0.15s;
}

.nav-hamburger:hover span {
  background: #f4f4f5;
}

/* ── Mobile menu ── */
.nav-mobile {
  display: none;
  flex-direction: column;
  border-top: 1px solid #27272a;
  padding: 8px 12px 12px;
  gap: 2px;
}

.nav-mobile.open {
  display: flex;
}

.nav-mobile-link {
  display: block;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #a1a1aa;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: color 0.12s, background 0.12s;
}

.nav-mobile-link:hover {
  color: #f4f4f5;
  background: rgba(255,255,255,0.05);
}

.nav-mobile-danger {
  color: #f87171;
}

.nav-mobile-divider {
  height: 1px;
  background: #27272a;
  margin: 6px 0;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }

  .nav-hamburger {
    display: flex;
  }

  .nav-auth {
    display: none;
  }

  .nav-username {
    display: none;
  }
}
</style>
