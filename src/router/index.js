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
  ],
})

export default router
