import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectionPayload } from '../src/utils/projectionTargets.js';
import { clampScreenOffset, getScreens, screenToPublicSettings, updateScreenSettings } from '../src/utils/screenSettings.js';

test('un progetto nuovo ha un solo schermo, «Schermo 1»', () => {
  const screens = getScreens({});
  assert.equal(screens.length, 1);
  assert.equal(screens[0].name, 'Schermo 1');
});

test('gli schermi dimostrativi di Torino e Lione, se intatti, diventano «Schermo 1»', () => {
  const screens = getScreens({
    screens: [
      { id: 'studio-torino', name: 'Studio Torino', publicLanguage: 'it', publicFontSize: '80px' },
      { id: 'pannello-lione', name: 'Pannello Lione', publicLanguage: 'en' },
    ],
  });
  assert.equal(screens.length, 1);
  assert.equal(screens[0].name, 'Schermo 1');
  assert.equal(screens[0].publicLanguage, 'active');
  assert.equal(screens[0].publicFontSize, '80px');
});

test('gli schermi rinominati dall\'utente restano come sono', () => {
  const screens = getScreens({
    screens: [
      { id: 'studio-torino', name: 'Sala grande' },
      { id: 'pannello-lione', name: 'Ledwall' },
    ],
  });
  assert.deepEqual(screens.map((screen) => screen.name), ['Sala grande', 'Ledwall']);
});

test('lo spostamento del testo resta nei limiti e arriva alla finestra di proiezione', () => {
  assert.equal(clampScreenOffset('12.3'), 12.5);
  assert.equal(clampScreenOffset(80, 'x'), 50);
  assert.equal(clampScreenOffset(-80, 'y'), -80);
  assert.equal(clampScreenOffset(-180, 'y'), -100);
  assert.equal(clampScreenOffset('abc'), 0);

  const screen = { id: 's1', name: 'Schermo 1', publicOffsetX: 10, publicOffsetY: -20 };
  assert.equal(screenToPublicSettings(screen).publicOffsetY, -20);
  const payload = buildProjectionPayload({ cue: { id: 1, original: 'Ciao' }, screen, activeLanguage: 'it', languages: ['it'] });
  assert.equal(payload.settings.offsetX, 10);
  assert.equal(payload.settings.offsetY, -20);
});

test('si può aggiornare uno schermo che non è quello attivo', () => {
  const settings = {
    activeScreenId: 'a',
    screens: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  };
  const next = updateScreenSettings(settings, 'b', { publicOffsetX: 5 });
  assert.equal(next.activeScreenId, 'a');
  assert.equal(next.screens.find((screen) => screen.id === 'b').publicOffsetX, 5);
  assert.equal(next.screens.find((screen) => screen.id === 'a').publicOffsetX, 0);
});
