import { getLocalStorage, setLocalStorage, setCookie } from "./utils.js";
import axios from "axios";

// Check for login
const API_URL = import.meta.env.VITE_API_URL;
const TURNSTILE_DISABLED = String(import.meta.env.VITE_DISABLE_TURNSTILE).toLowerCase() === 'true';

export function isTurnstileDisabled() {
    return TURNSTILE_DISABLED;
}

function antiSpamHeader(recapToken) {
    return TURNSTILE_DISABLED ? "bypass testing" : `turnstile ${recapToken}`;
}


export async function checkLogin() {
    const accessToken = getLocalStorage("access_token");
    if (!accessToken) return null;

    let user = await getUser(accessToken);
    if (!user) {
        setLocalStorage("access_token", null);
    }

    return user;
}

export function getAuthToken() {
    return getLocalStorage("access_token");
}

export async function isFeatureEnabled(feature) {
    try {
        const token = getAuthToken();
        const headers = token ? { SerbleAuth: `User ${token}` } : {};
        const response = await axios.get(`${API_URL}/features/${encodeURIComponent(feature)}/enabled`, { headers });
        return { success: true, enabled: response.data?.enabled === true };
    } catch (error) {
        console.error('Error checking feature flag', error);
        return { success: false, enabled: false, error: error?.response?.status };
    }
}

function optionalUserAuthConfig(extra = {}) {
    const token = getAuthToken();
    return token ? { ...extra, headers: { ...(extra.headers || {}), SerbleAuth: `User ${token}` } } : extra;
}

export async function getUser(token) {
    try {
        const response = await axios.get(`${API_URL}/account`, {
            headers: { SerbleAuth: `User ${token}` },
        });
        return response.data; // Return user data
    } catch (error) {
        console.error('Error verifying token', error);
        return null;
    }
}

export async function editUser(edits) {
    if (!Array.isArray(edits) || edits.length === 0) {
        return { success: false, error: 'no-edits' };
    }

    try {
        const response = await axios.patch(`${API_URL}/account`, edits, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, user: response.data };
    } catch (error) {
        const status = error?.response?.status;
        const responseBody = error?.response?.data;
        let flag = 'unknown';

        if (status === 400) {
            if (responseBody === 'Username is already taken') {
                flag = 'name-taken';
            } else if (responseBody === 'Invalid email') {
                flag = 'email-invalid';
            } else if (responseBody === "Field doesn't exist") {
                flag = 'bad-field';
            }
        }

        console.error('Error editing user', error);
        return { success: false, error: flag, status };
    }
}

export async function loginUser(username, password) {
    try {
        const response = await axios.get(`${API_URL}/auth`, {
            headers: { Authorization: `Basic ${btoa(username + ":" + password)}` },
        });
        setLocalStorage("access_token", response.data.token);
        return response.data; // Return user data
    } catch (error) {
        console.error('Error verifying token', error);
        return null;
    }
}

export async function registerUser(username, password, recapToken) {
    try {
        const response = await axios.post(`${API_URL}/account`, {
            username,
            password
        }, {
            headers: {
                SerbleAntiSpam: antiSpamHeader(recapToken),
            },
        });
        // axios throws on non-2xx, so reaching here always means success
        return {
            success: true,
            user: response.data
        };
    } catch (error) {
        console.error('Error registering', error);
        return {
            success: false,
            error: error.response ? error.response.status : 'network-error'
        };
    }
}

function _imageEncode(arrayBuffer) {
    let b64encoded = btoa([].reduce.call(new Uint8Array(arrayBuffer),function(p,c){return p+String.fromCharCode(c)},''))
    let mimetype="image/png"
    return "data:"+mimetype+";base64,"+b64encoded
}

export async function getTotpQrCode() {
    try {
        const response = await axios.get(`${API_URL}/account/mfa/totp/qrcode`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` },
            responseType: 'arraybuffer'
        });

        return _imageEncode(response.data);
    } catch (error) {
        console.error(error);
        return null;
    }
}

export async function submitTotpCode(mfaToken, code) {
    try {
        const response = await axios.post(`${API_URL}/account/mfa`, {
            login_token: mfaToken,
            totp_code: code
        });
        setLocalStorage("access_token", response.data.token);
        return response.data; // Return user data
    } catch (error) {
        console.error('Error logging in with totp', error);
        return null;
    }
}

export async function checkTotpCode(totpCode) {
    try {
        const response = await axios.post(`${API_URL}/account/mfa/totp`, {
            totp_code: totpCode
        }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` },
        });
        if (response.status !== 200) {
            console.error('Error enabling TOTP', response);
            return {
                success: false,
                error: response.status
            };
        }
        return {
            success: true,
            valid: response.data.valid  // Whether the TOTP code is valid
        };
    } catch (error) {
        console.error(error);
        return null;
    }
}

export function logout() {
    setCookie("access_token", "", 0);
    setLocalStorage("access_token", "");
}

// ── OAuth App helpers ──

