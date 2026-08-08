/**
 * The shared i18n instance.
 *
 * This lives in its own module rather than in main.js because the router needs
 * it to translate document titles, and main.js already imports the router —
 * building it there would make the two import each other in a cycle.
 *
 * Every locale is bundled statically, so `i18n.global.t` is usable the moment
 * this module is evaluated; nothing has to wait for a translation to load.
 *
 * bin, lol and tes come from locales-generated instead of locales — they're
 * derived from default.json by scripts/generate-locales.mjs, which the
 * predev/prebuild npm scripts run for you.
 */
import { createI18n } from 'vue-i18n';
import { getCookie } from '@/assets/js/utils.js';
import { getSupportedLocale } from '@/assets/js/languages.js';

import default_lang from '@/assets/locales/default.json';
import afr from '@/assets/locales/afr.json';
import de from '@/assets/locales/de.json';
import en from '@/assets/locales/en.json';
import en_au from '@/assets/locales/en_au.json';
import en_uk from '@/assets/locales/en_uk.json';
import en_us from '@/assets/locales/en_us.json';
import en_pi from '@/assets/locales/en_pi.json';
import pen from '@/assets/locales/pen.json';
import po from '@/assets/locales/pol.json';
import es from '@/assets/locales/es.json';
import tok from '@/assets/locales/tok.json';

import bin from '@/assets/locales-generated/bin.json';
import lol from '@/assets/locales-generated/lol.json';
import tes from '@/assets/locales-generated/tes.json';

const savedLocale = getSupportedLocale(getCookie('locale')) || 'en';

const i18n = createI18n({
    legacy: false,
    locale: savedLocale, // Set the default locale
    fallbackLocale: 'default', // Set a fallback locale in case the chosen locale is missing translations
    messages: {
        default: default_lang,
        afr,
        bin,
        de,
        en,
        en_au,
        en_uk,
        en_us,
        en_pi,
        lol,
        pen,
        po,
        es,
        tes,
        tok
    },
});

export default i18n;
