import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addProjectLanguage,
  getLanguageCompletion,
  getPrimaryLanguage,
  normalizeLanguageCode,
  removeProjectLanguage,
  renameProjectLanguage,
  setPrimaryProjectLanguage,
} from '../src/utils/projectLanguages.js';

const base = {
  languages: ['it', 'en'],
  languageNames: { it: 'Italiano', en: 'Inglese' },
  primaryLanguage: 'it',
  activeLanguage: 'en',
  cues: [
    { id: 1, translations: { it: 'Ciao', en: 'Hello' }, textSpans: { en: [{ start: 0, end: 5 }] } },
    { id: 2, type: 'marker', title: 'Atto II', translations: { it: '', en: '' } },
    { id: 3, translations: { it: 'Addio', en: '' } },
  ],
};

test('codici lingua normalizzati', () => {
  assert.equal(normalizeLanguageCode(' FR '), 'fr');
  assert.equal(normalizeLanguageCode('pt-BR'), 'pt-br');
  assert.equal(normalizeLanguageCode('!!'), '');
});

test('completamento senza contare i marcatori', () => {
  assert.deepEqual(getLanguageCompletion(base, 'it'), { total: 2, filled: 2 });
  assert.deepEqual(getLanguageCompletion(base, 'en'), { total: 2, filled: 1 });
});

test('aggiungere una lingua vuota non cambia la lingua di lavoro', () => {
  const { project, code } = addProjectLanguage(base, 'FR', 'Français');
  assert.equal(code, 'fr');
  assert.deepEqual(project.languages, ['it', 'en', 'fr']);
  assert.equal(project.languageNames.fr, 'Français');
  assert.equal(project.activeLanguage, 'en');
  assert.equal(addProjectLanguage(base, 'fr', '', { activate: true }).project.activeLanguage, 'fr');
  assert.equal(project.cues[0].translations.fr, '');
});

test('aggiungere copiando i testi di un\'altra lingua', () => {
  const { project } = addProjectLanguage(base, 'de', '', { copyFrom: 'it' });
  assert.equal(project.languageNames.de, 'DE');
  assert.equal(project.cues[0].translations.de, 'Ciao');
  assert.equal(project.cues[1].translations.de, '');
});

test('lingua già presente o codice vuoto', () => {
  assert.equal(addProjectLanguage(base, 'EN').error, 'exists');
  assert.equal(addProjectLanguage(base, '  ').error, 'code');
});

test('rinomina e lingua principale', () => {
  assert.equal(renameProjectLanguage(base, 'en', 'English').languageNames.en, 'English');
  assert.equal(renameProjectLanguage(base, 'en', '   '), base);
  assert.equal(setPrimaryProjectLanguage(base, 'en').primaryLanguage, 'en');
  assert.equal(setPrimaryProjectLanguage(base, 'xx'), base);
});

test('eliminare una lingua toglie testi e stili, e sposta attiva e principale', () => {
  const { project } = removeProjectLanguage(base, 'en');
  assert.deepEqual(project.languages, ['it']);
  assert.equal(project.activeLanguage, 'it');
  assert.equal(project.cues[0].translations.en, undefined);
  assert.equal(project.cues[0].textSpans.en, undefined);
  const { project: noPrimary } = removeProjectLanguage(base, 'it');
  assert.equal(getPrimaryLanguage(noPrimary), 'en');
});

test('deve restare almeno una lingua', () => {
  const single = { ...base, languages: ['it'] };
  assert.equal(removeProjectLanguage(single, 'it').error, 'last');
});
