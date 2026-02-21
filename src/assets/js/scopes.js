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
];

export const SCOPE_NAMES = [
    'Full Account Access',
    'File Host',
    'Account Information',
    'Control Of Authorized Applications',
    'Payment Information',
    'Account Management',
    'OAuth App Management',
];

export const SCOPE_DESCRIPTIONS = [
    'Allows full access to the account.',
    'Allows access the file host.',
    'Allows access to the account\'s information (Eg. Username, Email).',
    'Allows control over authorized applications.',
    'Allows access to a user\'s list of purchased products and allows them to manage their subscriptions, ' +
    'including viewing the last 4 digits of their credit card and viewing purchase history.',
    'Grants the ability to control the user\'s account, including changing their email, and username. Only you can change your password.',
    'Allows management over all of your OAuth application, this does not allow the authorization of apps.',
];

/** Convert an array of scope IDs → the 1/0 string the API expects */
export function scopeIdsToString(scopeIds) {
    return SCOPES.map(s => scopeIds.includes(s) ? '1' : '0').join('');
}

/** Filter out any scope ID strings that don't exist in our list */
export function filterInvalidScopes(scopeIds) {
    return scopeIds.filter(s => SCOPES.includes(s));
}

/** Convert an array of valid scope IDs → their display names */
export function scopeIdsToNames(scopeIds) {
    return SCOPE_NAMES.filter((_, i) => scopeIds.includes(SCOPES[i]));
}

/** Get the description for a scope display name */
export function getDescriptionFromName(name) {
    const idx = SCOPE_NAMES.indexOf(name);
    return idx >= 0 ? SCOPE_DESCRIPTIONS[idx] : '';
}

/** Convert a 1/0 scope string → array of scope IDs */
export function stringToScopeIds(scopeString) {
    return SCOPES.filter((_, i) => scopeString[i] === '1');
}
