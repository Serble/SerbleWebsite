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
