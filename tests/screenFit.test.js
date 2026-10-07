import test from 'node:test';
import assert from 'node:assert/strict';

import { findCuesWiderThanScreens } from '../src/utils/screenFit.js';
import { DEFAULT_SCREENS } from '../src/utils/screenSettings.js';

// Misura finta: ogni carattere è largo mezzo corpo, in grassetto un po' di più.
const measure = (text, { fontPx, bold }) => text.length * fontPx * (bold ? 0.55 : 0.5);

function project(cues, screens) {
  return {
    languages: ['it', 'en'],
    primaryLanguage: 'it',
    cues,
    settings: { screens, activeScreenId: screens[0].id },
  };
}

const cue = (id, it, en = '') => ({ id, type: 'cue', translations: { it, ...(en ? { en } : {}) } });
const screen = (extra = {}) => ({ ...DEFAULT_SCREENS[0], publicFontSize: '100px', publicMaxWidth: '100%', ...extra });

test('schermo: segnala solo le battute con una riga più larga dello schermo', () => {
  // A 100 px in grassetto ogni carattere vale 55,5 unità: su 2360 ne entrano 42.
  const cues = [
    cue('a', 'x'.repeat(40)),
    cue('b', 'x'.repeat(46)),
    { id: 'm', type: 'marker', title: 'Atto II' },
    cue('c', `${'x'.repeat(30)}\n${'x'.repeat(50)}`),
    cue('d', ''),
  ];
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen()]), 'it', measure), [1, 3]);
});

test('schermo: contano larghezza, dimensione e ogni schermo del progetto', () => {
  const cues = [cue('a', 'x'.repeat(40), 'y'.repeat(60))];
  // Con «Larghezza» al 60% la stessa battuta non entra più.
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen({ publicMaxWidth: '60%' })]), 'it', measure), [0]);
  // A 60 px entra anche la traduzione lunga.
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen({ publicFontSize: '60px', publicLanguage: 'en' })]), 'it', measure), []);
  // Un secondo schermo in inglese a 100 px la segnala, anche se il primo va bene.
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen(), screen({ id: 'due', name: 'Due', publicLanguage: 'en' })]), 'it', measure), [0]);
});

test('schermo: la seconda lingua è più piccola e viene misurata con la sua dimensione', () => {
  const cues = [cue('a', 'x'.repeat(20), 'y'.repeat(55))];
  // Al 70% (70 px) 55 caratteri occupano circa 2137 unità: entrano.
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen({ publicSecondLanguage: 'en', publicSecondScale: 70 })]), 'it', measure), []);
  // Al 90% (90 px) sono circa 2747: non entrano.
  assert.deepEqual(findCuesWiderThanScreens(project(cues, [screen({ publicSecondLanguage: 'en', publicSecondScale: 90 })]), 'it', measure), [0]);
});
