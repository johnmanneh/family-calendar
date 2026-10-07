import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import tr from './locales/tr.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import th from './locales/th.json';
import fa from './locales/fa.json';
import hi from './locales/hi.json';
import sw from './locales/sw.json';
import pcm from './locales/pcm.json';
import kri from './locales/kri.json';

// ─── Constants ────────────────────────────────────────────────────────────────

export const RTL_LANGUAGES = ['ar', 'fa'];

export const SUPPORTED_LANGUAGES = [
  { code: 'en',  name: 'English',            nativeName: 'English' },
  { code: 'ar',  name: 'Arabic',             nativeName: 'العربية' },
  { code: 'de',  name: 'German',             nativeName: 'Deutsch' },
  { code: 'es',  name: 'Spanish',            nativeName: 'Español' },
  { code: 'fa',  name: 'Farsi',              nativeName: 'فارسی' },
  { code: 'fr',  name: 'French',             nativeName: 'Français' },
  { code: 'hi',  name: 'Hindi',              nativeName: 'हिन्दी' },
  { code: 'it',  name: 'Italian',            nativeName: 'Italiano' },
  { code: 'ko',  name: 'Korean',             nativeName: '한국어' },
  { code: 'kri', name: 'Krio',               nativeName: 'Krio' },
  { code: 'pcm', name: 'Nigerian Pidgin',    nativeName: 'Naijá' },
  { code: 'pl',  name: 'Polish',             nativeName: 'Polski' },
  { code: 'pt',  name: 'Portuguese',         nativeName: 'Português' },
  { code: 'ru',  name: 'Russian',            nativeName: 'Русский' },
  { code: 'sw',  name: 'Swahili',            nativeName: 'Kiswahili' },
  { code: 'th',  name: 'Thai',               nativeName: 'ภาษาไทย' },
  { code: 'tr',  name: 'Turkish',            nativeName: 'Türkçe' },
  { code: 'zh',  name: 'Chinese',            nativeName: '中文' },
];

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map(l => l.code);
const LANGUAGE_KEY = '@when_language';

// ─── RTL helper ───────────────────────────────────────────────────────────────

function applyRTL(code) {
  const isRTL = RTL_LANGUAGES.includes(code);
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
}

// ─── Initialise i18next ───────────────────────────────────────────────────────

// Start with device locale (or English) synchronously so the first render
// is already translated. AsyncStorage is checked after init and if the user
// has a saved preference we switch to it — causing one re-render.
const deviceLocale = Localization.locale?.split('-')[0] || 'en';
const deviceLng    = SUPPORTED_CODES.includes(deviceLocale) ? deviceLocale : 'en';

applyRTL(deviceLng);

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en:  { translation: en },
      de:  { translation: de },
      es:  { translation: es },
      fr:  { translation: fr },
      it:  { translation: it },
      tr:  { translation: tr },
      pt:  { translation: pt },
      pl:  { translation: pl },
      ko:  { translation: ko },
      ru:  { translation: ru },
      ar:  { translation: ar },
      zh:  { translation: zh },
      th:  { translation: th },
      fa:  { translation: fa },
      hi:  { translation: hi },
      sw:  { translation: sw },
      pcm: { translation: pcm },
      kri: { translation: kri },
    },
    lng: deviceLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// After init: apply any saved user preference
AsyncStorage.getItem(LANGUAGE_KEY).then(saved => {
  if (saved && SUPPORTED_CODES.includes(saved) && saved !== i18n.language) {
    applyRTL(saved);
    i18n.changeLanguage(saved);
  }
});

// ─── Public helper ────────────────────────────────────────────────────────────

/**
 * Change the app language, persist the choice, and apply RTL if needed.
 * Call this from the language picker in Settings.
 */
export async function setAppLanguage(code) {
  if (!SUPPORTED_CODES.includes(code)) return;
  await AsyncStorage.setItem(LANGUAGE_KEY, code);
  applyRTL(code);
  await i18n.changeLanguage(code);
}

export default i18n;
