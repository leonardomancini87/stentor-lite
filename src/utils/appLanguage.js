export const APP_LANGUAGE_STORAGE_KEY = 'stentor.appLanguage';

// Lingue dell'interfaccia: ognuna ha la sua traduzione completa in src/i18n/locales.
export const ALL_APP_LANGUAGES = [
  { code: 'it', label: 'Italiano', shortLabel: 'IT' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'fr', label: 'Français', shortLabel: 'FR' },
  { code: 'es', label: 'Español', shortLabel: 'ES' },
  { code: 'de', label: 'Deutsch', shortLabel: 'DE' },
  { code: 'pt', label: 'Português', shortLabel: 'PT' },
  { code: 'sv', label: 'Svenska', shortLabel: 'SV' },
  { code: 'da', label: 'Dansk', shortLabel: 'DA' },
  { code: 'no', label: 'Norsk', shortLabel: 'NO' },
  { code: 'fi', label: 'Suomi', shortLabel: 'FI' },
  { code: 'pl', label: 'Polski', shortLabel: 'PL' },
  { code: 'cs', label: 'Čeština', shortLabel: 'CS' },
  { code: 'sk', label: 'Slovenčina', shortLabel: 'SK' },
  { code: 'hr', label: 'Hrvatski', shortLabel: 'HR' },
  { code: 'sr', label: 'Српски', shortLabel: 'SR' },
  { code: 'bg', label: 'Български', shortLabel: 'BG' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU' },
  { code: 'uk', label: 'Українська', shortLabel: 'UK' },
  { code: 'el', label: 'Ελληνικά', shortLabel: 'EL' },
  { code: 'tr', label: 'Türkçe', shortLabel: 'TR' },
  { code: 'zh', label: '简体中文', shortLabel: '简' },
  { code: 'zh-Hant', label: '繁體中文', shortLabel: '繁' },
  { code: 'ar', label: 'العربية', shortLabel: 'AR' },
  { code: 'hi', label: 'हिन्दी', shortLabel: 'HI' },
  { code: 'ml', label: 'മലയാളം', shortLabel: 'ML' },
];

// Lingue offerte nel menu: solo quelle tradotte per intero (vedi src/i18n).
// Le altre tornano disponibili quando hanno il loro file di traduzione completo.
export const COMPLETE_APP_LANGUAGES = ALL_APP_LANGUAGES.map((item) => item.code);
// Nella scelta della lingua l'ordine è alfabetico per sigla (AR, BG, CS… ZH): è quella che si legge
// accanto a ogni nome ed è uguale in ogni lingua dell'interfaccia, mentre i nomi, scritti ognuno
// nel proprio alfabeto, finirebbero raggruppati per scrittura. Le due varianti del cinese chiudono.
export const APP_LANGUAGES = ALL_APP_LANGUAGES
  .filter((item) => COMPLETE_APP_LANGUAGES.includes(item.code))
  .sort((a, b) => a.code.toLowerCase().localeCompare(b.code.toLowerCase(), 'en'));

// Lingue scritte da destra a sinistra: l'interfaccia si specchia.
export const RTL_APP_LANGUAGES = ['ar'];
export function isRtlLanguage(language) {
  return RTL_APP_LANGUAGES.includes(language);
}

export function normalizeAppLanguage(language) {
  return APP_LANGUAGES.some((item) => item.code === language) ? language : 'it';
}

export function getInitialAppLanguage() {
  if (typeof window === 'undefined') return 'it';
  const saved = window.localStorage?.getItem(APP_LANGUAGE_STORAGE_KEY);
  if (APP_LANGUAGES.some((item) => item.code === saved)) return saved;
  // Primo avvio (o lingua non più offerta): italiano per i browser italiani, altrimenti inglese.
  const browserLanguage = window.navigator?.language?.toLowerCase() || '';
  if (/^zh-(tw|hk|mo|hant)/.test(browserLanguage)) return 'zh-Hant';
  // Norvegese: il browser può dire no, nb o nn.
  if (/^(nb|nn)\b/.test(browserLanguage)) return 'no';
  for (const code of ['fr', 'de', 'es', 'pt', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hr', 'sr', 'bg', 'ru', 'uk', 'el', 'tr', 'zh', 'ar', 'hi', 'ml']) {
    if (browserLanguage.startsWith(code)) return code;
  }
  return !browserLanguage || browserLanguage.startsWith('it') ? 'it' : 'en';
}

export function saveAppLanguage(language) {
  if (typeof window === 'undefined') return;
  window.localStorage?.setItem(APP_LANGUAGE_STORAGE_KEY, normalizeAppLanguage(language));
}

export function getNextAppLanguage(language) {
  const index = APP_LANGUAGES.findIndex((item) => item.code === language);
  return APP_LANGUAGES[(index + 1 + APP_LANGUAGES.length) % APP_LANGUAGES.length].code;
}

export function getAppLanguageMeta(language) {
  return APP_LANGUAGES.find((item) => item.code === language)
    || APP_LANGUAGES.find((item) => item.code === 'it');
}
