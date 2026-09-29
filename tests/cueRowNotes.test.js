import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { normalizeProject } from '../src/utils/projectSchema.js';
import { updateCue } from '../src/utils/subtitleActions.js';
import { getCueText } from '../src/utils/cueTextStyle.js';
import { buildProjectionPayload } from '../src/utils/projectionTargets.js';
import { readProjectFile, writeProjectFileHandle } from '../src/utils/projectFiles.js';

// Render the actual JSX component with the project's existing TypeScript/React.
// No test-only replacement of the annotation logic, and no new dependency.
const filename = new URL('../src/components/CueRowAnnotation.jsx', import.meta.url);
const { outputText, diagnostics } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename.pathname,
  reportDiagnostics: true,
  compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
  },
});
assert.equal(diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const moduleCode = outputText.replace(/from "react\/jsx-runtime"/g,
  `from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`)
  .replace(/from ['"]react['"]/g, `from ${JSON.stringify(import.meta.resolve('react'))}`)
  .replace(/from ['"](\.\.?\/[^'"]+)['"]/g, (match, spec) => `from ${JSON.stringify(new URL(spec, filename).href)}`);
const { default: CueRowAnnotation } = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`);
const render = (cue, isProjected = false) => renderToStaticMarkup(React.createElement(CueRowAnnotation, { cue, isProjected }));
// Con onEditNote la nota diventa cliccabile per la modifica diretta nella riga.
test('la nota con onEditNote è modificabile con un clic', () => {
  const html = renderToStaticMarkup(React.createElement(CueRowAnnotation, { cue: { note: 'lento' }, onEditNote: () => {} }));
  assert.ok(html.includes('data-editable="true"'));
  assert.ok(html.includes('Clic per modificare la nota'));
  const emptyHtml = renderToStaticMarkup(React.createElement(CueRowAnnotation, { cue: { note: '' }, onEditNote: () => {} }));
  assert.ok(!emptyHtml.includes('data-editable'));
});
const empty = '<span class="liteCueOperatorNote" data-no-translate=""></span>';

function fixture() {
  return normalizeProject({
    id: 'notes-test', title: 'Operator notes', languages: ['it', 'en'], activeLanguage: 'it',
    cues: [
      { id: 'a', speaker: 'CORO', translations: { it: 'Testo A', en: 'Text A' }, note: 'lento' },
      { id: 'b', speaker: 'TENORE', translations: { it: 'Testo B', en: 'Text B' }, note: '' },
    ],
  });
}

test('row notes: non-current cue renders the existing note as plain text with a full title', () => {
  assert.equal(render({ note: 'velocissimo' }), '<span class="liteCueOperatorNote" data-no-translate="" title="velocissimo">velocissimo</span>');
});

test('row notes: no note keeps the annotation slot empty, without a badge or title', () => {
  for (const cue of [undefined, null, {}, { note: null }, { note: undefined }, { note: '' }]) {
    assert.equal(render(cue), empty);
  }
});

test('row notes: whitespace-only notes are visually empty without rewriting the data', () => {
  const cue = Object.freeze({ note: ' \n\t ' });
  assert.equal(render(cue), empty);
  assert.equal(cue.note, ' \n\t ');
});

test('row notes: current cue always keeps the current indicator', () => {
  assert.equal(render({}, true), '<em class="liteCueCurrentBadge">Attuale</em>');
});

test('row notes: current indicator has priority over a note', () => {
  const html = render({ note: 'PRIVATE CURRENT NOTE' }, true);
  assert.equal(html, '<em class="liteCueCurrentBadge">Attuale</em>');
  assert.ok(!html.includes('PRIVATE CURRENT NOTE'));
});

test('row notes: next and queued labels are not generated for any non-current cue', () => {
  for (const cue of [{ note: '' }, { note: 'lento' }, { note: 'sul gesto' }]) {
    const html = render(cue);
    assert.ok(!html.includes('<em'));
    assert.ok(!html.includes('Prossimo'));
    assert.ok(!html.includes('In coda'));
  }
});

test('row notes: multiline and long text is retained in full; truncation belongs to CSS', () => {
  const note = '  Ingresso luci fredde.\nAspettare il gesto del direttore.\n' + 'Non anticipare. '.repeat(50);
  const html = render({ note });
  assert.ok(html.includes(`title="${note}"`));
  assert.ok(html.includes(`>${note}</span>`));
});

test('row notes: malformed legacy values do not crash the compact list', () => {
  for (const note of [true, 17, {}, ['lento']]) assert.equal(render({ note }), empty);
});

test('row notes: operator text is escaped, never interpreted as HTML', () => {
  const html = render({ note: '<script>alert("x")</script> & lento' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&amp; lento'));
});

test('row notes: a literal note matching an interface label remains user text', () => {
  for (const note of ['Prossimo', 'In coda', 'Note operatore', 'Schermo pulito']) {
    const html = render({ note });
    assert.ok(html.includes('data-no-translate=""'));
    assert.ok(html.includes(`>${note}</span>`));
    assert.ok(!html.includes('<em'));
  }
});

test('row notes: only cue.note is used, not a parallel operatorNote field', () => {
  assert.equal(render({ operatorNote: 'not the existing data model' }), empty);
  assert.ok(render({ note: 'real note', operatorNote: 'ignored' }).includes('real note'));
});

test('row notes: rendering never mutates note, text, speaker or timing', () => {
  const cue = Object.freeze({ ...fixture().cues[0], startTime: 3, endTime: 8 });
  const before = JSON.stringify(cue);
  render(cue); render(cue, true);
  assert.equal(JSON.stringify(cue), before);
});

test('row notes: editing the existing note updates the preview without altering other cues', () => {
  const project = fixture();
  const next = updateCue(project, 'b', cue => ({ ...cue, note: 'attendere il direttore' }));
  assert.ok(render(next.cues[1]).includes('attendere il direttore'));
  assert.equal(project.cues[1].note, '');
  assert.equal(next.cues[0], project.cues[0]);
  assert.deepEqual(next.cues[1].translations, project.cues[1].translations);
});

test('row notes: clearing the note empties the same preview slot', () => {
  const next = updateCue(fixture(), 'a', cue => ({ ...cue, note: '' }));
  assert.equal(render(next.cues[0]), empty);
});

test('row notes: operator note never enters projected text or public payload', () => {
  const project = updateCue(fixture(), 'a', cue => ({ ...cue, note: 'PRIVATE STAGE DIRECTION' }));
  for (const language of ['it', 'en']) {
    const cue = project.cues[0];
    const payload = buildProjectionPayload({ cue, screen: { id: 'screen', publicLanguage: language }, activeLanguage: language, languages: project.languages });
    assert.equal(payload.text, getCueText(cue, language));
    assert.ok(!JSON.stringify(payload).includes('PRIVATE STAGE DIRECTION'));
  }
});

test('row notes: save and reopen preserve full note and existing project fields', async () => {
  const project = updateCue(fixture(), 'b', cue => ({ ...cue, note: 'lento\n  sul gesto  ' }));
  let bytes = '';
  await writeProjectFileHandle({ createWritable: async () => ({ write: async value => { bytes = value; }, close: async () => {} }) }, project);
  const reopened = await readProjectFile({ text: async () => bytes });
  assert.deepEqual(reopened.cues, project.cues);
  assert.equal(reopened.cues[1].note, 'lento\n  sul gesto  ');
  assert.ok(render(reopened.cues[1]).includes('lento\n  sul gesto  '));
});
