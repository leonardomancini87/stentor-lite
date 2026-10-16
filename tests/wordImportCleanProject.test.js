import test from 'node:test';
import assert from 'node:assert/strict';

import { importWordScriptAsProject } from '../src/utils/wordScriptImport.js';
import { createBlankProject } from '../src/utils/projectFiles.js';

// ZIP minimale non compresso con il solo word/document.xml: basta per l'importazione Word.
function docxBytes(xml) {
  const name = Buffer.from('word/document.xml');
  const body = Buffer.from(xml);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4);
  local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6);
  central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(name.length, 28);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12); end.writeUInt32LE(local.length + name.length + body.length, 16);
  const bytes = Buffer.concat([local, name, body, central, name, end]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}

const macbethXml = '<w:document xmlns:w="x"><w:body>'
  + '<w:p><w:r><w:t>MACBETH: So foul and fair a day I have not seen.</w:t></w:r></w:p>'
  + '<w:p><w:r><w:t>BANQUO: How far is\'t call\'d to Forres?</w:t></w:r></w:p>'
  + '</w:body></w:document>';

const macbethDocx = { name: 'Macbeth.docx', arrayBuffer: async () => docxBytes(macbethXml) };

// Progetto aperto prima dell'importazione: Hamlet, con tutti i dati che identificano lo spettacolo.
function hamletProject() {
  const blank = createBlankProject('Hamlet');
  return {
    ...blank,
    id: 'project-hamlet',
    title: 'Hamlet',
    author: 'William Shakespeare',
    authorName: 'William Shakespeare',
    projectAuthor: 'William Shakespeare',
    company: 'Compagnia del Globo',
    coverImage: 'data:image/jpeg;base64,AAAA',
    coverImageName: 'hamlet.jpg',
    performances: [{ date: '2026-10-01', durationMs: 7200000 }],
    archived: true,
    archivedAt: 1760000000000,
    savedAt: 1760000000000,
    languages: ['en', 'it', 'fr'],
    activeLanguage: 'en',
    primaryLanguage: 'en',
    languageNames: { en: 'English', it: 'Italiano', fr: 'Français' },
    settings: {
      ...blank.settings,
      publicFontSize: 64,
      cards: [{ id: 'intervallo', text: 'Intervallo — Hamlet' }],
      screens: (blank.settings.screens || [{ id: 'schermo-1' }]).map((screen) => ({
        ...screen, publicLanguage: 'it', publicSecondLanguage: 'fr',
      })),
    },
    cues: [{ id: 1, speaker: 'HAMLET', original: '', translations: { en: 'To be, or not to be.', it: 'Essere o non essere.' } }],
  };
}

test('importazione Word: il nuovo progetto non eredita nulla dello spettacolo aperto', async () => {
  const base = hamletProject();
  const { project, summary } = await importWordScriptAsProject(macbethDocx, base);

  assert.equal(project.title, 'Macbeth');
  assert.equal(summary.title, 'Macbeth');
  assert.notEqual(project.id, base.id);

  // Dati che identificano lo spettacolo.
  assert.equal(project.author, '');
  assert.equal(project.authorName, undefined);
  assert.equal(project.projectAuthor, undefined);
  assert.equal(project.company, '');
  assert.equal(project.coverImage, '');
  assert.equal(project.coverImageName, '');
  assert.deepEqual(project.performances, []);
  assert.equal(project.archived, false);
  assert.equal(project.archivedAt, null);
  assert.equal(project.savedAt, null);
  assert.equal(project.settings.cards, undefined);

  // Lingue: solo quella del copione (la lingua di lavoro del progetto aperto, l'inglese).
  assert.deepEqual(project.languages, ['en']);
  assert.equal(project.primaryLanguage, 'en');
  assert.equal(project.activeLanguage, 'en');
  assert.deepEqual(project.languageNames, { en: 'English' });

  // Battute: solo quelle del copione, nessuna di Hamlet.
  assert.equal(project.cues.length, 2);
  assert.ok(project.cues.every((cue) => !Object.values(cue.translations).some((text) => /Essere|To be/.test(text))));
  assert.ok(project.cues.every((cue) => Object.keys(cue.translations).every((code) => code === 'en')));

  // Restano le impostazioni di visualizzazione; gli schermi non puntano a lingue che non ci sono.
  assert.equal(project.settings.publicFontSize, 64);
  for (const screen of project.settings.screens) {
    assert.equal(screen.publicLanguage, 'active');
    assert.equal(screen.publicSecondLanguage, '');
  }

  // Nessun valore del progetto aperto che identifichi lo spettacolo compare nel nuovo progetto.
  const serialized = JSON.stringify(project);
  for (const value of ['Hamlet', 'Shakespeare', 'Globo', 'hamlet.jpg', 'base64,AAAA', 'Italiano', 'Français', '2026-10-01']) {
    assert.ok(!serialized.includes(value), `il progetto importato contiene ancora «${value}»`);
  }

  // Il progetto aperto non viene modificato.
  assert.equal(base.title, 'Hamlet');
  assert.equal(base.coverImage, 'data:image/jpeg;base64,AAAA');
});

test('importazione Word: senza lingue note il copione resta in italiano', async () => {
  const { project } = await importWordScriptAsProject(macbethDocx, {});
  assert.deepEqual(project.languages, ['it']);
  assert.deepEqual(project.languageNames, { it: 'Italiano' });
});
