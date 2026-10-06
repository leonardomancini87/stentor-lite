import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProjectionPayload } from '../src/utils/projectionTargets.js';
import { getScreenSecondLanguage, screenToPublicSettings } from '../src/utils/screenSettings.js';
import { layoutStageText } from '../src/utils/stageLayout.js';

const languages = ['it', 'en', 'fr'];
const cue = { id: 7, original: 'Buongiorno.', translations: { it: 'Buongiorno.', en: 'Good morning.' } };
const screen = { id: 'sala', name: 'Sala', publicLanguage: 'it', publicSecondLanguage: 'en' };

test('seconda lingua: il payload porta anche la traduzione e la dimensione', () => {
  const payload = buildProjectionPayload({ cue, screen: { ...screen, publicSecondScale: 60 }, activeLanguage: 'it', languages, primaryLanguage: 'it' });
  assert.equal(payload.text, 'Buongiorno.');
  assert.equal(payload.secondLanguage, 'en');
  assert.equal(payload.secondText, 'Good morning.');
  assert.equal(payload.settings.secondScale, 60);
});

test('seconda lingua: senza traduzione non si ripete il testo originale', () => {
  const payload = buildProjectionPayload({ cue, screen: { ...screen, publicSecondLanguage: 'fr' }, activeLanguage: 'it', languages, primaryLanguage: 'it' });
  assert.equal(payload.secondText, '');
});

test('seconda lingua: buio, marcatori e lingua uguale alla prima non mostrano nulla', () => {
  assert.equal(buildProjectionPayload({ cue, screen, activeLanguage: 'it', languages, primaryLanguage: 'it', blackout: true }).secondText, '');
  assert.equal(buildProjectionPayload({ cue: { ...cue, type: 'marker' }, screen, activeLanguage: 'it', languages, primaryLanguage: 'it' }).secondText, '');
  assert.equal(getScreenSecondLanguage({ publicLanguage: 'active', publicSecondLanguage: 'en' }, 'en', languages), '');
  assert.equal(getScreenSecondLanguage({ publicLanguage: 'it', publicSecondLanguage: 'de' }, 'it', languages), '');
});

test('seconda lingua: dimensione predefinita 70% e limitata tra 50% e 90%', () => {
  assert.equal(screenToPublicSettings({}).publicSecondScale, 70);
  assert.equal(screenToPublicSettings({ publicSecondScale: 20 }).publicSecondScale, 50);
  assert.equal(screenToPublicSettings({ publicSecondScale: 120 }).publicSecondScale, 90);
});

test('impaginazione: con una lingua sola le righe restano dove erano', () => {
  const layout = layoutStageText({ lineCount: 2, fontPx: 100, centerY: 400 });
  assert.deepEqual(layout.primaryY, [344, 456]);
  assert.equal(layout.separator, null);
});

test('impaginazione: la seconda lingua va sotto, più piccola, dopo il trattino', () => {
  const layout = layoutStageText({ lineCount: 1, secondLineCount: 1, fontPx: 100, secondScale: 70, centerY: 400, verticalAlign: 'top' });
  // In alto la prima lingua non si sposta: il blocco cresce verso il basso.
  assert.deepEqual(layout.primaryY, [400]);
  assert.ok(layout.separator.y > layout.primaryY[0]);
  assert.ok(layout.secondY[0] > layout.separator.y);
  // Più spazio sotto il trattino che sopra (le maiuscole della seconda lingua lo «avvicinano»).
  assert.ok(layout.secondY[0] - 70 * 1.12 / 2 - layout.separator.y > layout.separator.y - (layout.primaryY[0] + 56));
  assert.equal(layout.secondFontPx, 70);

  const centered = layoutStageText({ lineCount: 1, secondLineCount: 1, fontPx: 100, centerY: 400 });
  const top = centered.primaryY[0] - 56;
  const bottom = centered.secondY[0] + (70 * 1.12) / 2;
  assert.ok(Math.abs((top + bottom) / 2 - 400) < 1e-9);

  const bottomAligned = layoutStageText({ lineCount: 1, secondLineCount: 1, fontPx: 100, centerY: 400, verticalAlign: 'bottom' });
  assert.ok(Math.abs(bottomAligned.secondY[0] + (70 * 1.12) / 2 - 456) < 1e-9);
});
