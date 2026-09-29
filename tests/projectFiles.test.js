import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBlankProject,
  getProjectDownloadName,
} from '../src/utils/projectFiles.js';

import { PROJECT_SCHEMA_VERSION } from '../src/utils/projectSchema.js';

test('crea un nuovo progetto Stentore vuoto e normalizzato', () => {
  const project = createBlankProject('Prova nuova');

  assert.equal(project.title, 'Prova nuova');
  assert.equal(project.schemaVersion, PROJECT_SCHEMA_VERSION);
  assert.deepEqual(project.languages, ['it']);
  assert.equal(project.activeLanguage, 'it');
  assert.equal(project.primaryLanguage, 'it');
  assert.equal(project.cues.length, 1);
  assert.equal(project.cues[0].translations.it, '');
});

test('prepara un nome file progetto riconoscibile', () => {
  assert.equal(
    getProjectDownloadName({ title: 'La prova finale' }),
    'La-prova-finale.stentore.json'
  );

  assert.equal(
    getProjectDownloadName({ title: 'gia.stentore.json' }),
    'gia.stentore.json'
  );
});


test('normalizza la lingua principale quando manca o non è valida', async () => {
  const { normalizeProject } = await import('../src/utils/projectSchema.js');
  const project = normalizeProject({
    title: 'Lingue',
    languages: ['it', 'fr'],
    activeLanguage: 'fr',
    primaryLanguage: 'de',
    languageNames: { it: 'Italiano', fr: 'Français' },
    cues: [],
  });

  assert.equal(project.primaryLanguage, 'fr');
});


test('normalizza e conserva autore progetto', async () => {
  const { normalizeProject } = await import('../src/utils/projectSchema.js');
  const project = normalizeProject({
    title: 'Autore',
    company: 'Compagnia',
    author: 'Eugene Ionesco',
    cues: [],
  });

  assert.equal(project.author, 'Eugene Ionesco');
});
