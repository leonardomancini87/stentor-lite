import test from 'node:test';
import assert from 'node:assert/strict';

import { exportCsv, exportSrt, exportVtt, parseCsv, parseSrt, parseVtt } from '../src/utils/subtitleExchange.js';
import { normalizeProject } from '../src/utils/projectSchema.js';

test('SRT import/export roundtrip preserves timing and text', () => {
  const srt = '1\n00:00:01,500 --> 00:00:03,000\nCiao mondo\n';
  const cues = parseSrt(srt, 1, 'it');
  assert.equal(cues.length, 1);
  assert.equal(cues[0].startTime, 1.5);
  assert.equal(cues[0].endTime, 3);
  assert.equal(cues[0].translations.it, 'Ciao mondo');

  const exported = exportSrt({ cues, activeLanguage: 'it' }, 'it');
  assert.match(exported, /00:00:01,500 --> 00:00:03,000/);
  assert.match(exported, /Ciao mondo/);
});

test('WebVTT import/export preserves timing and skips header', () => {
  const vtt = 'WEBVTT\n\nintro-1\n00:00:02.250 --> 00:00:04.000 align:center\nBenvenuti a teatro\n';
  const cues = parseVtt(vtt, 10, 'it');

  assert.equal(cues.length, 1);
  assert.equal(cues[0].id, 10);
  assert.equal(cues[0].startTime, 2.25);
  assert.equal(cues[0].endTime, 4);
  assert.equal(cues[0].translations.it, 'Benvenuti a teatro');

  const exported = exportVtt({ cues, activeLanguage: 'it' }, 'it');
  assert.match(exported, /^WEBVTT/);
  assert.match(exported, /00:00:02.250 --> 00:00:04.000/);
  assert.match(exported, /Benvenuti a teatro/);
});

test('CSV import/export handles quoted text', () => {
  const csv = 'speaker,startTime,endTime,original,translation_it,note\nTESTO,0,2,"Ciao, mondo","Ciao, mondo",nota';
  const cues = parseCsv(csv, 1, 'it');
  assert.equal(cues.length, 1);
  assert.equal(cues[0].translations.it, 'Ciao, mondo');

  const exported = exportCsv({ cues, activeLanguage: 'it' }, 'it');
  assert.match(exported, /"Ciao, mondo"/);
});

test('project normalization adds schema metadata', () => {
  const project = normalizeProject({ title: 'Demo', cues: [{ original: 'Test' }] });
  assert.equal(project.schemaVersion, 1);
  assert.equal(project.activeLanguage, 'it');
  assert.equal(project.cues[0].renderStyle, 'normal');
});

import { getContrastRatio } from '../src/utils/textCheck.js';

test('contrast ratio between text and background', () => {
  assert.equal(getContrastRatio('#ffffff', '#000000'), 21);
  assert.equal(getContrastRatio('#000000', '#000000'), 1);
});


import { clampTransitionMs, getPublicSettings, updateActiveScreenSettings } from '../src/utils/screenSettings.js';

test('projection transition settings are normalized and bounded', () => {
  assert.equal(clampTransitionMs('200'), 200);
  assert.equal(clampTransitionMs('-10', 120), 0);
  assert.equal(clampTransitionMs('5000', 120), 1200);

  const settings = updateActiveScreenSettings({}, {
    publicFadeInMs: 260,
    publicFadeOutMs: 180,
    publicBlackoutFadeMs: 320,
  });
  const publicSettings = getPublicSettings(settings);

  assert.equal(publicSettings.publicFadeInMs, 260);
  assert.equal(publicSettings.publicFadeOutMs, 180);
  assert.equal(publicSettings.publicBlackoutFadeMs, 320);
});
