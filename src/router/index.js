import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import NotFound from "@/pages/NotFound.vue";

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
    },
    {
      path: '/setuptotp',
      name: 'SetupTOTP',
      component: () => import('@/pages/Account/SetupTotp.vue'),
    },
    {
      path: '/oauthapps',
      name: 'OAuthApps',
      component: () => import('@/pages/Account/OAuthAppsPage.vue'),
    },
    {
      path: '/oauthapps/new',
      name: 'NewOAuthApp',
      component: () => import('@/pages/Account/NewOAuthAppPage.vue'),
    },
    {
      path: '/oauthapps/edit',
      name: 'EditOAuthApp',
      component: () => import('@/pages/Account/EditOAuthAppPage.vue'),
    },
    {
      path: '/authorizedapps',
      name: 'AuthorizedApps',
      component: () => import('@/pages/Account/AuthorizedAppsPage.vue'),
    },
    {
      path: '/account/paymentportal',
      name: 'PaymentPortal',
      component: () => import('@/pages/Account/PaymentPortalPage.vue'),
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
      component: () => import('@/pages/Account/OAuthPage.vue'),
    },
  ],
})

export default router
