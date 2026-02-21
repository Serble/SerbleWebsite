import { reactive, readonly } from 'vue';
import {checkLogin, logout} from "@/assets/js/serble.js";

const state = reactive({
    user: null
});

let _resolveAuthReady;

// Resolves once initializeAuth() has completed (regardless of login status)
export const authReadyPromise = new Promise(resolve => {
    _resolveAuthReady = resolve;
});

// Singleton store shared across the app
export const userStore = {
    state: readonly(state),
    async initializeAuth() {
        const user = await checkLogin();
        if (user) {
            state.user = user;
            console.log(user);
        }
        _resolveAuthReady();
    },
    updateUser(user) {
        state.user = user;
    },
    logout() {
        state.user = null;
        logout();
    }
};

// Backward-compatible factory for components that use inject/provide
const useUserStore = () => userStore;
export default useUserStore;