import { computed, reactive, readonly } from 'vue';
import { isFeatureEnabled } from '@/assets/js/serble.js';

export const FEATURES = Object.freeze({
    ECONOMY: 'economy',
});

const state = reactive({
    loaded: false,
    values: {
        [FEATURES.ECONOMY]: false,
    },
});

let refreshPromise = null;

export const featureStore = {
    state: readonly(state),
    isEnabled(feature) {
        return state.values[feature] === true;
    },
    async refresh() {
        if (refreshPromise) return refreshPromise;
        refreshPromise = (async () => {
            const economy = await isFeatureEnabled(FEATURES.ECONOMY);
            state.values[FEATURES.ECONOMY] = economy.enabled === true;
            state.loaded = true;
            refreshPromise = null;
        })();
        return refreshPromise;
    },
};

export const economyEnabled = computed(() => featureStore.isEnabled(FEATURES.ECONOMY));
