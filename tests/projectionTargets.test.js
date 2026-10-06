import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectionPayload, getProjectionStorageKey } from '../src/utils/projectionTargets.js';

const cue = {
  id: 1,
  original: 'Originale',
  translations: {
    it: 'Italiano',
    en: 'English',
  },
  renderStyle: 'italic',
};

test('buildProjectionPayload usa la lingua specifica dello schermo', () => {
  const payload = buildProjectionPayload({
    cue,
    screen: {
      id: 'sala-en',
      name: 'Sala inglese',
      publicLanguage: 'en',
      publicFontSize: '60px',
    },
    activeLanguage: 'it',
    languages: ['it', 'en'],
  });

  assert.equal(payload.language, 'en');
  assert.equal(payload.text, 'English');
  assert.equal(payload.settings.fontSize, '60px');
  assert.equal(payload.cueStyle, 'italic');
});

test('buildProjectionPayload segue la lingua attiva se lo schermo non ne imposta una', () => {
  const payload = buildProjectionPayload({
    cue,
    screen: {
      id: 'sala-attiva',
      name: 'Sala attiva',
      publicLanguage: 'active',
    },
    activeLanguage: 'it',
    languages: ['it', 'en'],
  });

  assert.equal(payload.language, 'it');
  assert.equal(payload.text, 'Italiano');
});

test('getProjectionStorageKey crea una chiave distinta per ogni schermo', () => {
  assert.equal(getProjectionStorageKey('sala-en'), 'stentore-public-stage-payload-sala-en');
});

test('buildProjectionPayload conserva il formato schermo configurato', () => {
  const payload = buildProjectionPayload({
    cue,
    screen: {
      id: 'sala-43',
      name: 'Sala 4:3',
      publicLanguage: 'it',
      publicAspectRatio: '4:3',
    },
    activeLanguage: 'it',
    languages: ['it', 'en'],
  });

  assert.equal(payload.settings.aspectRatio, '4:3');
});

test('segnale di presenza: lo schermo risulta aperto solo se il segnale è recente', async () => {
  const { getStageAliveKey, isStageAlive } = await import('../src/utils/projectionTargets.js');
  const store = new Map();
  const storage = { getItem: (key) => store.get(key) ?? null };
  assert.equal(isStageAlive('sala', storage, 10_000), false);
  store.set(getStageAliveKey('sala'), String(9_000));
  assert.equal(isStageAlive('sala', storage, 10_000), true);
  assert.equal(isStageAlive('altra', storage, 10_000), false);
  // Finestra chiusa di colpo: il segnale invecchia e dopo cinque secondi non conta più.
  assert.equal(isStageAlive('sala', storage, 15_000), false);
  store.set(getStageAliveKey('sala'), 'non un numero');
  assert.equal(isStageAlive('sala', storage, 10_000), false);
});

test('schermata di prova: sostituisce battuta e buio con nome dello schermo e riga campione', async () => {
  const { TEST_PATTERN_SAMPLE } = await import('../src/utils/projectionTargets.js');
  const payload = buildProjectionPayload({
    cue: { id: 'c1', translations: { it: 'Una battuta' } },
    screen: { id: 'sala', name: 'Sala grande', publicFontSize: '80px' },
    activeLanguage: 'it',
    languages: ['it'],
    blackout: true,
    testPattern: true,
  });
  assert.equal(payload.testPattern, true);
  assert.equal(payload.blackout, false);
  assert.equal(payload.text, `Sala grande\n${TEST_PATTERN_SAMPLE}`);
  assert.equal(payload.settings.fontSize, '80px');
  // Senza prova il payload non porta il segno: la finestra toglie cornice e guide.
  assert.equal(buildProjectionPayload({ cue: null, screen: { id: 'sala', name: 'Sala' }, languages: ['it'] }).testPattern, undefined);
});
