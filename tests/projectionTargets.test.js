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
