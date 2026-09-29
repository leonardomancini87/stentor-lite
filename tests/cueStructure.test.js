import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { getNextCueId } from '../src/lib/cueOperations.js';
import {
  createCueAfter,
  deleteCueStructural,
  hasOtherLanguageText,
  mergeCueWithNextStructural,
  splitCueAtCursorStructural,
} from '../src/utils/cueStructure.js';
import { normalizeProject } from '../src/utils/projectSchema.js';

function fixture() {
  return normalizeProject({
    id: 'structure-test',
    title: 'Structure',
    languages: ['it', 'en'],
    activeLanguage: 'it',
    primaryLanguage: 'it',
    cues: [
      {
        id: 1,
        speaker: 'CORO',
        original: 'Primo originale.',
        translations: { it: 'Essere o non essere,', en: 'To be or not to be,' },
        note: 'lento',
        startTime: 1,
        endTime: 3,
        renderStyle: 'italic',
        textStyle: { bold: false, align: 'left' },
      },
      {
        id: 2,
        speaker: 'CORO',
        original: 'Secondo originale.',
        translations: { it: 'questo è il problema.', en: 'that is the question.' },
        note: 'sul gesto',
        startTime: 4,
        endTime: 7,
        renderStyle: 'normal',
        textStyle: { bold: true, align: 'right' },
      },
      {
        id: 3,
        speaker: 'NARRATORE',
        original: 'Terzo.',
        translations: { it: 'Terzo.', en: 'Third.' },
        note: '',
        startTime: 8,
        endTime: 10,
        renderStyle: 'normal',
      },
    ],
  });
}

function withMarker() {
  const project = fixture();
  return {
    ...project,
    cues: [
      project.cues[0],
      { id: 10, type: 'marker', markerType: 'scene', title: 'Scena II', speaker: '', translations: { it: '', en: '' }, note: '' },
      ...project.cues.slice(1),
    ],
  };
}

test('structure: new cue is inserted immediately after the selected cue', () => {
  const result = createCueAfter(fixture(), 1);
  assert.equal(result.insertIndex, 1);
  assert.equal(result.project.cues.length, 4);
  assert.equal(result.project.cues[0].id, 1);
  assert.equal(result.project.cues[1].id, result.newCueId);
  assert.equal(result.project.cues[2].id, 2);
});

test('structure: new cue is neutral, empty and contains all project languages', () => {
  const result = createCueAfter(fixture(), 1);
  const cue = result.project.cues[1];
  assert.equal(cue.speaker, '');
  assert.equal(cue.original, '');
  assert.deepEqual(cue.translations, { it: '', en: '' });
  assert.equal(cue.note, '');
  assert.equal(cue.startTime, null);
  assert.equal(cue.endTime, null);
  assert.equal(cue.renderStyle, 'normal');
  assert.equal(cue.textStyle, undefined);
});

test('structure: create does not mutate the source project', () => {
  const project = fixture();
  const before = JSON.stringify(project);
  createCueAfter(project, 1);
  assert.equal(JSON.stringify(project), before);
});

test('structure: legacy string ids still receive a collision-free numeric id', () => {
  assert.equal(getNextCueId([{ id: 'a' }, { id: 'b' }, { id: '7' }]), 8);
  assert.equal(getNextCueId([{ id: 'a' }, { id: 'b' }]), 1);
});

test('structure: delete removes a middle cue', () => {
  const result = deleteCueStructural(fixture(), 2);
  assert.deepEqual(result.project.cues.map(cue => cue.id), [1, 3]);
  assert.equal(result.deletedIndex, 1);
});

test('structure: delete removes first and last normal cues safely', () => {
  assert.deepEqual(deleteCueStructural(fixture(), 1).project.cues.map(c => c.id), [2, 3]);
  assert.deepEqual(deleteCueStructural(fixture(), 3).project.cues.map(c => c.id), [1, 2]);
});

test('structure: delete refuses the only playable cue', () => {
  const project = { ...fixture(), cues: [fixture().cues[0]] };
  const result = deleteCueStructural(project, 1);
  assert.match(result.error, /almeno un sopratitolo/i);
  assert.equal(result.project, project);
});

test('structure: structural delete does not delete markers', () => {
  const project = withMarker();
  const result = deleteCueStructural(project, 10);
  assert.match(result.error, /marcatori/i);
  assert.equal(result.project, project);
});

