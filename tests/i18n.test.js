import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { AREAS } from '../src/i18n/locales/index.js';
import { MESSAGES, translate } from '../src/i18n/index.js';

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}|<(\w+)\/>|<b>/g)].map((m) => m[0]).sort();

test('i18n: ogni area ha le stesse chiavi in italiano e in inglese', () => {
  for (const [area, table] of Object.entries(AREAS)) {
    const itKeys = Object.keys(table.it).sort();
    const enKeys = Object.keys(table.en).sort();
    assert.deepEqual(enKeys.filter((key) => !itKeys.includes(key)), [], `${area}: chiavi solo in inglese`);
    assert.deepEqual(itKeys.filter((key) => !enKeys.includes(key)), [], `${area}: chiavi senza traduzione inglese`);
  }
});

test('i18n: segnaposto e formattazione uguali nelle due lingue', () => {
  for (const [key, value] of Object.entries(MESSAGES.it)) {
    assert.deepEqual(placeholders(MESSAGES.en[key]), placeholders(value), key);
  }
});

test('i18n: nessuna chiave duplicata tra aree diverse', () => {
  const seen = new Map();
  for (const [area, table] of Object.entries(AREAS)) {
    for (const key of Object.keys(table.it)) {
      assert.equal(seen.has(key), false, `${key} in ${seen.get(key)} e ${area}`);
      seen.set(key, area);
    }
  }
});

test('i18n: sostituzioni e plurali', () => {
  assert.equal(translate('it', 'count.cues', { count: 1 }), '1 battuta');
  assert.equal(translate('it', 'count.cues', { count: 3 }), '3 battute');
  assert.equal(translate('en', 'count.cues', { count: 1 }), '1 cue');
  assert.equal(translate('en', 'count.cues', { count: 3 }), '3 cues');
  assert.equal(translate('en', 'map.goTo', { title: 'Act II' }), 'Go to Act II');
  assert.equal(translate('xx', 'conductor.next'), 'Avanti');
  // Plurali slavi: 1 / 2–4 / 5+ usano forme diverse.
  assert.notEqual(translate('pl', 'count.cues', { count: 2 }), translate('pl', 'count.cues', { count: 5 }));
  assert.notEqual(translate('ru', 'count.cues', { count: 3 }), translate('ru', 'count.cues', { count: 7 }));
  assert.equal(translate('fr', 'conductor.next'), 'Suivant');
  assert.equal(translate('en', 'chiave.inesistente'), 'chiave.inesistente');
});

// Le parti già convertite non devono contenere testi scritti direttamente nel codice.
const CONVERTED = [
  'ShowMap', 'TimeCard', 'ToolsCard', 'ShortcutsCard', 'CardCollapseButton', 'CueStructuralToolbar',
  'CueRowEditor', 'CueRowAnnotation', 'LanguageSwitcher', 'LanguagesDialog', 'Sidebar',
  'DesktopDashboard', 'DesktopPreferences', 'FeedbackDialog', 'ScreensPage',
];

test('i18n: nessun testo italiano fisso nei componenti convertiti', () => {
  for (const name of CONVERTED) {
    const source = readFileSync(new URL(`../src/components/${name}.jsx`, import.meta.url), 'utf8')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const literalAttributes = [...source.matchAll(/\b(title|aria-label|placeholder|label)="([^"]*[a-zà-ù]{3}[^"]*)"/g)].map((m) => m[0]);
    assert.deepEqual(literalAttributes, [], `${name}: attributi con testo fisso`);
    const jsxText = [...source.matchAll(/>\s*([A-Za-zÀ-ú][^<>{}]*[a-zà-ù]{3}[^<>{}]*)\s*</g)]
      .map((m) => m[1].trim())
      .filter((text) => !/^(Sténtor|Lite|Sténtor Lite)$/.test(text) && !/[;()=]|&&|\|\|/.test(text));
    assert.deepEqual(jsxText, [], `${name}: testo fisso nel markup`);
  }
});

// Lingue aggiunte con un file unico (es. Malayalam): stesse chiavi e stessi segnaposto dell'italiano.
import { LANGUAGE_FILES } from '../src/i18n/locales/index.js';
import { VOICE_MESSAGES } from '../src/utils/voiceMessages.js';

test('i18n: le lingue aggiuntive hanno tutte le chiavi e i segnaposto giusti', () => {
  for (const [language, table] of Object.entries(LANGUAGE_FILES)) {
    const itKeys = Object.keys(MESSAGES.it);
    assert.deepEqual(itKeys.filter((key) => !(key in table)), [], `${language}: chiavi mancanti`);
    // Forme plurali in più (es. arabo: .two/.few/.many) ammesse se esiste la chiave .other.
    const extraPlural = (key) => /\.(zero|two|few|many)$/.test(key) && itKeys.includes(key.replace(/\.\w+$/, '.other'));
    assert.deepEqual(Object.keys(table).filter((key) => !itKeys.includes(key) && !extraPlural(key)), [], `${language}: chiavi in più`);
    for (const key of Object.keys(table).filter(extraPlural)) {
      assert.deepEqual(placeholders(table[key]), placeholders(MESSAGES.it[key.replace(/\.\w+$/, '.other')]), `${language}: ${key}`);
    }
    for (const key of itKeys) {
      assert.ok(String(table[key]).trim(), `${language}: ${key} vuota`);
      assert.deepEqual(placeholders(table[key]), placeholders(MESSAGES.it[key]), `${language}: ${key}`);
    }
    if (VOICE_MESSAGES[language]) {
      assert.deepEqual(Object.keys(VOICE_MESSAGES[language]).sort(), Object.keys(VOICE_MESSAGES.it).sort(), `${language}: voci`);
    }
  }
  assert.equal(translate('ml', 'count.cues', { count: 3 }), '3 ക്യൂകൾ');
  assert.equal(translate('ar', 'count.lines', { count: 2 }), '2 سطران');
  assert.equal(translate('ar', 'count.lines', { count: 5 }), '5 أسطر');
  assert.equal(translate('ar', 'count.lines', { count: 11 }), '11 سطرًا');
  assert.equal(translate('hi', 'count.lines', { count: 3 }), '3 पंक्तियाँ');
  assert.equal(translate('hi', 'count.lines', { count: 1 }), '1 पंक्ति');
});

import { APP_LANGUAGES as CHOOSER_LANGUAGES, getAppLanguageMeta } from '../src/utils/appLanguage.js';

test('i18n: nella scelta della lingua i nomi sono in ordine alfabetico', () => {
  const labels = CHOOSER_LANGUAGES.map((item) => item.label);
  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  assert.deepEqual(labels, [...labels].sort(collator.compare));
  assert.equal(labels[0], 'Čeština');
  assert.equal(getAppLanguageMeta('xx').code, 'it');
});
