import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WELCOME_TOUR_STEPS,
  WELCOME_TOUR_STORAGE_KEY,
  clampTourStep,
  markWelcomeTourSeen,
  shouldShowWelcomeTour,
} from '../src/utils/welcomeTour.js';
import { collect, LANGUAGE_FILES } from '../src/i18n/locales/index.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('la guida ha sette passaggi, ognuno su una pagina dell’app', () => {
  assert.equal(WELCOME_TOUR_STEPS.length, 7);
  const pages = new Set(['dashboard', 'editor', 'screens', 'preferences']);
  for (const step of WELCOME_TOUR_STEPS) assert.ok(pages.has(step.page), step.id);
});

test('al primo avvio la guida compare, poi non più', () => {
  const storage = memoryStorage();
  assert.equal(shouldShowWelcomeTour(storage), true);
  markWelcomeTourSeen(storage);
  assert.equal(storage.getItem(WELCOME_TOUR_STORAGE_KEY), 'seen');
  assert.equal(shouldShowWelcomeTour(storage), false);
});

test('chi aggiorna da una versione precedente non vede la guida da solo', () => {
  assert.equal(shouldShowWelcomeTour(memoryStorage({ 'stentore.projectArchive.v1': '[]' })), false);
  assert.equal(shouldShowWelcomeTour(memoryStorage({ 'stentore.currentProjectId.v1': 'abc' })), false);
  assert.equal(shouldShowWelcomeTour(memoryStorage({ 'opensurtitles.currentProject': '{}' })), false);
});

test('memoria locale assente o inutilizzabile: niente guida, niente errori', () => {
  assert.equal(shouldShowWelcomeTour(null), false);
  const broken = { getItem() { throw new Error('bloccata'); }, setItem() { throw new Error('bloccata'); } };
  assert.equal(shouldShowWelcomeTour(broken), true);
  assert.doesNotThrow(() => markWelcomeTourSeen(broken));
});

test('il passaggio resta nei limiti', () => {
  assert.equal(clampTourStep(-3), 0);
  assert.equal(clampTourStep(99), WELCOME_TOUR_STEPS.length - 1);
  assert.equal(clampTourStep(Number.NaN), 0);
  assert.equal(clampTourStep(2.7), 2);
});

test('i testi della guida esistono in tutte le lingue, con gli stessi segnaposto e grassetti', () => {
  const it = collect('it');
  const keys = Object.keys(it).filter((key) => key.startsWith('tour.'));
  for (const step of WELCOME_TOUR_STEPS) {
    assert.ok(keys.includes(`tour.${step.id}.title`), step.id);
    assert.ok(keys.includes(`tour.${step.id}.text`), step.id);
  }
  const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
  const bold = (text) => (text.match(/<\/?b>/g) || []).length;
  for (const language of ['en', ...Object.keys(LANGUAGE_FILES)]) {
    const messages = collect(language);
    for (const key of keys) {
      assert.ok(messages[key], `${language}: ${key}`);
      assert.equal(placeholders(messages[key]), placeholders(it[key]), `${language}: ${key}`);
      assert.equal(bold(messages[key]), bold(it[key]), `${language}: ${key}`);
    }
  }
});