export async function getUserApps() {
    try {
        const response = await axios.get(`${API_URL}/app`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, apps: response.data };
    } catch (error) {
        console.error('Error fetching apps', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function getOAuthApp(appId) {
    try {
        const response = await axios.get(`${API_URL}/app/${appId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error fetching app', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function createOAuthApp(name, description, redirectUri) {
    try {
        const response = await axios.post(`${API_URL}/app`, {
            name,
            description,
            redirectUri
        }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error creating app', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function deleteOAuthApp(appId) {
    try {
        await axios.delete(`${API_URL}/app/${appId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting app', error);
        return { success: false, error: error?.response?.status };
    }
}

// product: string ID, priceId: optional string
// Authenticated checkout
export async function getCheckoutUrl(product, priceId) {
    try {
        const body = priceId
            ? [{ id: product, priceid: priceId }]
            : [product];
        const response = await axios.post(`${API_URL}/payments/checkout`, body, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        const url = response.data?.url ?? response.data;
        return { success: true, url };
    } catch (error) {
        console.error('Error getting checkout URL', error);
        return { success: false, error: error?.response?.status };
    }
}

// Unauthenticated checkout
export async function getCheckoutUrlAnon(product, priceId) {
    try {
        const body = priceId
            ? [{ id: product, priceid: priceId }]
            : [product];
        const response = await axios.post(`${API_URL}/payments/checkoutanon`, body);
        const url = response.data?.url ?? response.data;
        return { success: true, url };
    } catch (error) {
        console.error('Error getting anon checkout URL', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function getPaymentPortalUrl() {    try {
        const response = await axios.get(`${API_URL}/payments/portal`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, url: response.data?.url ?? response.data };
    } catch (error) {
        const status = error?.response?.status;
        const body = error?.response?.data;
        let flag = 'unknown';
        if (status === 400 && body === 'User is not a customer.') flag = 'not-customer';
        if (status === 404) flag = 'not-found';
        console.error('Error fetching payment portal url', error);
        return { success: false, flag, error: status };
    }
}

// POST /account/authorizedApps — returns the auth code string
export async function authorizeApp(appId, scopeString) {
    try {
        const response = await axios.post(
            `${API_URL}/account/authorizedApps`,
            { appId, scopes: scopeString },
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, authCode: response.data };
    } catch (error) {
        const status = error?.response?.status;
        const flag = status === 400 ? 'bad-app' : 'unknown';
        console.error('Error authorizing app', error);
        return { success: false, flag, error: status };
    }
}

export async function getPublicAppInfo(appId) {    try {
        const response = await axios.get(`${API_URL}/app/${appId}/public`);
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error fetching public app info', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function getCatalogServices() {
    try {
        const token = getAuthToken();
        const headers = token ? { SerbleAuth: `User ${token}` } : {};
        const response = await axios.get(`${API_URL}/catalog/services`, { headers });
        return { success: true, services: response.data };
    } catch (error) {
        console.error('Error fetching catalog services', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function deauthorizeApp(appId) {
    try {
        await axios.delete(`${API_URL}/account/authorizedApps/${appId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deauthorizing app', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── OIDC consent flow ──

export async function getOidcAuthorizeSession(sessionId) {
    try {
        const response = await axios.get(
            `${API_URL}/oauth/authorize/session/${encodeURIComponent(sessionId)}`,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, session: response.data };
    } catch (error) {
        const status = error?.response?.status;
        let flag = 'unknown';
        if (status === 404) flag = 'expired';
        else if (status === 401) flag = 'unauthenticated';
        else if (status === 403) flag = 'forbidden';
        console.error('Error fetching OIDC consent session', error);
        return { success: false, flag, error: status };
    }
}

export async function approveOidcAuthorizeSession(sessionId) {
    try {
        const response = await axios.post(
            `${API_URL}/oauth/authorize/session/${encodeURIComponent(sessionId)}/approve`,
            null,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, redirect: response.data?.redirect };
    } catch (error) {
        const status = error?.response?.status;
        let flag = 'unknown';
        if (status === 404) flag = 'expired';
        else if (status === 401) flag = 'unauthenticated';
        else if (status === 403) flag = 'forbidden';
        console.error('Error approving OIDC consent', error);
        return { success: false, flag, error: status };
    }
}

export async function denyOidcAuthorizeSession(sessionId) {
    try {
        const response = await axios.post(
            `${API_URL}/oauth/authorize/session/${encodeURIComponent(sessionId)}/deny`,
            null,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, redirect: response.data?.redirect };
    } catch (error) {
        const status = error?.response?.status;
        let flag = 'unknown';
        if (status === 404) flag = 'expired';
        else if (status === 401) flag = 'unauthenticated';
        else if (status === 403) flag = 'forbidden';
        console.error('Error denying OIDC consent', error);
        return { success: false, flag, error: status };
    }
}

// ── Vault / Notes ──

export async function getNotes() {
    try {
        const response = await axios.get(`${API_URL}/vault/notes`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, notes: response.data };
    } catch (error) {
        console.error('Error fetching notes', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function getNoteContent(noteId) {
    try {
        const response = await axios.get(`${API_URL}/vault/notes/${noteId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, content: response.data };
    } catch (error) {
        console.error('Error fetching note content', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function updateNoteContent(noteId, content) {
    try {
        await axios.put(`${API_URL}/vault/notes/${noteId}`, JSON.stringify(content), {
            headers: {
                SerbleAuth: `User ${getAuthToken()}`,
                'Content-Type': 'application/json'
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error updating note', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function createNote() {
    try {
        const response = await axios.post(`${API_URL}/vault/notes`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        // API returns { note_id: "..." }
        const noteId = response.data?.note_id ?? response.data?.noteId ?? response.data?.NoteId ?? response.data;
        return { success: true, noteId };
    } catch (error) {
        console.error('Error creating note', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function deleteNote(noteId) {
    try {
        await axios.delete(`${API_URL}/vault/notes/${noteId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting note', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function editOAuthApp(appId, edits) {    try {
        const response = await axios.patch(`${API_URL}/app/${appId}`, edits, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error editing app', error);
        return { success: false, error: error?.response?.status };
    }
}

// Passkey helpers

function b64urlToBuffer(b64url) {
    if (b64url == null) throw new Error(`b64urlToBuffer received ${b64url}`);
    // Fido2NetLib may return byte[] as a plain base64/base64url string OR as an array of numbers
    if (Array.isArray(b64url) || b64url instanceof Uint8Array) {
        return new Uint8Array(b64url).buffer;
    }
    if (b64url instanceof ArrayBuffer) return b64url;
    // String: accept both standard base64 and base64url
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

function bufferToB64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function getPasskeys() {
    try {
        const response = await axios.get(`${API_URL}/auth/passkey/list`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, passkeys: response.data };
    } catch (error) {
        console.error('Error fetching passkeys', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function deletePasskey(name) {
    try {
        await axios.delete(`${API_URL}/auth/passkey/delete/${encodeURIComponent(name)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting passkey', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function renamePasskey(name, newName) {
    try {
        const params = new URLSearchParams({ newName });
        await axios.patch(`${API_URL}/auth/passkey/rename/${encodeURIComponent(name)}`, params.toString(), {
            headers: {
                SerbleAuth: `User ${getAuthToken()}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error renaming passkey', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function registerPasskey() {
    if (!window.isSecureContext || !navigator.credentials?.create) {
        return { success: false, error: 'webauthn-unavailable' };
    }
    try {
        const params = new URLSearchParams({
            attType: 'none',
            authType: 'cross-platform'
        });
        const optionsRes = await axios.post(`${API_URL}/auth/passkey/credentialoptions`, params.toString(), {
            headers: {
                SerbleAuth: `User ${getAuthToken()}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const responseData = optionsRes.data;
        // Server returns { challengeId, options: { ...webauthn options... } }
        const challengeId = responseData.challengeId;
        const options = responseData.options ?? responseData;

        const challenge       = options.challenge;
        const rp              = options.rp;
        const user            = options.user ?? {};
        const userId          = user.id;
        const userName        = user.name ?? '';
        const userDisplay     = user.displayName ?? '';
        const pubKeyParams    = options.pubKeyCredParams ?? [];
        const excludeCreds    = options.excludeCredentials ?? [];
        const authSelection   = options.authenticatorSelection;
        const attestation     = options.attestation ?? 'none';
        const timeout         = options.timeout ?? 60000;

        if (!challenge) throw new Error('Missing challenge. Keys: ' + Object.keys(options).join(', '));
        if (!userId)    throw new Error('Missing user.id. User keys: ' + Object.keys(user).join(', '));

        const publicKeyOptions = {
            challenge: b64urlToBuffer(challenge),
            rp,
            user: {
                id: b64urlToBuffer(userId),
                name: userName,
                displayName: userDisplay
            },
            pubKeyCredParams: pubKeyParams,
            timeout,
            excludeCredentials: excludeCreds.map(c => ({
                id: b64urlToBuffer(c.id ?? c.Id),
                type: c.type ?? c.Type,
                transports: c.transports ?? c.Transports
            })),
            authenticatorSelection: authSelection,
            attestation
        };

        const credential = await navigator.credentials.create({ publicKey: publicKeyOptions });

        const body = {
            id: credential.id,
            rawId: bufferToB64url(credential.rawId),
            type: credential.type,
            response: {
                attestationObject: bufferToB64url(credential.response.attestationObject),
                clientDataJSON: bufferToB64url(credential.response.clientDataJSON),
                transports: credential.response.getTransports ? credential.response.getTransports() : []
            },
            clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {}
        };

        const verifyRes = await axios.post(`${API_URL}/auth/passkey/credential?challengeId=${challengeId}`, body);

        return { success: true, credentialId: verifyRes.data.credentialId };
    } catch (error) {
        if (error.name === 'NotAllowedError') return { success: false, error: 'cancelled' };
        console.error('Error registering passkey', error);
        return { success: false, error: error?.response?.data ?? error.message };
    }
}

export async function loginWithPasskey(username = '') {
    if (!window.isSecureContext || !navigator.credentials?.get) {
        return { success: false, error: 'webauthn-unavailable' };
    }
    try {
        let optionsRes;
        if (username.trim()) {
            const params = new URLSearchParams({ username: username.trim() });
            optionsRes = await axios.post(`${API_URL}/auth/passkey/assertionOptions`, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
        } else {
            optionsRes = await axios.get(`${API_URL}/auth/passkey/assertionOptions`);
        }
        const assertionResponseData = optionsRes.data;
        // Unwrap if server returns { challengeId, options: {...} }
        const assertionChallengeId = assertionResponseData.challengeId;
        const options = assertionResponseData.options ?? assertionResponseData;

        const challenge        = options.challenge;
        const rpId             = options.rpId;
        const allowCreds       = options.allowCredentials ?? [];
        const userVerification = options.userVerification ?? 'preferred';
        const timeout          = options.timeout ?? 60000;

        if (!challenge) throw new Error('Missing challenge. Keys: ' + Object.keys(options).join(', '));

        const publicKeyOptions = {
            challenge: b64urlToBuffer(challenge),
            rpId,
            allowCredentials: allowCreds.map(c => ({
                id: b64urlToBuffer(c.id ?? c.Id),
                type: c.type ?? c.Type,
                transports: c.transports ?? c.Transports
            })),
            userVerification,
            timeout
        };

        const credential = await navigator.credentials.get({ publicKey: publicKeyOptions });

        const body = {
            id: credential.id,
            rawId: bufferToB64url(credential.rawId),
            type: credential.type,
            response: {
                authenticatorData: bufferToB64url(credential.response.authenticatorData),
                clientDataJSON: bufferToB64url(credential.response.clientDataJSON),
                signature: bufferToB64url(credential.response.signature),
                userHandle: credential.response.userHandle
                    ? bufferToB64url(credential.response.userHandle)
                    : null
            }
        };

        const verifyRes = await axios.post(`${API_URL}/auth/passkey/assertion?challengeId=${assertionChallengeId}`, body);

        setLocalStorage('access_token', verifyRes.data.token);
        return { success: true };
    } catch (error) {
        if (error.name === 'NotAllowedError') return { success: false, error: 'cancelled' };
        console.error('Error logging in with passkey', error);
        return { success: false, error: error?.response?.data ?? error.message };
    }
}
// ── Admin helpers ──

export async function adminGetUserStats() {
    try {
        const response = await axios.get(`${API_URL}/admin/users/stats`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, stats: response.data };
    } catch (error) {
        console.error('Error fetching user stats', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSearchUsers(query, limit = 25) {
    try {
        const response = await axios.get(`${API_URL}/admin/users/search`, {
            params: { query, limit },
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, users: response.data };
    } catch (error) {
        console.error('Error searching users', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetUser(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/users/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, user: response.data };
    } catch (error) {
        console.error('Error fetching admin user', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeleteUser(id) {
    try {
        await axios.delete(`${API_URL}/admin/users/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting user', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminLoginAsUser(id) {
    try {
        const response = await axios.post(`${API_URL}/admin/users/${id}/login-as`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error logging in as user', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDisableUser(id) {
    try {
        await axios.post(`${API_URL}/admin/users/${id}/disable`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error disabling user', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminEnableUser(id) {
    try {
        await axios.post(`${API_URL}/admin/users/${id}/enable`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error enabling user', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminChangePassword(id, newPassword) {
    try {
        await axios.post(`${API_URL}/admin/users/${id}/password`, { password: newPassword }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error changing password', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDisable2fa(id) {
    try {
        await axios.post(`${API_URL}/admin/users/${id}/disable-2fa`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error disabling 2FA', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetPasskeys(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/users/${id}/passkeys`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, passkeys: response.data };
    } catch (error) {
        console.error('Error fetching user passkeys', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeletePasskey(id, name) {
    try {
        await axios.delete(`${API_URL}/admin/users/${id}/passkeys/${encodeURIComponent(name)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting passkey', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAdmin(id, isAdmin) {
    try {
        await axios.post(`${API_URL}/admin/users/${id}/admin`, { admin: isAdmin }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error setting admin', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── Admin App helpers ──

export async function adminGetAppStats() {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/stats`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, stats: response.data };
    } catch (error) {
        console.error('Error fetching app stats', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSearchApps(query, limit = 25) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/search`, {
            params: { query, limit },
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, apps: response.data };
    } catch (error) {
        console.error('Error searching apps', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetApp(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error fetching app', error);
        return { success: false, error: error?.response?.status };
    }
}

// edits: { name?, description?, redirectUri?, ownerId? }
export async function adminEditApp(id, edits) {
    try {
        const response = await axios.patch(`${API_URL}/admin/apps/${id}`, edits, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error editing app', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeleteApp(id) {
    try {
        await axios.delete(`${API_URL}/admin/apps/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting app', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetAppsByUser(userId) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/by-user/${userId}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, apps: response.data };
    } catch (error) {
        console.error('Error fetching user apps', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminCycleAppSecret(id) {
    try {
        const response = await axios.post(`${API_URL}/admin/apps/${id}/cycle-secret`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, data: response.data };
    } catch (error) {
        console.error('Error cycling secret', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAppOfficial(id, isOfficial) {
    try {
        const response = await axios.put(`${API_URL}/admin/apps/${id}/official`, { isOfficial }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error setting app official flag', error);
        return { success: false, error: error?.response?.status };
    }
}

function parseAppTaxTargetResponse(rawText) {
    let obj = {};
    try { obj = JSON.parse(rawText); } catch { /* ignore */ }
    const m = /"targetBalance"\s*:\s*(?:"(\d+)"|(\d+))/.exec(rawText || '');
    if (m) obj.targetBalance = m[1] ?? m[2];
    return obj;
}

export async function adminGetAppTaxTarget(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/${encodeURIComponent(id)}/tax-target-balance`, coinGetConfig());
        return { success: true, target: parseAppTaxTargetResponse(response.data) };
    } catch (error) {
        console.error('Error fetching app tax target', error);
        const raw = error?.response?.data;
        const message = typeof raw === 'string' ? raw.trim() : '';
        return { success: false, error: error?.response?.status, message };
    }
}

export async function adminSetAppTaxTarget(id, targetBalance) {
    try {
        const response = await axios.put(
            `${API_URL}/admin/apps/${encodeURIComponent(id)}/tax-target-balance`,
            intBody('targetBalance', targetBalance),
            coinReqConfig()
        );
        return { success: true, target: parseAppTaxTargetResponse(response.data) };
    } catch (error) {
        console.error('Error setting app tax target', error);
        const raw = error?.response?.data;
        const message = typeof raw === 'string' ? raw.trim() : '';
        return { success: false, error: error?.response?.status, message };
    }
}

// ── Admin Product helpers ──

export async function adminListProducts() {
    try {
        const response = await axios.get(`${API_URL}/admin/products`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, products: response.data };
    } catch (error) {
        console.error('Error fetching products', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetProduct(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/products/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, product: response.data };
    } catch (error) {
        console.error('Error fetching product', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminCreateProduct(product) {
    try {
        const response = await axios.post(`${API_URL}/admin/products`, product, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, product: response.data };
    } catch (error) {
        console.error('Error creating product', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminUpdateProduct(id, product) {
    try {
        const response = await axios.put(`${API_URL}/admin/products/${id}`, product, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, product: response.data };
    } catch (error) {
        console.error('Error updating product', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeleteProduct(id) {
    try {
        await axios.delete(`${API_URL}/admin/products/${id}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting product', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── Admin Service Catalog helpers ──

export async function adminListServices() {
    try {
        const response = await axios.get(`${API_URL}/admin/service-catalog`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, services: response.data };
    } catch (error) {
        console.error('Error fetching services', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetService(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/service-catalog/${encodeURIComponent(id)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, service: response.data };
    } catch (error) {
        console.error('Error fetching service', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminCreateService(service) {
    try {
        const response = await axios.post(`${API_URL}/admin/service-catalog`, service, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, service: response.data };
    } catch (error) {
        console.error('Error creating service', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminUpdateService(id, service) {
    try {
        const response = await axios.put(`${API_URL}/admin/service-catalog/${encodeURIComponent(id)}`, service, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, service: response.data };
    } catch (error) {
        console.error('Error updating service', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeleteService(id) {
    try {
        await axios.delete(`${API_URL}/admin/service-catalog/${encodeURIComponent(id)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting service', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── Admin Groups (OIDC) ──

export async function adminListGroups() {
    try {
        const response = await axios.get(`${API_URL}/admin/groups`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, groups: response.data };
    } catch (error) {
        console.error('Error listing groups', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetGroup(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/groups/${encodeURIComponent(id)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, group: response.data };
    } catch (error) {
        console.error('Error fetching group', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminCreateGroup(name, description) {
    try {
        const response = await axios.post(`${API_URL}/admin/groups`, { name, description }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, group: response.data };
    } catch (error) {
        console.error('Error creating group', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminUpdateGroup(id, edits) {
    try {
        const response = await axios.patch(`${API_URL}/admin/groups/${encodeURIComponent(id)}`, edits, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, group: response.data };
    } catch (error) {
        console.error('Error updating group', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminDeleteGroup(id) {
    try {
        await axios.delete(`${API_URL}/admin/groups/${encodeURIComponent(id)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting group', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminListGroupMembers(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/groups/${encodeURIComponent(id)}/members`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, members: response.data };
    } catch (error) {
        console.error('Error listing group members', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminAddGroupMember(groupId, userId) {
    try {
        await axios.put(
            `${API_URL}/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
            null,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error adding group member', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminRemoveGroupMember(groupId, userId) {
    try {
        await axios.delete(
            `${API_URL}/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error removing group member', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetGroupsByUser(userId) {
    try {
        const response = await axios.get(
            `${API_URL}/admin/groups/by-user/${encodeURIComponent(userId)}`,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, groups: response.data };
    } catch (error) {
        console.error('Error fetching groups for user', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── Admin App OIDC config & access policy ──

export async function adminGetAppClient(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/${encodeURIComponent(id)}/client`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, client: response.data };
    } catch (error) {
        console.error('Error fetching app OIDC client config', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminUpdateAppClient(id, edits) {
    try {
        const response = await axios.put(
            `${API_URL}/admin/apps/${encodeURIComponent(id)}/client`,
            edits,
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true, client: response.data };
    } catch (error) {
        console.error('Error updating app OIDC client config', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminGetAppAccess(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/${encodeURIComponent(id)}/access`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, access: response.data };
    } catch (error) {
        console.error('Error fetching app access policy', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAppAccessPolicy(id, accessPolicy, requiredPermLevel) {
    try {
        await axios.put(
            `${API_URL}/admin/apps/${encodeURIComponent(id)}/access/policy`,
            { accessPolicy, requiredPermLevel },
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error setting access policy', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAppAccessGroups(id, allowedGroupIds, deniedGroupIds) {
    try {
        await axios.put(
            `${API_URL}/admin/apps/${encodeURIComponent(id)}/access/groups`,
            { allowedGroupIds, deniedGroupIds },
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error setting access groups', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAppClaimMappings(id, mappings) {
    try {
        await axios.put(
            `${API_URL}/admin/apps/${encodeURIComponent(id)}/access/claim-mappings`,
            { mappings },
            { headers: { SerbleAuth: `User ${getAuthToken()}` } }
        );
        return { success: true };
    } catch (error) {
        console.error('Error setting claim mappings', error);
        return { success: false, error: error?.response?.status };
    }
}

// ── Economy / Balances & App API keys ──
//
// Coin amounts are unsigned 64-bit integers that can exceed JS Number precision
// (2^53). To avoid precision loss we (a) emit request bodies with the amount as
// an unquoted JSON integer built from a digit string, and (b) read the `coins`
// field back out of the raw response text as a string.

function coinReqConfig() {
    return {
        headers: { SerbleAuth: `User ${getAuthToken()}`, 'Content-Type': 'application/json' },
        transformResponse: [(d) => d],
    };
}

function coinGetConfig() {
    return {
        headers: { SerbleAuth: `User ${getAuthToken()}` },
        transformResponse: [(d) => d],
    };
}

// Build a JSON body with `key` set to an unquoted integer, preserving full
// precision. Non-digit input falls back to 0.
function intBody(key, value) {
    const digits = String(value ?? '').trim();
    const safe = /^\d+$/.test(digits) ? digits : '0';
    return `{"${key}":${safe}}`;
}

// Parse a balance response, keeping `coins` as a precision-safe string.
function parseCoinResponse(rawText) {
    let obj = {};
    try { obj = JSON.parse(rawText); } catch { /* ignore */ }
    const m = /"coins"\s*:\s*(\d+)/.exec(rawText || '');
    if (m) obj.coins = m[1];
    return obj;
}

// Generic balance of the current principal (user) — GET/POST /balance
export async function getBalance() {
    try {
        const response = await axios.get(`${API_URL}/balance`, coinGetConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error fetching balance', error);
        return { success: false, error: error?.response?.status };
    }
}

// Build a transfer body: amount as an unquoted integer (precision-safe),
// recipient and description as JSON-escaped strings.
function transferBody(recipient, amount, description) {
    const digits = String(amount ?? '').trim();
    const safe = /^\d+$/.test(digits) ? digits : '0';
    const r = JSON.stringify(String(recipient ?? ''));
    const d = JSON.stringify(String(description ?? ''));
    return `{"recipient":${r},"amount":${safe},"description":${d}}`;
}

// Keep nested balance `coins` and the transaction `amount` as precision-safe strings.
function parseTransferResponse(rawText) {
    let obj = {};
    try { obj = JSON.parse(rawText); } catch { /* ignore */ }
    const fm = /"fromBalance"\s*:\s*\{[^}]*?"coins"\s*:\s*(\d+)/.exec(rawText || '');
    if (fm && obj.fromBalance) obj.fromBalance.coins = fm[1];
    const tm = /"toBalance"\s*:\s*\{[^}]*?"coins"\s*:\s*(\d+)/.exec(rawText || '');
    if (tm && obj.toBalance) obj.toBalance.coins = tm[1];
    const am = /"transaction"\s*:\s*\{[^}]*?"amount"\s*:\s*(\d+)/.exec(rawText || '');
    if (am && obj.transaction) obj.transaction.amount = am[1];
    return obj;
}

// Send coins to another user — POST /balance/transfer
export async function transferCoins(recipient, amount, description) {
    try {
        const response = await axios.post(`${API_URL}/balance/transfer`, transferBody(recipient, amount, description), coinReqConfig());
        return { success: true, data: parseTransferResponse(response.data) };
    } catch (error) {
        console.error('Error transferring coins', error);
        const raw = error?.response?.data;
        const message = typeof raw === 'string' ? raw.trim() : '';
        return { success: false, error: error?.response?.status, message };
    }
}

// Keep each transaction's `amount` as a precision-safe string.
function parseTransactionsResponse(rawText) {
    let arr = [];
    try { arr = JSON.parse(rawText); } catch { /* ignore */ }
    if (!Array.isArray(arr)) return [];
    const amounts = [...(rawText || '').matchAll(/"amount"\s*:\s*(\d+)/g)].map(m => m[1]);
    arr.forEach((t, i) => { if (amounts[i] !== undefined) t.amount = amounts[i]; });
    return arr;
}

// Transaction history for the current user — GET /balance/transactions
// Supports limit/offset pagination. Returns up to `limit` items starting at `offset`.
export async function getTransactions(limit = 50, offset = 0) {
    try {
        const safeLimit = /^\d+$/.test(String(limit)) ? limit : 50;
        const safeOffset = /^\d+$/.test(String(offset)) ? offset : 0;
        const response = await axios.get(
            `${API_URL}/balance/transactions?limit=${encodeURIComponent(safeLimit)}&offset=${encodeURIComponent(safeOffset)}`,
            coinGetConfig()
        );
        return { success: true, transactions: parseTransactionsResponse(response.data) };
    } catch (error) {
        console.error('Error fetching transactions', error);
        return { success: false, error: error?.response?.status };
    }
}

// App API keys (owner) — /app/{appid}/keys
export async function getAppKeys(appId) {
    try {
        const response = await axios.get(`${API_URL}/app/${encodeURIComponent(appId)}/keys`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, keys: response.data };
    } catch (error) {
        console.error('Error fetching app keys', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function createAppKey(appId, name) {
    try {
        const response = await axios.post(`${API_URL}/app/${encodeURIComponent(appId)}/keys`, { name }, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, key: response.data };
    } catch (error) {
        console.error('Error creating app key', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function deleteAppKey(appId, keyId) {
    try {
        await axios.delete(`${API_URL}/app/${encodeURIComponent(appId)}/keys/${encodeURIComponent(keyId)}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true };
    } catch (error) {
        console.error('Error deleting app key', error);
        return { success: false, error: error?.response?.status };
    }
}

// Owner-managed app balance — /app/{appid}/balance
export async function getAppBalance(appId) {
    try {
        const response = await axios.get(`${API_URL}/app/${encodeURIComponent(appId)}/balance`, coinGetConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error fetching app balance', error);
        return { success: false, error: error?.response?.status };
    }
}

// Admin: user coins — /admin/users/{id}/coins
export async function adminGetUserCoins(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/users/${encodeURIComponent(id)}/coins`, coinGetConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error fetching user coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetUserCoins(id, balance) {
    try {
        const response = await axios.post(`${API_URL}/admin/users/${encodeURIComponent(id)}/coins/set`, intBody('balance', balance), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error setting user coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminAddUserCoins(id, amount) {
    try {
        const response = await axios.post(`${API_URL}/admin/users/${encodeURIComponent(id)}/coins/add`, intBody('amount', amount), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error adding user coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminRemoveUserCoins(id, amount) {
    try {
        const response = await axios.post(`${API_URL}/admin/users/${encodeURIComponent(id)}/coins/remove`, intBody('amount', amount), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error removing user coins', error);
        return { success: false, error: error?.response?.status };
    }
}

// Admin: app coins — /admin/apps/{id}/coins
export async function adminGetAppCoins(id) {
    try {
        const response = await axios.get(`${API_URL}/admin/apps/${encodeURIComponent(id)}/coins`, coinGetConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error fetching app coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminSetAppCoins(id, balance) {
    try {
        const response = await axios.post(`${API_URL}/admin/apps/${encodeURIComponent(id)}/coins/set`, intBody('balance', balance), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error setting app coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminAddAppCoins(id, amount) {
    try {
        const response = await axios.post(`${API_URL}/admin/apps/${encodeURIComponent(id)}/coins/add`, intBody('amount', amount), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error adding app coins', error);
        return { success: false, error: error?.response?.status };
    }
}

export async function adminRemoveAppCoins(id, amount) {
    try {
        const response = await axios.post(`${API_URL}/admin/apps/${encodeURIComponent(id)}/coins/remove`, intBody('amount', amount), coinReqConfig());
        return { success: true, balance: parseCoinResponse(response.data) };
    } catch (error) {
        console.error('Error removing app coins', error);
        return { success: false, error: error?.response?.status };
    }
}

// Admin: transaction audit log — GET /admin/transactions
export async function adminGetTransactions({ user, from, to, limit = 50, offset = 0 } = {}) {
    try {
        const params = new URLSearchParams();
        if (user) params.set('user', user);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        params.set('limit', limit);
        params.set('offset', offset);
        const response = await axios.get(`${API_URL}/admin/transactions?${params.toString()}`, coinGetConfig());
        return { success: true, transactions: parseTransactionsResponse(response.data) };
    } catch (error) {
        console.error('Error fetching admin transactions', error);
        return { success: false, error: error?.response?.status };
    }
}

// Admin: total economy value in circulation — GET /admin/economy/total
// Coin totals come back as decimal strings (they can exceed ulong/Number),
// so leave them as strings and parse with BigInt at the display layer.
export async function adminGetEconomyTotal() {
    try {
        const response = await axios.get(`${API_URL}/admin/economy/total`, coinGetConfig());
        let data = {};
        try { data = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, total: data };
    } catch (error) {
        console.error('Error fetching economy total', error);
        return { success: false, error: error?.response?.status };
    }
}

function parseTaxPreviewResponse(rawText) {
    let obj = {};
    try { obj = JSON.parse(rawText); } catch { /* ignore */ }
    const text = rawText || '';
    for (const key of ['rate', 'fixedRate', 'maxDynamicRate', 'collected', 'distributed', 'bossStartingBalance', 'bossEndingBalance']) {
        const m = new RegExp(`"${key}"\\s*:\\s*(?:"([\\d.]+)"|(\\d+))`).exec(text);
        if (m) obj[key] = m[1] ?? m[2];
    }
    return obj;
}

export async function adminPreviewTax() {
    try {
        const response = await axios.get(`${API_URL}/admin/economy/tax/preview`, coinGetConfig());
        return { success: true, preview: parseTaxPreviewResponse(response.data) };
    } catch (error) {
        console.error('Error fetching tax preview', error);
        return { success: false, error: error?.response?.status, message: typeof error?.response?.data === 'string' ? error.response.data : null };
    }
}

export async function adminRunTaxNow() {
    try {
        const response = await axios.post(`${API_URL}/admin/economy/tax/run-now`, {}, coinGetConfig());
        return { success: true, result: parseTaxPreviewResponse(response.data) };
    } catch (error) {
        console.error('Error running tax now', error);
        return { success: false, error: error?.response?.status, message: typeof error?.response?.data === 'string' ? error.response.data : null };
    }
}

// Server-wide config (admin) — list every known setting with its current value.
export async function adminGetConfig() {
    try {
        const response = await axios.get(`${API_URL}/admin/config`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, settings: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
        console.error('Error fetching server config', error);
        return { success: false, error: error?.response?.status, settings: [] };
    }
}

// Update one server-wide setting. `value` is always sent as a string.
export async function adminSetConfig(key, value) {
    try {
        const response = await axios.put(`${API_URL}/admin/config/${encodeURIComponent(key)}`,
            { value: String(value) }, {
                headers: { SerbleAuth: `User ${getAuthToken()}` }
            });
        return { success: true, setting: response.data };
    } catch (error) {
        console.error('Error updating server config', error);
        const status = error?.response?.status;
        const message = typeof error?.response?.data === 'string' ? error.response.data : null;
        return { success: false, error: status, message };
    }
}

// ── Transaction consent flow ──

// Parse a proposal response, keeping the fixed-point coin fields (`amount`,
// `offeredCoins`) as precision-safe strings — they're ulong raw values that can
// exceed Number.MAX_SAFE_INTEGER, so we pull them straight from the raw text
// instead of trusting JSON.parse's lossy number handling.
function parseProposalResponse(rawText) {
    let obj = {};
    try { obj = JSON.parse(rawText); } catch { /* ignore */ }
    const text = rawText || '';
    const amt = /"amount"\s*:\s*(\d+)/.exec(text);
    if (amt) obj.amount = amt[1];
    const off = /"offeredCoins"\s*:\s*(\d+)/.exec(text);
    if (off) obj.offeredCoins = off[1];
    // Normalise item arrays so the UI can rely on them always being arrays.
    if (!Array.isArray(obj.offeredItems)) obj.offeredItems = [];
    if (!Array.isArray(obj.requestedItems)) obj.requestedItems = [];
    return obj;
}

// Fetch the proposal info to render the consent screen — GET /transactions/consent/{id}
export async function getTransactionProposal(proposalId) {
    try {
        const response = await axios.get(
            `${API_URL}/transactions/consent/${encodeURIComponent(proposalId)}`,
            coinGetConfig()
        );
        return { success: true, proposal: parseProposalResponse(response.data) };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching transaction proposal', error);
        return { success: false, flag: status === 404 ? 'not-found' : 'unknown', error: status };
    }
}

// User approves the proposal — POST /transactions/consent/{id}/approve
export async function approveTransactionProposal(proposalId) {
    try {
        const response = await axios.post(
            `${API_URL}/transactions/consent/${encodeURIComponent(proposalId)}/approve`,
            null,
            coinGetConfig()
        );
        let data = {};
        try { data = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, result: data, redirect: data?.redirect ?? null };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error approving transaction proposal', error);
        return { success: false, flag: status === 404 ? 'not-found' : status === 400 ? 'not-pending' : 'unknown', error: status };
    }
}

// User denies the proposal — POST /transactions/consent/{id}/deny
export async function denyTransactionProposal(proposalId) {
    try {
        const response = await axios.post(
            `${API_URL}/transactions/consent/${encodeURIComponent(proposalId)}/deny`,
            null,
            coinGetConfig()
        );
        let data = {};
        try { data = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, result: data, redirect: data?.redirect ?? null };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error denying transaction proposal', error);
        return { success: false, flag: status === 404 ? 'not-found' : status === 400 ? 'not-pending' : 'unknown', error: status };
    }
}

// ── Inventory ──

// List the logged-in user's items (newest first) — GET /inventory
export async function getInventory(limit = 50, offset = 0, creatorApp = null, search = null) {
    try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (creatorApp) params.set('creatorApp', String(creatorApp));
        if (search) params.set('search', String(search));
        const response = await axios.get(`${API_URL}/inventory?${params.toString()}`, coinGetConfig());
        let items = [];
        try { items = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, items: Array.isArray(items) ? items : [] };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching inventory', error);
        return { success: false, flag: 'unknown', error: status };
    }
}

// ---- User-to-user trades — /trades ----------------------------------------------------
// Coin amounts (offeredCoins/requestedCoins) are raw fixed-point ulongs. We build the request
// body by hand so the raw integers go over the wire without JS-number precision loss.
function userTradeBody(toUser, offeredCoins, requestedCoins, offeredItemIds, requestedItemIds, description) {
    const oc = /^\d+$/.test(String(offeredCoins ?? '')) ? String(offeredCoins) : '0';
    const rc = /^\d+$/.test(String(requestedCoins ?? '')) ? String(requestedCoins) : '0';
    return `{"toUser":${JSON.stringify(String(toUser ?? ''))},`
        + `"offeredCoins":${oc},"requestedCoins":${rc},`
        + `"offeredItemIds":${JSON.stringify(offeredItemIds || [])},`
        + `"requestedItemIds":${JSON.stringify(requestedItemIds || [])},`
        + `"description":${JSON.stringify(String(description ?? ''))}}`;
}

function tradeErrorMessage(error) {
    const raw = error?.response?.data;
    return typeof raw === 'string' ? raw.trim() : '';
}

// Propose a trade to another user. Returns { success, trade } or { success:false, message }.
export async function createUserTrade(toUser, offeredCoins, requestedCoins, offeredItemIds, requestedItemIds, description) {
    try {
        const body = userTradeBody(toUser, offeredCoins, requestedCoins, offeredItemIds, requestedItemIds, description);
        const response = await axios.post(`${API_URL}/trades`, body, coinReqConfig());
        let trade = {};
        try { trade = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, trade };
    } catch (error) {
        console.error('Error creating trade', error);
        return { success: false, error: error?.response?.status, message: tradeErrorMessage(error) };
    }
}

// List the user's trades. role = 'incoming' | 'outgoing' | 'all'; status optional.
export async function getUserTrades(role = 'all', status = null, limit = 100, offset = 0) {
    try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (role && role !== 'all') params.set('role', role);
        if (status) params.set('status', status);
        const response = await axios.get(`${API_URL}/trades?${params.toString()}`, {
            headers: { SerbleAuth: `User ${getAuthToken()}` },
        });
        const trades = Array.isArray(response.data) ? response.data : [];
        return { success: true, trades };
    } catch (error) {
        console.error('Error fetching trades', error);
        return { success: false, error: error?.response?.status, trades: [] };
    }
}

async function tradeAction(id, action) {
    try {
        const response = await axios.post(`${API_URL}/trades/${encodeURIComponent(id)}/${action}`, null, {
            headers: { SerbleAuth: `User ${getAuthToken()}` },
        });
        return { success: true, trade: response.data };
    } catch (error) {
        console.error(`Error on trade ${action}`, error);
        return { success: false, error: error?.response?.status, message: tradeErrorMessage(error) };
    }
}

export const approveUserTrade = (id) => tradeAction(id, 'approve');
export const denyUserTrade = (id) => tradeAction(id, 'deny');
export const cancelUserTrade = (id) => tradeAction(id, 'cancel');

// Resolve many creator-app ids to their public info in one request — POST /app/public/batch.
// Returns { success, apps } where `apps` is a map keyed by app id with normalised fields
// { id, name, description, isOfficial, readableId }. Used by the inventory view so every item's
// creating app can be shown without an N+1 of /app/{id}/public calls.
export async function getPublicAppsBatch(ids) {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    if (unique.length === 0) return { success: true, apps: {} };
    try {
        const response = await axios.post(`${API_URL}/app/public/batch`, { ids: unique });
        let data = response.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch { data = []; }
        }
        const apps = {};
        for (const a of Array.isArray(data) ? data : []) {
            const id = a.id ?? a.Id;
            if (!id) continue;
            apps[id] = {
                id,
                name: a.name ?? a.Name ?? '',
                description: a.description ?? a.Description ?? '',
                isOfficial: a.isOfficial ?? a.IsOfficial ?? false,
                readableId: a.readableId ?? a.ReadableId ?? '',
            };
        }
        return { success: true, apps };
    } catch (error) {
        console.error('Error fetching public app info batch', error);
        return { success: false, error: error?.response?.status, apps: {} };
    }
}

// Public item profile (anyone) — GET /items/{id}/public
export async function getPublicItem(id) {
    try {
        const response = await axios.get(`${API_URL}/items/${encodeURIComponent(id)}/public`, optionalUserAuthConfig());
        return { success: true, item: response.data };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching public item', error);
        return { success: false, flag: status === 404 ? 'not-found' : 'unknown', error: status };
    }
}

// Public ownership history (anyone), paginated — GET /items/{id}/history.
// Returns { success, total, limit, offset, entries } where each entry is
// { id, kind, fromOwnerType?, fromOwnerId?, toOwnerType, toOwnerId, proposalId?, dateCreated }.
export async function getItemHistory(id, limit = 25, offset = 0) {
    try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        const response = await axios.get(`${API_URL}/items/${encodeURIComponent(id)}/history?${params.toString()}`, optionalUserAuthConfig());
        const d = response.data || {};
        return {
            success: true,
            total: d.total ?? 0,
            limit: d.limit ?? limit,
            offset: d.offset ?? offset,
            entries: Array.isArray(d.entries) ? d.entries : [],
        };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching item history', error);
        return { success: false, flag: status === 404 ? 'not-found' : 'unknown', error: status, entries: [] };
    }
}

// A single owned item — GET /inventory/{id}
export async function getInventoryItem(id) {
    try {
        const response = await axios.get(`${API_URL}/inventory/${encodeURIComponent(id)}`, coinGetConfig());
        let item = {};
        try { item = JSON.parse(response.data); } catch { /* ignore */ }
        return { success: true, item };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching inventory item', error);
        return { success: false, flag: status === 404 ? 'not-found' : 'unknown', error: status };
    }
}

// Resolve many user ids to their public info (id, username, readableId) in one request — used to
// name user owners in an item's ownership history without an N+1. Returns { success, users } where
// `users` is a map keyed by user id.
export async function getPublicUsersBatch(ids) {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    if (unique.length === 0) return { success: true, users: {} };
    try {
        const response = await axios.post(`${API_URL}/user/public/batch`, { ids: unique });
        const arr = Array.isArray(response.data) ? response.data : [];
        const users = {};
        for (const u of arr) {
            const id = u.id ?? u.Id;
            if (!id) continue;
            users[id] = { id, username: u.username ?? u.Username ?? '', readableId: u.readableId ?? u.ReadableId ?? '' };
        }
        return { success: true, users };
    } catch (error) {
        console.error('Error fetching public users batch', error);
        return { success: false, error: error?.response?.status, users: {} };
    }
}

// List another user's items (public), by user id or username. Paginated + searchable. Powers the
// trade UI so a proposer can pick the items they want from the other user's inventory.
export async function getUserItems(user, limit = 50, offset = 0, search = null) {
    try {
        const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
        if (search) params.set('search', String(search));
        const response = await axios.get(`${API_URL}/user/${encodeURIComponent(user)}/items?${params.toString()}`, optionalUserAuthConfig());
        const items = Array.isArray(response.data) ? response.data : [];
        return { success: true, items };
    } catch (error) {
        const status = error?.response?.status;
        console.error('Error fetching user items', error);
        return { success: false, flag: status === 404 ? 'not-found' : 'unknown', error: status, items: [] };
    }
}
