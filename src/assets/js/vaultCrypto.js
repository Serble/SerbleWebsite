// Exact port of window.cryptoApi from OLD_ASPNET/wwwroot/assets/js/global.js
// Uses AES-GCM with a SHA-256 hash of the password as the key.
// Format: ivHex (24 hex chars = 12 bytes) + base64(ciphertext)

export async function encrypt(plainText, password) {
    const ptUtf8 = new TextEncoder().encode(plainText);
    const pwUtf8 = new TextEncoder().encode(password);
    const pwHash = await window.crypto.subtle.digest('SHA-256', pwUtf8);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const alg = { name: 'AES-GCM', iv };
    const key = await window.crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);
    const ctBuffer = await window.crypto.subtle.encrypt(alg, key, ptUtf8);
    const ctArray = Array.from(new Uint8Array(ctBuffer));
    const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');
    const ctBase64 = window.btoa(ctStr);
    const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');
    return ivHex + ctBase64;
}

export async function decrypt(cipherText, password) {
    const iv = cipherText.slice(0, 24).match(/.{2}/g).map(byte => parseInt(byte, 16));
    const ctStr = window.atob(cipherText.slice(24));
    const ctUint8 = new Uint8Array(ctStr.match(/[\s\S]/g).map(ch => ch.charCodeAt(0)));
    const pwUtf8 = new TextEncoder().encode(password);
    const pwHash = await window.crypto.subtle.digest('SHA-256', pwUtf8);
    const alg = { name: 'AES-GCM', iv: new Uint8Array(iv) };
    const key = await window.crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);
    const plainBuffer = await window.crypto.subtle.decrypt(alg, key, ctUint8);
    return new TextDecoder().decode(plainBuffer);
}

// ── Password cache (localStorage) ──
// Stored as base64(JSON({noteId: password})) with '=' replaced by '~'

export function loadPasswords() {
    try {
        const raw = localStorage.getItem('vault-passwords') ?? '';
        if (!raw) return {};
        const json = atob(raw.replace(/~/g, '='));
        return JSON.parse(json);
    } catch {
        return {};
    }
}

export function savePasswords(passwords) {
    const json = JSON.stringify(passwords);
    const b64 = btoa(json).replace(/=/g, '~');
    localStorage.setItem('vault-passwords', b64);
}
