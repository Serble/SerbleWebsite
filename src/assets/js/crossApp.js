// Cross-app sign-in: a target app lets other apps (callers) sign a user in to it from server to
// server. The target's owner picks who may do that (the policy) and which Serble permissions a
// sign-in grants (the scopes). The target redeems the code at whichever token endpoint it already
// uses, so there is nothing to choose about the flow. These tables are shared by the owner's
// settings, the admin dashboard and the consent page so the three can't drift apart.

import { SCOPES, isSensitiveScope } from './scopes.js';

// `value` is the int the API reports, `field` the string the owner PATCH takes, `label` the
// locale key. Kept in the API's enum order.
export const CROSS_APP_POLICIES = [
    { value: 0, field: 'disabled', label: 'cross-app-policy-disabled', hint: 'cross-app-policy-disabled-hint' },
    { value: 1, field: 'official_only', label: 'cross-app-policy-official-only', hint: 'cross-app-policy-official-only-hint' },
    { value: 2, field: 'any_with_consent', label: 'cross-app-policy-any', hint: 'cross-app-policy-any-hint' },
];

/** What the API grants when the owner hasn't chosen any scopes. */
export const DEFAULT_CROSS_APP_SCOPES = ['user_info'];

/** The API refuses an allowed-callers list longer than this. */
export const MAX_CROSS_APP_CALLERS = 50;

/** Every scope a cross-app sign-in can grant, in display order: the Serble permissions. */
export const CROSS_APP_SCOPES = SCOPES;

/** Splits a space-separated scope string into ids. null and "" both mean "the default". */
export function parseScopeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    return String(value ?? '').split(/\s+/).filter(Boolean);
}

/** Joins scope ids in display order, so the same set always gives the same string. */
export function joinScopes(ids) {
    const known = CROSS_APP_SCOPES.filter(s => ids.includes(s));
    const unknown = ids.filter(s => !CROSS_APP_SCOPES.includes(s));
    return [...known, ...unknown].join(' ');
}

/** Locale keys for a scope. `nameKey` is null for a scope this build doesn't know. */
export function crossAppScopeInfo(id) {
    const known = CROSS_APP_SCOPES.includes(id);
    return {
        id,
        nameKey: known ? `scope-${id}` : null,
        descKey: known ? `scope-${id}-desc` : null,
        sensitive: isSensitiveScope(id),
    };
}

/** Splits pasted app ids on whitespace, commas or semicolons. */
export function parseAppIdList(value) {
    return String(value ?? '').split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
}