test('structure: merge joins every language with one space', () => {
  const result = mergeCueWithNextStructural(fixture(), 1);
  const cue = result.project.cues[0];
  assert.equal(cue.translations.it, 'Essere o non essere, questo è il problema.');
  assert.equal(cue.translations.en, 'To be or not to be, that is the question.');
  assert.equal(cue.original, 'Primo originale. Secondo originale.');
  assert.equal(result.project.cues.length, 2);
});

test('structure: merge handles an empty half without extra whitespace', () => {
  const project = fixture();
  project.cues[1] = { ...project.cues[1], translations: { it: '   ', en: '' }, original: '' };
  const cue = mergeCueWithNextStructural(project, 1).project.cues[0];
  assert.equal(cue.translations.it, 'Essere o non essere,');
  assert.equal(cue.translations.en, 'To be or not to be,');
  assert.equal(cue.original, 'Primo originale.');
});

test('structure: merge keeps equal voices and uses the non-empty voice', () => {
  assert.equal(mergeCueWithNextStructural(fixture(), 1).project.cues[0].speaker, 'CORO');
  const project = fixture();
  project.cues[0] = { ...project.cues[0], speaker: '' };
  assert.equal(mergeCueWithNextStructural(project, 1).project.cues[0].speaker, 'CORO');
});

test('structure: merge with two different non-empty voices predictably keeps the first', () => {
  const project = fixture();
  project.cues[1] = { ...project.cues[1], speaker: 'SOPRANO' };
  assert.equal(mergeCueWithNextStructural(project, 1).project.cues[0].speaker, 'CORO');
});

test('structure: merge preserves both operator notes', () => {
  assert.equal(mergeCueWithNextStructural(fixture(), 1).project.cues[0].note, 'lento · sul gesto');
  const project = fixture();
  project.cues[0] = { ...project.cues[0], note: '' };
  assert.equal(mergeCueWithNextStructural(project, 1).project.cues[0].note, 'sul gesto');
});

test('structure: merge keeps first cue style and timing', () => {
  const first = fixture().cues[0];
  const merged = mergeCueWithNextStructural(fixture(), 1).project.cues[0];
  assert.equal(merged.startTime, first.startTime);
  assert.equal(merged.endTime, first.endTime);
  assert.equal(merged.renderStyle, first.renderStyle);
  assert.deepEqual(merged.textStyle, first.textStyle);
});

test('structure: merge with next is blocked at a marker boundary', () => {
  const result = mergeCueWithNextStructural(withMarker(), 1);
  assert.match(result.error, /marcatore/i);
});

test('structure: merge is disabled by data rules on the last cue', () => {
  const result = mergeCueWithNextStructural(fixture(), 3);
  assert.match(result.error, /successivi/i);
});

test('structure: split uses the exact cursor position and preserves punctuation', () => {
  const text = 'Essere o non essere, questo è il problema.';
  const cursor = text.indexOf(' questo');
  const project = fixture();
  project.cues[0] = { ...project.cues[0], translations: { ...project.cues[0].translations, it: text } };
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].translations.it, 'Essere o non essere,');
  assert.equal(result.project.cues[1].translations.it, 'questo è il problema.');
});

test('structure: split at the start produces an empty first half', () => {
  const text = 'Testo intero';
  const project = fixture();
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 0, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].translations.it, '');
  assert.equal(result.project.cues[1].translations.it, text);
});

test('structure: split at the end produces an empty second half', () => {
  const text = 'Testo intero';
  const project = fixture();
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: text.length, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].translations.it, text);
  assert.equal(result.project.cues[1].translations.it, '');
});

test('structure: split copies voice and style to both halves', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'first' });
  const [first, second] = result.project.cues;
  assert.equal(first.speaker, 'CORO');
  assert.equal(second.speaker, 'CORO');
  assert.equal(second.renderStyle, first.renderStyle);
  assert.deepEqual(second.textStyle, first.textStyle);
});

test('structure: split keeps the note only on the first half', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].note, 'lento');
  assert.equal(result.project.cues[1].note, '');
});

test('structure: split preserves original timing only on the first half', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].startTime, 1);
  assert.equal(result.project.cues[0].endTime, 3);
  assert.equal(result.project.cues[1].startTime, null);
  assert.equal(result.project.cues[1].endTime, null);
});

test('structure: split can keep untouched languages entirely in the first half', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'first' });
  assert.equal(result.project.cues[0].translations.en, 'To be or not to be,');
  assert.equal(result.project.cues[1].translations.en, '');
});

test('structure: split can move untouched languages entirely to the second half', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const result = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'second' });
  assert.equal(result.project.cues[0].translations.en, '');
  assert.equal(result.project.cues[1].translations.en, 'To be or not to be,');
});

