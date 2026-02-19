import { getLocalStorage, setLocalStorage, setCookie } from "./utils.js";
import axios from "axios";

// Check for login
const API_URL = "https://api.serble.net/api/v1";


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
                SerbleAntiSpam: "turnstile " + recapToken,
            },
        });

        if (response.status !== 200) {
            console.error('Error registering user', response);
            return {
                success: false,
                error: response.status
            };
        }

        return {
            success: true,
            user: response.data  // The user object
        };
    } catch (error) {
        console.error('Error registering', error);
        return {
            success: false,
            error: error.response ? error.response.status : 'Network Error'
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

export async function getPaymentPortalUrl() {
    try {
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

export async function getPublicAppInfo(appId) {
    try {
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

export async function editOAuthApp(appId, edits) {
    try {
        const response = await axios.patch(`${API_URL}/app/${appId}`, edits, {
            headers: { SerbleAuth: `User ${getAuthToken()}` }
        });
        return { success: true, app: response.data };
    } catch (error) {
        console.error('Error editing app', error);
        return { success: false, error: error?.response?.status };
    }
}