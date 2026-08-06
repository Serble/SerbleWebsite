// Exact port of ScopeHandler.cs from OLD_ASPNET/Data/ScopeHandler.cs
// Scope string format: a string of 1s and 0s, one per scope in order.

export const SCOPES = [
    'full_access',
    'file_host',
    'user_info',
    'apps_control',
    'payment_info',
    'manage_account',
    'manage_apps',
    'vault',
    'economy',
    'manage_economy',
];

// Display names and descriptions live in the locale files, keyed by scope id:
// `scope-<id>` and `scope-<id>-desc`. They used to be duplicated here as English
// arrays, which drifted out of step with SCOPES and mislabelled every scope after
// the one that went missing — keep them out of this module.

/**
 * Scopes that grant powerful or dangerous access and should be highlighted
 * prominently on consent screens.
 */
export const SENSITIVE_SCOPES = [
    'full_access',
    'manage_economy',
];

/** True if the given scope ID is considered sensitive/dangerous */
export function isSensitiveScope(scopeId) {
    return SENSITIVE_SCOPES.includes(scopeId);
}

/** Convert an array of scope IDs → the 1/0 string the API expects */
export function scopeIdsToString(scopeIds) {
    return SCOPES.map(s => scopeIds.includes(s) ? '1' : '0').join('');
}

/** Filter out any scope ID strings that don't exist in our list */
export function filterInvalidScopes(scopeIds) {
    return scopeIds.filter(s => SCOPES.includes(s));
}

/** Convert a 1/0 scope string → array of scope IDs */
export function stringToScopeIds(scopeString) {
    return SCOPES.filter((_, i) => scopeString[i] === '1');
}
