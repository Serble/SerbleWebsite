export const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'tok', label: 'toki pona' },
  { value: 'tes', label: 'Gibberish' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'bin', label: 'Binary' },
  { value: 'po', label: 'Polish' },
  { value: 'en_pi', label: 'Pirate English' },
  { value: 'en_au', label: 'English (Australia)' },
  { value: 'en_us', label: 'English (US)' },
  { value: 'en_uk', label: 'English (UK)' },
  { value: 'afr', label: 'Afrikaans' },
  { value: 'lol', label: 'LOLCat' }
];

// i18n key -> server code (must match ^[a-z]{3}(-[A-Z]{2})?$)
const i18nToServer = {
  'en':    'eng',
  'tok':   'tok',
  'tes':   'tes',
  'de':    'deu',
  'es':    'spa',
  'bin':   'bin',
  'po':    'pol',
  'en_pi': 'eng-PI',
  'en_au': 'eng-AU',
  'en_us': 'eng-US',
  'en_uk': 'eng-EN',
  'afr':   'afr',
  'lol':   'lol'
};

// server code (lowercased) -> i18n key
const serverToI18n = {};
for (const [i18nKey, serverCode] of Object.entries(i18nToServer)) {
  serverToI18n[serverCode.toLowerCase()] = i18nKey;
}

const supportedLocales = new Set(languageOptions.map(option => option.value));

export function normalizeLocale(input) {
  if (!input) {
    return '';
  }

  const raw = String(input).trim().toLowerCase();

  // Check server code map first (e.g. "eng-au" -> "en_au")
  if (serverToI18n[raw]) {
    return serverToI18n[raw];
  }

  // Normalize separators and try again
  const normalized = raw.replace(/_/g, '-');
  if (serverToI18n[normalized]) {
    return serverToI18n[normalized];
  }

  // Fall back to replacing dashes with underscores (direct i18n key)
  return normalized.replace(/-/g, '_');
}

export function getSupportedLocale(input) {
  const normalized = normalizeLocale(input);
  return supportedLocales.has(normalized) ? normalized : '';
}

/**
 * Convert an i18n locale key to the server language code.
 * e.g. 'en_au' -> 'eng-AU', 'de' -> 'deu'
 */
export function toServerLocale(i18nKey) {
  return i18nToServer[i18nKey] || i18nKey;
}