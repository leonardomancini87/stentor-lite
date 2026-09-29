import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { normalizeVoice, getUniqueVoices, getVoiceCounts, renameCueVoice, renameVoice, planVoiceChange, applyVoiceChange } from '../src/utils/cueVoices.js';
import { useCueActions } from '../src/hooks/useCueActions.js';
import { addCue } from '../src/utils/subtitleActions.js';
import { createBlankProject, readProjectFile, writeProjectFileHandle } from '../src/utils/projectFiles.js';
import { parseSrt, parseVtt, parseCsv, exportCsv } from '../src/utils/subtitleExchange.js';
import { importFileAsProject } from '../src/utils/fileImport.js';
import { normalizeProject } from '../src/utils/projectSchema.js';
import { buildProjectionPayload } from '../src/utils/projectionTargets.js';
import { VOICE_MESSAGES, voiceMessage } from '../src/utils/voiceMessages.js';
import { APP_LANGUAGES } from '../src/utils/appLanguage.js';

function fixture() {
  return normalizeProject({ id: 'voices', languages: ['it', 'en'], cues: [
    { id: 'a', speaker: 'SOPRANO', translations: { it: 'Testo A', en: 'Text A' }, note: 'Regia', startTime: 1, endTime: 2, renderStyle: 'italic', textStyle: { bold: false } },
    { id: 'b', speaker: ' SOPRANO ', translations: { it: 'Testo B' } },
    { id: 'c', speaker: 'SOPRANO I' },
    { id: 'd', speaker: 'Soprano' },
    { id: 'e', speaker: '' },
    { id: 'f', speaker: '  ' },
    { id: 'marker', type: 'marker', speaker: 'SOPRANO' },
  ] });
}

function actionsHarness(initial, choice = async () => 'single') {
  let current = initial;
  let updates = 0;
  let request = null;
  let actions;
  function Harness() {
    actions = useCueActions({ project: current, language: 'it', activeIndex: 0,
      activeTextareaRef: { current: null }, setActiveIndex() {},
      setProject(updater) { const next = updater(current); if (next !== current) updates += 1; current = next; },
      dialogs: { async choice(config) { request = config; return choice(config); } } });
    return null;
  }
  renderToString(React.createElement(Harness));
  return { actions, current: () => current, updates: () => updates, request: () => request, replace: (next) => { current = next; } };
}