test('structure: source original follows the selected untouched-language side when it differs from edited text', () => {
  const project = fixture();
  const text = project.cues[0].translations.it;
  const first = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'first' }).project.cues;
  assert.equal(first[0].original, 'Primo originale.');
  assert.equal(first[1].original, '');
  const second = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 7, fullText: text, otherLanguagesTarget: 'second' }).project.cues;
  assert.equal(second[0].original, '');
  assert.equal(second[1].original, 'Primo originale.');
});

test('structure: source original is split too when it is the edited text', () => {
  const project = fixture();
  const text = 'Uno due';
  project.cues[0] = { ...project.cues[0], original: text, translations: { ...project.cues[0].translations, it: text } };
  const cues = splitCueAtCursorStructural({ project, cueId: 1, language: 'it', cursor: 3, fullText: text, otherLanguagesTarget: 'first' }).project.cues;
  assert.equal(cues[0].original, 'Uno');
  assert.equal(cues[1].original, 'due');
});

test('structure: split is blocked on markers', () => {
  const project = withMarker();
  const result = splitCueAtCursorStructural({ project, cueId: 10, language: 'it', cursor: 0, fullText: '', otherLanguagesTarget: 'first' });
  assert.match(result.error, /marcatore/i);
});

test('structure: split rejects an invalid cursor rather than guessing', () => {
  const result = splitCueAtCursorStructural({ project: fixture(), cueId: 1, language: 'it', cursor: null, fullText: 'abc', otherLanguagesTarget: 'first' });
  assert.match(result.error, /cursore/i);
});

test('structure: detects content in other languages before multilingual split', () => {
  assert.equal(hasOtherLanguageText(fixture(), 1, 'it'), true);
  const project = fixture();
  project.cues[0] = { ...project.cues[0], translations: { it: 'Italiano', en: '   ' } };
  assert.equal(hasOtherLanguageText(project, 1, 'it'), false);
});

// Ensure the structural editor is exposed as one compact, always-visible toolbar.
const filename = new URL('../src/components/CueStructuralToolbar.jsx', import.meta.url);
const { outputText, diagnostics } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  fileName: filename.pathname,
  reportDiagnostics: true,
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
assert.equal(diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const moduleCode = outputText
  .replace(/from "react\/jsx-runtime"/g, `from ${JSON.stringify(import.meta.resolve('react/jsx-runtime'))}`)
  .replace(/from 'lucide-react'/g, `from ${JSON.stringify(import.meta.resolve('lucide-react'))}`)
  .replace(/from ['"](\.\.?\/[^'"]+)['"]/g, (match, spec) => `from ${JSON.stringify(new URL(spec, filename).href)}`);
const { default: CueStructuralToolbar } = await import(`data:text/javascript;base64,${Buffer.from(moduleCode).toString('base64')}`);

test('structure UI: toolbar exposes add, split, merge and delete in order', () => {
  const html = renderToStaticMarkup(React.createElement(CueStructuralToolbar, {
    onAddAfter() {}, onSplit() {}, onMergeNext() {}, onDelete() {},
    canAddAfter: true, canSplit: true, canMergeNext: true, canDelete: true,
  }));
  assert.equal((html.match(/<button/g) || []).length, 4);
  const labels = [
    'Aggiungi sopratitolo dopo',
    'Dividi sopratitolo',
    'Unisci con il sopratitolo successivo',
    'Elimina sopratitolo',
  ];
  let previous = -1;
  for (const label of labels) {
    const index = html.indexOf(`aria-label="${label}"`);
    assert.ok(index > previous, `${label} should appear in toolbar order`);
    previous = index;
  }
  assert.ok(!html.includes('Azioni sopratitolo'));
});

test('structure UI: toolbar keeps invalid structural actions visible but disabled', () => {
  const html = renderToStaticMarkup(React.createElement(CueStructuralToolbar, {
    canAddAfter: true, canSplit: false, canMergeNext: false, canDelete: false,
  }));
  assert.equal((html.match(/<button/g) || []).length, 4);
  assert.equal((html.match(/disabled=""/g) || []).length, 3);
  assert.ok(html.includes('title="Dividi"'));
  assert.ok(html.includes('title="Unisci con successiva"'));
});

test('structure UI: merge icon communicates convergence without a link-chain icon', () => {
  const html = renderToStaticMarkup(React.createElement(CueStructuralToolbar, {
    canAddAfter: true, canSplit: true, canMergeNext: true, canDelete: true,
  }));
  assert.ok(html.includes('M4 7h3'));
  assert.ok(html.includes('M12 12h8'));
  assert.ok(html.includes('m17 9 3 3-3 3'));
});
