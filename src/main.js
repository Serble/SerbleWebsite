import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from '@/assets/js/i18n.js';
import useUserStore from "@/assets/js/user.js";
import { featureStore } from '@/assets/js/featureFlags.js';

const app = createApp(App);

app.use(i18n);
app.use(router);

const userStore = useUserStore();
userStore.initializeAuth();  // Can be awaited

app.provide('userStore', userStore);
app.provide('featureStore', featureStore);

app.mount('#app');
