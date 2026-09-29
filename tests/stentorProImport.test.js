import test from 'node:test';
import assert from 'node:assert/strict';
import { convertStentorProProject, isStentorProProject } from '../src/utils/stentorProImport.js';
import { normalizeProject } from '../src/utils/projectSchema.js';

// Forma di un .stn come lo scrive Sténtor Pro (JSONEncoder di StentorProject).
const tenoreId = '5B0B9E0C-0000-4000-8000-000000000001';
const stn = {
  title: 'Il Matrimonio',
  subtitle: 'Tan Tan Teatro',
  languages: ['Italiano', 'Inglese'],
  projectLanguages: [
    { code: 'it', name: 'Italiano', isEnabled: true, isPrimary: true, isAccessibleVariant: false },
    { code: 'en', name: 'Inglese', isEnabled: true, isPrimary: false, isAccessibleVariant: false },
    { code: 'fr', name: 'Francese', isEnabled: false, isPrimary: false, isAccessibleVariant: false },
  ],
  primaryLanguageCode: 'it',
  characters: [{ id: tenoreId, baseName: 'Enrico', localizedNames: { values: { it: 'Enrico', en: 'Henry' } }, accessibleColorHex: '#FFFFFF' }],
  lines: [
    { id: 'a', number: 1, lineType: 'marker', character: 'MARCATORE', italian: 'Atto primo', english: '', french: '', operatorNote: '', audioDescription: '', texts: { values: { it: 'Atto primo' } }, characterNames: { values: {} }, audioDescriptions: { values: {} }, textStyles: { values: {} } },
    { id: 'b', number: 2, lineType: 'ad', character: '', italian: '', english: '', french: '', operatorNote: '', audioDescription: 'Benvenuti', texts: { values: {} }, characterNames: { values: {} }, audioDescriptions: { values: { it: 'Benvenuti' } }, textStyles: { values: {} } },
    { id: 'c', number: 3, lineType: 'cue', characterID: tenoreId, character: 'Enrico', italian: 'Assurdo soffitto...', english: 'Absurd ceiling...', french: '', operatorNote: 'Luce fredda', audioDescription: '', texts: { values: { it: 'Assurdo soffitto...', en: 'Absurd ceiling...' } }, characterNames: { values: { it: 'Enrico' } }, audioDescriptions: { values: {} }, textStyles: { values: {} } },
    { id: 'd', number: 4, lineType: 'blackout', character: '', italian: '', english: '', french: '', operatorNote: '', audioDescription: '', texts: { values: {} }, characterNames: { values: {} }, audioDescriptions: { values: {} }, textStyles: { values: {} } },
    { id: 'e', number: 5, lineType: 'music', character: '', italian: 'Musica', english: '', french: '', operatorNote: '', audioDescription: '', texts: { values: {} }, characterNames: { values: {} }, audioDescriptions: { values: {} }, textStyles: { values: {} } },
    { id: 'f', number: 6, character: 'Enrico', italian: 'Vecchio formato', english: 'Old format', french: '', operatorNote: '' },
  ],
  screens: [],
  audienceMobileSettings: {},
  cloudLocation: { kind: 'local' },
};

test('stn: riconosce un progetto Sténtor Pro e non un progetto Lite', () => {
  assert.equal(isStentorProProject(stn), true);
  assert.equal(isStentorProProject({ cues: [], languages: ['it'] }), false);
  assert.equal(isStentorProProject(null), false);
});

test('stn: converte lingue attive, battute, personaggi, note, marcatori e neri', () => {
  const { project, summary } = convertStentorProProject(stn, 'Il Matrimonio.stn');
  assert.equal(project.title, 'Il Matrimonio');
  assert.deepEqual(project.languages, ['it', 'en']);
  assert.equal(project.primaryLanguage, 'it');
  assert.deepEqual(project.languageNames, { it: 'Italiano', en: 'Inglese' });

  const [marker, cue, blackout, legacy] = project.cues;
  assert.equal(marker.type, 'marker');
  assert.equal(marker.markerType, 'act');
  assert.equal(marker.title, 'Atto primo');
  assert.equal(cue.speaker, 'Enrico');
  assert.deepEqual(cue.translations, { it: 'Assurdo soffitto...', en: 'Absurd ceiling...' });
  assert.equal(cue.note, 'Luce fredda');
  assert.deepEqual(blackout.translations, { it: '', en: '' });
  assert.deepEqual(legacy.translations, { it: 'Vecchio formato', en: 'Old format' });
  assert.deepEqual(project.cues.map((c) => c.id), [1, 2, 3, 4]);
  assert.deepEqual(summary.skipped, { audioDescriptions: 1, otherLines: 1 });
});

test('stn: il risultato è un progetto Lite valido', () => {
  const normalized = normalizeProject(convertStentorProProject(stn).project);
  assert.equal(normalized.cues.length, 4);
  assert.equal(normalized.activeLanguage, 'it');
  assert.equal(normalized.company, 'Tan Tan Teatro');
});
