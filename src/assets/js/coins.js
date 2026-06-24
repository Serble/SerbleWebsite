// Fixed-point coin helpers.
//
// Balances are unsigned integers (ulong) stored/transmitted in a fixed-point
// format with 24 fractional bits: the raw value = realCoins * 2^24.
// Individual balances can reach ulong.MaxValue and sums can exceed JS Number
// precision (2^53), so ALL maths here uses BigInt. Never use Number()/parseInt
// on a raw coin value.

export const COIN_FRACTIONAL_BITS = 24;
export const COIN_SCALE = 1n << BigInt(COIN_FRACTIONAL_BITS); // 16777216
// 24 fractional bits resolve to ~5.96e-8, i.e. up to 8 meaningful decimals.
const FRAC_DECIMALS = 8;
const FRAC_POW = 10n ** BigInt(FRAC_DECIMALS);

// Parse a raw fixed-point value (decimal digit string / number) into a BigInt.
// Returns null when the value is not a non-negative integer.
function toRawBigInt(raw) {
    const s = String(raw ?? '').trim();
    if (!/^\d+$/.test(s)) return null;
    try { return BigInt(s); } catch { return null; }
}

// Group an integer digit string with thousands separators.
function groupDigits(digits) {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Split a raw fixed-point value into display parts.
// Returns { whole: "1,234", frac: "5" } where `frac` is the decimal digits
// after the point (no dot), trailing zeros trimmed, or '' when there is no
// fractional component. If `raw` isn't a valid integer it's returned as-is.
export function splitCoinParts(raw) {
    const big = toRawBigInt(raw);
    if (big === null) return { whole: String(raw ?? '0'), frac: '' };
    const whole = big / COIN_SCALE;
    const fracUnits = big % COIN_SCALE;
    let frac = '';
    if (fracUnits > 0n) {
        const scaled = (fracUnits * FRAC_POW) / COIN_SCALE;
        frac = scaled.toString().padStart(FRAC_DECIMALS, '0').replace(/0+$/, '');
    }
    return { whole: groupDigits(whole.toString()), frac };
}

// Full plain-text representation, e.g. "1,234.5" (no styling). Use for titles,
// aria labels, or contexts that can't render the muted-fraction markup.
export function formatCoins(raw) {
    const { whole, frac } = splitCoinParts(raw);
    return frac ? `${whole}.${frac}` : whole;
}

// Parse a user-entered decimal coin amount (e.g. "12.5") into a raw fixed-point
// integer string. Returns null when the input is not a valid non-negative
// number. The fractional part is rounded to the nearest representable unit.
export function parseCoinsToRaw(input) {
    const s = String(input ?? '').trim();
    if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
    const [wholeStr = '', fracStr = ''] = s.split('.');
    const whole = BigInt(wholeStr === '' ? '0' : wholeStr);
    let rawFrac = 0n;
    if (fracStr.length > 0) {
        const denom = 10n ** BigInt(fracStr.length);
        // Round to nearest fractional unit.
        rawFrac = (BigInt(fracStr) * COIN_SCALE + denom / 2n) / denom;
    }
    return (whole * COIN_SCALE + rawFrac).toString();
}

// True when `input` parses to a coin amount strictly greater than zero.
export function isValidCoinAmount(input) {
    const raw = parseCoinsToRaw(input);
    return raw !== null && BigInt(raw) > 0n;
}

// True when `input` parses to a valid coin amount of zero or more. Use for
// operations where zero is meaningful (e.g. setting a balance to 0).
export function isNonNegativeCoinAmount(input) {
    const raw = parseCoinsToRaw(input);
    return raw !== null && BigInt(raw) >= 0n;
}
