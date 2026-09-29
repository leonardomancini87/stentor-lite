import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeProject } from '../src/utils/projectSchema.js';
import { saveProject, loadProject } from '../src/utils/projectPersistence.js';
import { writeProjectFileHandle, readProjectFile } from '../src/utils/projectFiles.js';

function legacyTimedProject() {
  return normalizeProject({
    id: 'legacy-timing',
    title: 'Legacy timing',
    languages: ['it'],
    activeLanguage: 'it',
    primaryLanguage: 'it',
    cues: [
      { id: 1, translations: { it: 'Prima' }, startTime: 1.25, endTime: 3.5 },
      { id: 2, translations: { it: 'Seconda' }, startTime: 4.0, endTime: 7.75 },
    ],
  });
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
  };
}

test('lite manual live: editor UI has no timing panel or automatic playback control', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.equal(source.includes('className="liteRegiaTimingPanel"'), false);
  assert.equal(source.includes('Riproduzione automatica</span>'), false);
  // I testi passano dalle chiavi di traduzione (src/i18n).
  assert.match(source, /<span>\{ui\('conductor\.back'\)\}<\/span>/);
  assert.match(source, /<span>\{ui\('conductor\.next'\)\}<\/span>/);
  assert.match(source, /ui\('conductor\.goTo\.label'\)/);
  assert.match(source, /ui\('conductor\.goTo\.placeholder'\)/);
  assert.match(source, /ui\('conductor\.blackout'\)/);
  assert.match(source, /aria-label=\{ui\('rightColumn\.aria'\)\}/);
});

test('lite manual live: blackout preview is truly blank', () => {
  const source = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const projectedText = blackout\s*\? ''\s*:/);
  assert.equal(source.includes("? 'Schermo vuoto'"), false);
});

test('lite manual live: keyboard shortcuts no longer expose timing controls', () => {
  const source = readFileSync(new URL('../src/hooks/useKeyboardShortcuts.js', import.meta.url), 'utf8');
  assert.equal(source.includes('toggleSemiAuto'), false);
  assert.equal(source.includes('startTimelineHere'), false);
  assert.equal(source.includes('resetAllTiming'), false);
  assert.equal(source.includes('toggleTimingRecording'), false);
  assert.equal(source.includes("event.key.toLowerCase() === 'p'"), false);
  assert.equal(source.includes("event.key.toLowerCase() === 'r'"), false);
  assert.equal(source.includes("event.key.toLowerCase() === 't'"), false);
});

test('lite manual live: legacy timing survives local autosave-style persistence and reload', () => {
  globalThis.localStorage = memoryStorage();
  const project = legacyTimedProject();
  saveProject({ ...project, title: 'Modificato senza toccare i tempi' });
  const reopened = loadProject();
  assert.equal(reopened.cues[0].startTime, 1.25);
  assert.equal(reopened.cues[0].endTime, 3.5);
  assert.equal(reopened.cues[1].startTime, 4.0);
  assert.equal(reopened.cues[1].endTime, 7.75);
});

test('lite manual live: legacy timing survives file export and reopen', async () => {
  const project = legacyTimedProject();
  let bytes = '';
  const handle = {
    createWritable: async () => ({
      write: async (value) => { bytes = value; },
      close: async () => {},
    }),
  };
  await writeProjectFileHandle(handle, project);
  const reopened = await readProjectFile({ text: async () => bytes });
  assert.deepEqual(
    reopened.cues.map(({ startTime, endTime }) => ({ startTime, endTime })),
    [{ startTime: 1.25, endTime: 3.5 }, { startTime: 4, endTime: 7.75 }],
  );
});

test('lite manual live: Tools checks do not expose timing completeness or CPS', () => {
  const source = readFileSync(new URL('../src/components/ToolsCard.jsx', import.meta.url), 'utf8')
    + readFileSync(new URL('../src/utils/textCheck.js', import.meta.url), 'utf8');
  assert.equal(source.includes('Tempi assenti o incompleti'), false);
  assert.equal(source.includes('missingTiming'), false);
  assert.equal(source.includes('car./s'), false);
  assert.match(source, /getSubtitleStats\(text, null\)/);
});
