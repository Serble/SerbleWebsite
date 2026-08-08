import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import HomePage from '@/pages/HomePage.vue'
import NotFound from "@/pages/NotFound.vue";
import { authReadyPromise, userStore } from '@/assets/js/user.js';
import { featureStore } from '@/assets/js/featureFlags.js';
import i18n from '@/assets/js/i18n.js';

const ECONOMY_FEATURE = 'economy';

// The site name is localised too — the joke locales rewrite it. Resolved per
// call rather than once at module load, so it follows a locale change.
const siteName = () => i18n.global.t('serble');

/**
 * Document titles, keyed by route name. Kept as one table rather than a `meta`
 * entry on every route so there's a single place to read and edit them.
 * Routes missing here fall back to the bare site name.
 *
 * The values are i18n message keys, not literal text. They live under their own
 * `title-` namespace rather than reusing the nav/button keys that happen to say
 * the same thing: a title is Title Case and kept short for a browser tab, while
 * the same words as a link or heading follow that component's own casing. One
 * shared key would force the two to change together.
 *
 * Keep the translations short — ` · Serble` is appended, and a browser tab only
 * shows around 20 characters before truncating. Aim for two words.
 *
 * These are titles, so they are written in Title Case: every word capitalised,
 * including both halves of a hyphenated compound and the particle of a phrasal
 * verb ("Sign In"). Only articles, coordinating conjunctions and short
 * prepositions stay lowercase, and never as the first or last word.
 */
