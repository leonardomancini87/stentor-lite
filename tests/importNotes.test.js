import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTheatreScriptText } from '../src/utils/wordScriptImport.js';
import { normalizeCue } from '../src/utils/projectSchema.js';

test('il copione Word importato non scrive note automatiche', () => {
  const result = parseTheatreScriptText('ATTO PRIMO\nAMLETO: Essere o non essere.\n(Entra Ofelia)', { language: 'it' });
  assert.ok(result.cues.length >= 2);
  for (const cue of result.cues) assert.equal(cue.note, '');
});

test('le note automatiche delle versioni precedenti vengono tolte', () => {
  assert.equal(normalizeCue({ note: 'Battuta importata dal copione Word' }).note, '');
  assert.equal(normalizeCue({ note: 'Didascalia importata dal copione Word' }).note, '');
  assert.equal(normalizeCue({ note: 'Importato dal copione Word' }).note, '');
  assert.equal(normalizeCue({ note: 'Luce 12' }).note, 'Luce 12');
});