test('voices: normalization trims only edges and preserves case/internal spaces', () => {
  assert.equal(normalizeVoice('  Voce  fuori campo  '), 'Voce  fuori campo');
  assert.equal(normalizeVoice(null), '');
  assert.equal(normalizeVoice(undefined), '');
});
test('voices: suggestions are unique, sorted and marker/empty free', () => {
  assert.deepEqual(getUniqueVoices(fixture().cues), ['Soprano', 'SOPRANO', 'SOPRANO I']);
  assert.deepEqual(getUniqueVoices([]), []);
});
test('voices: counts match trimmed, case-sensitive, non-marker identity', () => {
  assert.equal(getVoiceCounts(fixture().cues).find(({ voice }) => voice === 'SOPRANO').count, 2);
});
test('voices: single rename is immutable and affects only the chosen cue', () => {
  const original = fixture();
  const next = renameCueVoice(original, 'a', 'SOPRANO II');
  assert.equal(next.cues[0].speaker, 'SOPRANO II');
  assert.equal(original.cues[0].speaker, 'SOPRANO');
  assert.equal(next.cues[1], original.cues[1]);
  assert.equal(next.cues[0].translations, original.cues[0].translations);
  assert.equal(next.cues[0].textStyle, original.cues[0].textStyle);
  assert.equal(next.cues[0].startTime, 1);
});
test('voices: global rename never matches prefixes, different case or markers', () => {
  const original = fixture();
  const next = renameVoice(original, ' SOPRANO ', ' CORO ');
  assert.deepEqual(next.cues.map((cue) => cue.speaker), ['CORO', 'CORO', 'SOPRANO I', 'Soprano', '', '  ', 'SOPRANO']);
  assert.equal(original.cues[1].speaker, ' SOPRANO ');
});
test('voices: global removal clears exactly the matching voices', () => {
  const next = renameVoice(fixture(), 'SOPRANO', '   ');
  assert.equal(next.cues[0].speaker, ''); assert.equal(next.cues[1].speaker, '');
  assert.equal(next.cues[6].speaker, 'SOPRANO');
});
test('voices: no-op trim does not create a history item', () => {
  const original = fixture();
  assert.equal(renameCueVoice(original, 'a', ' SOPRANO '), original);
  assert.equal(renameVoice(original, ' SOPRANO ', 'SOPRANO'), original);
  assert.equal(planVoiceChange(original, 'a', ' SOPRANO '), null);
});
test('voices: cannot rename markers or assign a shared empty pseudo-voice', () => {
  const original = fixture();
  assert.equal(renameCueVoice(original, 'marker', 'CORO'), original);
  assert.equal(renameVoice(original, '', 'CORO'), original);
  assert.equal(planVoiceChange(original, 'marker', 'CORO'), null);
});
test('voices: adding a previously empty voice changes only that cue', () => {
  const original = fixture();
  const plan = planVoiceChange(original, 'e', 'NUOVA VOCE');
  assert.equal(plan.needsChoice, false);
  const next = applyVoiceChange(original, plan, 'all');
  assert.equal(next.cues[4].speaker, 'NUOVA VOCE');
  assert.equal(next.cues[5], original.cues[5]);
});
test('voices: shared voices require a choice; unique voices do not', () => {
  assert.equal(planVoiceChange(fixture(), 'a', 'CORO').count, 2);
  assert.equal(planVoiceChange(fixture(), 'a', '').needsChoice, true);
  assert.equal(planVoiceChange(fixture(), 'c', 'CORO').needsChoice, false);
});
test('voices: cancel or an invalid scope returns the original project', () => {
  const original = fixture();
  assert.equal(applyVoiceChange(original, planVoiceChange(original, 'a', 'CORO'), null), original);
});
test('voices: stale dialogs cannot update a switched project or changed voice', () => {
  const original = fixture(); const change = planVoiceChange(original, 'a', 'CORO');
  const other = { ...original, id: 'other' };
  assert.equal(applyVoiceChange(other, change, 'all'), other);
  const changed = renameCueVoice(original, 'a', 'TENORE');
  assert.equal(applyVoiceChange(changed, change, 'all'), changed);
});
test('voices: a stale global count cannot silently rename new matching cues', () => {
  const original = fixture(); const change = planVoiceChange(original, 'a', 'CORO');
  const changed = { ...original, cues: [...original.cues, { id: 'extra', speaker: 'SOPRANO' }] };
  assert.equal(applyVoiceChange(changed, change, 'all'), changed);
});
test('voices: suggestions automatically follow a rename into an existing voice', () => {
  const next = renameVoice(fixture(), 'SOPRANO', 'SOPRANO I');
  assert.deepEqual(getUniqueVoices(next.cues), ['Soprano', 'SOPRANO I']);
});
test('voices: smart rename all uses the existing dialog and one transaction', async () => {
  const harness = actionsHarness(fixture(), async () => 'all');
  await harness.actions.changeCueVoice('a', 'SOPRANO II');
  assert.equal(harness.current().cues[0].speaker, 'SOPRANO II');
  assert.equal(harness.current().cues[1].speaker, 'SOPRANO II');
  assert.equal(harness.updates(), 1);
  assert.deepEqual(harness.request().options.map((item) => item.value), ['single', 'all']);
  assert.ok(harness.request().message.includes('2'));
  assert.equal(harness.request().trapFocus, true);
});
test('voices: smart rename single does not update the other shared cue', async () => {
  const harness = actionsHarness(fixture());
  await harness.actions.changeCueVoice('a', 'CORO');
  assert.equal(harness.current().cues[1].speaker, ' SOPRANO ');
});
test('voices: smart rename cancellation leaves all values and history untouched', async () => {
  const original = fixture(); const harness = actionsHarness(original, async () => null);
  await harness.actions.changeCueVoice('a', 'CORO');
  assert.equal(harness.current(), original); assert.equal(harness.updates(), 0);
});
test('voices: unique and empty voices update without a dialog', async () => {
  for (const cueId of ['c', 'e']) {
    const harness = actionsHarness(fixture());
    await harness.actions.changeCueVoice(cueId, 'CORO');
    assert.equal(harness.request(), null); assert.equal(harness.updates(), 1);
  }
});
test('voices: clearing a shared voice uses the removal confirmation', async () => {
  const harness = actionsHarness(fixture(), async () => 'all');
  await harness.actions.changeCueVoice('a', '');
  assert.equal(harness.request().title, 'Rimuovi voce');
  assert.equal(harness.current().cues[1].speaker, '');
});
test('voices: repeated Enter/blur does not open two dialogs', async () => {
  let resolve; let calls = 0;
  const harness = actionsHarness(fixture(), () => { calls += 1; return new Promise((done) => { resolve = done; }); });
  const first = harness.actions.changeCueVoice('a', 'CORO');
  await harness.actions.changeCueVoice('a', 'TENORE');
  assert.equal(calls, 1); assert.equal(harness.updates(), 0);
  resolve('all'); await first;
  assert.equal(harness.updates(), 1);
});
test('voices: confirmation preserves unrelated edits made while waiting', async () => {
  let resolve; const harness = actionsHarness(fixture(), () => new Promise((done) => { resolve = done; }));
  const pending = harness.actions.changeCueVoice('a', 'CORO');
  harness.replace({ ...harness.current(), title: 'New title' });
  resolve('all'); await pending;
  assert.equal(harness.current().title, 'New title');
});
test('voices: both cue creation paths and a blank project use empty speakers', () => {
  const project = createBlankProject();
  assert.equal(project.cues[0].speaker, '');
  assert.equal(addCue(project).cues.at(-1).speaker, '');
  const harness = actionsHarness(project); harness.actions.addCue();
  assert.equal(harness.current().cues[1].speaker, '');
});
test('voices: SRT/VTT/CSV imports without speaker fields stay neutral', () => {
  assert.equal(parseSrt('1\n00:00:01,000 --> 00:00:02,000\nHello.')[0].speaker, '');
  assert.equal(parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello.')[0].speaker, '');
  assert.equal(parseCsv('text\nHello.')[0].speaker, '');
});
test('voices: CSV supports voce and preserves legacy speaker/personaggio columns', () => {
  for (const header of ['speaker', 'voce', 'personaggio']) {
    assert.equal(parseCsv(`${header},text\nSOPRANO,Hello.`)[0].speaker, 'SOPRANO');
  }
});
test('voices: plain text import does not invent a speaker', async () => {
  const { project } = await importFileAsProject({ name: 'script.txt', text: async () => 'Hello.' }, createBlankProject());
  assert.ok(project.cues.every((cue) => cue.speaker === ''));
});
test('voices: old project speaker values are not migrated or erased', async () => {
  const project = await readProjectFile({ text: async () => JSON.stringify({ cues: [{ speaker: 'TESTO' }, { speaker: 'SOPRANO' }, {}] }) });
  assert.deepEqual(project.cues.map((cue) => cue.speaker), ['TESTO', 'SOPRANO', '']);
});
test('voices: save and reopen preserve renamed and empty voices', async () => {
  let bytes; const project = renameVoice(fixture(), 'SOPRANO', '');
  await writeProjectFileHandle({ createWritable: async () => ({ write: async (value) => { bytes = value; }, close: async () => {} }) }, project);
  assert.deepEqual((await readProjectFile({ text: async () => bytes })).cues, project.cues);
});
test('voices: CSV export keeps the existing field name and empty values', () => {
  const project = renameVoice(fixture(), 'SOPRANO', 'CORO');
  const exported = exportCsv(project, 'it');
  assert.ok(exported.startsWith('id,speaker,'));
  const cues = parseCsv(exported);
  assert.equal(cues[0].speaker, 'CORO');
  assert.ok(cues.some((cue) => cue.speaker === ''));
});
test('voices: projection excludes metadata and stays identical after renaming', () => {
  const original = fixture(); const next = renameVoice(original, 'SOPRANO', 'PRIVATE VOICE');
  const payload = (cue) => { const { updatedAt, ...data } = buildProjectionPayload({ cue, screen: { id: 'it', publicLanguage: 'it' } }); return data; };
  assert.deepEqual(payload(next.cues[0]), payload(original.cues[0]));
  assert.equal(JSON.stringify(payload(next.cues[0])).includes('PRIVATE VOICE'), false);
});
test('voices: every supported interface language has all feature strings', () => {
  const keys = Object.keys(VOICE_MESSAGES.it);
  for (const { code } of APP_LANGUAGES) {
    assert.deepEqual(Object.keys(VOICE_MESSAGES[code]), keys);
    const question = voiceMessage(code, 'changeQuestion', { voice: 'MyVoice', count: 18 });
    assert.ok(question.includes('MyVoice')); assert.ok(question.includes('18'));
    assert.equal(question.includes('{voice}'), false);
  }
});