const ROUTE_TITLES = {
  home: null,                          // the home page is just the site name
  login: 'title-sign-in',
  register: 'title-register',
  MFA: 'title-mfa',
  account: 'title-account',
  SetupTOTP: 'title-setup-totp',
  OAuthApps: 'title-oauth-apps',
  NewOAuthApp: 'title-new-oauth-app',
  ManageOAuthApp: 'title-manage-oauth-app',
  AuthorizedApps: 'title-authorized-apps',
  Balance: 'title-balance',
  Inventory: 'title-inventory',
  Trades: 'title-trades',
  ItemInfo: 'title-item',
  PaymentPortal: 'title-payments',
  Admin: 'title-admin',
  Store: 'title-store',
  Purchase: 'title-checkout',
  PurchaseAnon: 'title-checkout',
  StoreSuccess: 'title-order-confirmed',
  StoreCancel: 'title-order-cancelled',
  Swift: 'title-swift',
  WordMaster: 'title-word-master',
  Discord: 'title-discord',
  CoinAsset: 'title-coin',
  Contact: 'title-contact',
  Notes: 'title-notes',
  EmailConfirmSuccess: 'title-email-confirmed',
  EmailConfirmError: 'title-email-not-confirmed',
  OAuthAuthorize: 'title-authorize',
  TransactionConsent: 'title-transaction-consent',
  LoadingPreview: 'title-loading-preview',
  NotFound: 'title-not-found',
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  // Without this, navigating from a scrolled page lands you mid-page on the
  // next one. Back/forward restore where the user was; everything else starts
  // at the top, and in-page anchors scroll to their target.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  },

  routes: [
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: NotFound
    },
    {
      path: '/',
      name: 'home',
      component: HomePage,
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/Account/LoginPage.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/pages/Account/RegisterPage.vue'),
    },
    {
      path: '/mfa',
      name: 'MFA',
      component: () => import('@/pages/Account/MfaLoginPage.vue'),
    },
    {
      path: '/account',
      name: 'account',
      component: () => import('@/pages/Account/AccountPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/setuptotp',
      name: 'SetupTOTP',
      component: () => import('@/pages/Account/SetupTotp.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/oauthapps',
      name: 'OAuthApps',
      component: () => import('@/pages/Account/OAuthAppsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/oauthapps/new',
      name: 'NewOAuthApp',
      component: () => import('@/pages/Account/NewOAuthAppPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/oauthapps/manage',
      name: 'ManageOAuthApp',
      component: () => import('@/pages/Account/ManageOAuthAppPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      // The edit page became a tab of the manage page — keep old links (and bookmarks) working.
      path: '/oauthapps/edit',
      redirect: to => ({ path: '/oauthapps/manage', query: { ...to.query, tab: 'settings' } }),
    },
    {
      path: '/authorizedapps',
      name: 'AuthorizedApps',
      component: () => import('@/pages/Account/AuthorizedAppsPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/account/balance',
      name: 'Balance',
      component: () => import('@/pages/Account/BalancePage.vue'),
      meta: { requiresAuth: true, feature: ECONOMY_FEATURE },
    },
    {
      path: '/account/inventory',
      name: 'Inventory',
      component: () => import('@/pages/Account/InventoryPage.vue'),
      meta: { requiresAuth: true, feature: ECONOMY_FEATURE },
    },
    {
      path: '/account/trades',
      name: 'Trades',
      component: () => import('@/pages/Account/TradesPage.vue'),
      meta: { requiresAuth: true, feature: ECONOMY_FEATURE },
    },
    {
      // Public item profile + ownership history (anyone can look up any item).
      path: '/items/:id',
      name: 'ItemInfo',
      component: () => import('@/pages/Account/ItemInfoPage.vue'),
      meta: { feature: ECONOMY_FEATURE },
    },
    {
      path: '/account/paymentportal',
      name: 'PaymentPortal',
      component: () => import('@/pages/Account/PaymentPortalPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('@/pages/Admin/AdminDashboardPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/store',
      name: 'Store',
      component: () => import('@/pages/Store/StorePage.vue'),
    },
    {
      path: '/store/purchase',
      name: 'Purchase',
      component: () => import('@/pages/Store/PurchasePage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/store/purchaseanon',
      name: 'PurchaseAnon',
      component: () => import('@/pages/Store/PurchaseAnonPage.vue'),
    },
    {
      path: '/store/success',
      name: 'StoreSuccess',
      component: () => import('@/pages/Store/StoreSuccessPage.vue'),
    },
    {
      path: '/store/cancel',
      name: 'StoreCancel',
      component: () => import('@/pages/Store/StoreCancelPage.vue'),
    },
    {
      path: '/swift',
      name: 'Swift',
      component: () => import('@/pages/Store/SwiftPage.vue'),
    },
    {
      path: '/wordmaster',
      name: 'WordMaster',
      component: () => import('@/pages/Games/WordMasterPage.vue'),
    },
    {
      path: '/discord',
      name: 'Discord',
      component: () => import('@/pages/DiscordRedirectPage.vue'),
    },
    {
      // Public asset page: the coin artwork with hotlinkable URLs and embed snippets.
      path: '/coin',
      name: 'CoinAsset',
      component: () => import('@/pages/CoinAssetPage.vue'),
    },
    {
      path: '/contact',
      name: 'Contact',
      component: () => import('@/pages/ContactPage.vue'),
    },
    {
      path: '/notes',
      name: 'Notes',
      component: () => import('@/pages/Vault/NotesPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/vault/notes',
      redirect: '/notes',
    },
    {
      path: '/emailconfirm/success',
      name: 'EmailConfirmSuccess',
      component: () => import('@/pages/EmailConfirmation/EmailSuccessPage.vue'),
    },
    {
      path: '/emailconfirm/error',
      name: 'EmailConfirmError',
      component: () => import('@/pages/EmailConfirmation/EmailErrorPage.vue'),
    },
    {
      path: '/oauth/authorize',
      name: 'OAuthAuthorize',
      component: () => import('@/pages/Account/OAuthAuthorizeDispatcher.vue'),
      meta: { requiresAuth: true },
    },
    {
      // Preview/test route: renders the shared loading screen permanently.
      path: '/loading-preview',
      name: 'LoadingPreview',
      component: () => import('@/pages/LoadingPreviewPage.vue'),
    },
    {
      path: '/transactions/consent',
      name: 'TransactionConsent',
      component: () => import('@/pages/Account/TransactionConsentPage.vue'),
      meta: { requiresAuth: true, feature: ECONOMY_FEATURE },
    },
    {
      // Embeddable, chromeless item viewer for iframing into apps. Uses the user's own Serble
      // session (no app permissions needed). Optional ?app=<appId> filters to that app's items.
      path: '/embed/items',
      name: 'EmbedItems',
      component: () => import('@/pages/Embed/ItemViewerPage.vue'),
      meta: { embed: true, feature: ECONOMY_FEATURE },
    },
    {
      // Popup landing page for the embed's "connect account" flow: hands the logged-in session
      // token back to the embedding iframe via postMessage, then closes.
      path: '/embed/bridge',
      name: 'EmbedAuthBridge',
      component: () => import('@/pages/Embed/AuthBridgePage.vue'),
      meta: { embed: true, requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.feature) {
    await authReadyPromise;
    if (!featureStore.isEnabled(to.meta.feature)) {
      return { name: 'NotFound' };
    }
  }

  if (to.meta.requiresAuth) {
    await authReadyPromise;
    if (!userStore.state.user) {
      return { name: 'login', query: { return_url: to.fullPath } };
    }
  }
});

// Embedded routes render inside someone else's page, so leave the host's title.
function applyTitle(route) {
  if (!route?.name || route.meta.embed) return;
  const key = ROUTE_TITLES[route.name];
  const site = siteName();
  document.title = key ? `${i18n.global.t(key)} · ${site}` : site;
}

router.afterEach(applyTitle);

// The language picker in the footer swaps locale without navigating, so the
// title set by the last afterEach would otherwise keep the previous language.
watch(i18n.global.locale, () => applyTitle(router.currentRoute.value));

export default router
