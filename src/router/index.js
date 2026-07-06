import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import NotFound from "@/pages/NotFound.vue";
import { authReadyPromise, userStore } from '@/assets/js/user.js';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
      path: '/oauthapps/edit',
      name: 'EditOAuthApp',
      component: () => import('@/pages/Account/EditOAuthAppPage.vue'),
      meta: { requiresAuth: true },
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
      meta: { requiresAuth: true },
    },
    {
      path: '/account/inventory',
      name: 'Inventory',
      component: () => import('@/pages/Account/InventoryPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/account/trades',
      name: 'Trades',
      component: () => import('@/pages/Account/TradesPage.vue'),
      meta: { requiresAuth: true },
    },
    {
      // Public item profile + ownership history (anyone can look up any item).
      path: '/items/:id',
      name: 'ItemInfo',
      component: () => import('@/pages/Account/ItemInfoPage.vue'),
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
      meta: { requiresAuth: true },
    },
    {
      // Embeddable, chromeless item viewer for iframing into apps. Uses the user's own Serble
      // session (no app permissions needed). Optional ?app=<appId> filters to that app's items.
      path: '/embed/items',
      name: 'EmbedItems',
      component: () => import('@/pages/Embed/ItemViewerPage.vue'),
      meta: { embed: true },
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
  if (to.meta.requiresAuth) {
    await authReadyPromise;
    if (!userStore.state.user) {
      return { name: 'login', query: { return_url: to.fullPath } };
    }
  }
});

export default router
