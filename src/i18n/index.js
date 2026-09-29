import { createContext, createElement, useCallback, useContext, useMemo } from 'react';
import { collect, LANGUAGE_FILES } from './locales/index.js';

// Traduzioni dell'interfaccia per chiave. L'italiano è la lingua di riferimento:
// una chiave mancante in un'altra lingua ricade sull'italiano (e il test lo segnala).
export const MESSAGES = Object.fromEntries(
  ['it', 'en', ...Object.keys(LANGUAGE_FILES)].map((language) => [language, collect(language)])
);
export const I18N_LANGUAGES = Object.keys(MESSAGES);

const pluralRulesCache = new Map();
function pluralCategory(language, count) {
  if (!pluralRulesCache.has(language)) pluralRulesCache.set(language, new Intl.PluralRules(language));
  return pluralRulesCache.get(language).select(count);
}

function lookup(language, key) {
  const table = MESSAGES[language] || MESSAGES.it;
  return table[key] ?? MESSAGES.it[key];
}

// translate('it', 'cues.count', { count: 3 }) → usa 'cues.count.one' / 'cues.count.other' se esistono.
export function translate(language, key, vars = {}) {
  let message;
  if (typeof vars.count === 'number') {
    const category = pluralCategory(language, vars.count);
    message = lookup(language, `${key}.${category}`) ?? lookup(language, `${key}.other`);
  }
  message = message ?? lookup(language, key);
  if (message === undefined) return key;
  return String(message).replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])));
}

const I18nContext = createContext('it');

// Lingua corrente anche per il codice fuori da React (hook, messaggi di errore).
let currentLanguage = 'it';
export function getI18nLanguage() {
  return currentLanguage;
}
export function tr(key, vars) {
  return translate(currentLanguage, key, vars);
}

export function I18nProvider({ language, children }) {
  const value = MESSAGES[language] ? language : 'it';
  currentLanguage = value;
  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  const language = useContext(I18nContext);
  const t = useCallback((key, vars) => translate(language, key, vars), [language]);
  return useMemo(() => ({ language, t }), [language, t]);
}

// Testi con un minimo di formattazione: <b>…</b> e segnaposto <nome/> per elementi
// (es. un'icona) passati in `parts`. Restituisce un array di nodi React.
export function renderRich(message, parts = {}) {
  const tokens = String(message).split(/(<b>.*?<\/b>|<\w+\/>)/g).filter((token) => token !== '');
  return tokens.map((token, index) => {
    const bold = token.match(/^<b>(.*?)<\/b>$/);
    if (bold) return createElement('b', { key: index }, bold[1]);
    const slot = token.match(/^<(\w+)\/>$/);
    if (slot) return createElement('span', { key: index, className: 'i18nSlot' }, parts[slot[1]] ?? null);
    return token;
  });
}
