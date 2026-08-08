/**
 * Generates the joke locales that don't need a human translator.
 *
 * bin (binary), lol (LOLCat) and tes (gibberish) are all mechanical transforms
 * of default.json, so they live outside src/assets/locales — Weblate watches
 * that folder and would otherwise offer them up for translation. The output
 * goes to src/assets/locales-generated, which is gitignored and rebuilt by the
 * predev/prebuild npm scripts.
 *
 * Run manually with `npm run generate-locales`.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const sourceFile = join(repoRoot, 'src/assets/locales/default.json');
const outputDir = join(repoRoot, 'src/assets/locales-generated');
const lolcatDictFile = join(scriptDir, 'data/tranzlashun.json');

/**
 * Splits a message into runs of literal text and vue-i18n placeholders.
 * Placeholders ({app}, {count}, ...) have to survive every transform verbatim
 * or interpolation breaks at runtime.
 */
function tokenise(message) {
    const tokens = [];
    const placeholder = /\{[^{}]*\}/g;
    let index = 0;
    let match;

    while ((match = placeholder.exec(message)) !== null) {
        if (match.index > index) {
            tokens.push({ literal: true, text: message.slice(index, match.index) });
        }
        tokens.push({ literal: false, text: match[0] });
        index = match.index + match[0].length;
    }

    if (index < message.length) {
        tokens.push({ literal: true, text: message.slice(index) });
    }

    return tokens;
}

/** Applies `transform` to the translatable runs of a message only. */
function mapLiterals(message, transform) {
    return tokenise(message)
        .map(token => (token.literal ? transform(token.text) : token.text))
        .join('');
}

// --- binary ----------------------------------------------------------------

/** UTF-8 bytes of the text as space separated octets. */
function toBinary(text) {
    return [...Buffer.from(text, 'utf8')]
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join(' ');
}

function generateBinary(message) {
    // Each literal run is encoded on its own so the placeholders in between stay
    // readable, and the surrounding spaces don't turn into stray octets.
    return tokenise(message)
        .map(token => (token.literal ? toBinary(token.text) : token.text))
        .join(' ')
        .trim();
}

// --- LOLCat ----------------------------------------------------------------

const lolcatDict = JSON.parse(readFileSync(lolcatDictFile, 'utf8'));

/** Re-applies the original word's capitalisation to its replacement. */
function matchCase(original, replacement) {
    if (original === original.toUpperCase() && original !== original.toLowerCase()) {
        return replacement.toUpperCase();
    }
    if (original[0] === original[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
    }
    return replacement;
}

function generateLolcat(message) {
    return mapLiterals(message, text =>
        text.replace(/[A-Za-z]+(?:'[A-Za-z]+)*/g, word => {
            const lower = word.toLowerCase();
            // The dictionary maps "a" to nothing; dropping it would leave double
            // spaces behind, so words without a real replacement are left alone.
            const replacement = lolcatDict[lower] || lolcatDict[lower.replace(/'/g, '')];
            return replacement ? matchCase(word, replacement) : word;
        })
    );
}

// --- gibberish -------------------------------------------------------------

const LOWER = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Deterministic PRNG so regenerating doesn't produce a fresh set of nonsense
 * every time — the same key always gets the same gibberish.
 */
function makeRandom(seedText) {
    let seed = 0x811c9dc5;
    for (const char of seedText) {
        seed ^= char.charCodeAt(0);
        seed = Math.imul(seed, 0x01000193) >>> 0;
    }
    return () => {
        seed ^= seed << 13; seed >>>= 0;
        seed ^= seed >> 17;
        seed ^= seed << 5; seed >>>= 0;
        return seed / 0x100000000;
    };
}

function generateGibberish(message, key) {
    const random = makeRandom(key + message);
    return mapLiterals(message, text =>
        // Whitespace stays put, everything else becomes a random letter of the
        // same case, so the shape of the original sentence survives.
        [...text]
            .map(char => {
                if (/\s/.test(char)) {
                    return char;
                }
                const letter = LOWER[Math.floor(random() * LOWER.length)];
                return char === char.toUpperCase() && char !== char.toLowerCase()
                    ? letter.toUpperCase()
                    : letter;
            })
            .join('')
    );
}

// --- output ----------------------------------------------------------------

const locales = [
    // `current-lang` names the language in the picker, so it has to stay legible.
    { name: 'bin', overrides: { 'current-lang': 'Binary' }, generate: generateBinary },
    // The dictionary has no entry for "serble", so the site name is spelled the
    // way the hand-written locale used to spell it.
    { name: 'lol', overrides: { 'current-lang': 'LOLCat', serble: 'Serbel' }, generate: generateLolcat },
    { name: 'tes', overrides: { 'current-lang': 'Gibberish' }, generate: generateGibberish }
];

const source = JSON.parse(readFileSync(sourceFile, 'utf8'));
mkdirSync(outputDir, { recursive: true });

for (const locale of locales) {
    const messages = {};
    for (const [key, message] of Object.entries(source)) {
        messages[key] = key in locale.overrides
            ? locale.overrides[key]
            : locale.generate(message, key);
    }

    const outputFile = join(outputDir, `${locale.name}.json`);
    writeFileSync(outputFile, `${JSON.stringify(messages, null, 2)}\n`);
    console.log(`Generated ${locale.name}.json (${Object.keys(messages).length} keys)`);
}
