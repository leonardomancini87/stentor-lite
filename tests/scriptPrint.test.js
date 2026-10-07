import test from 'node:test';
import assert from 'node:assert/strict';

import { buildScriptHtml, getScriptDownloadName } from '../src/utils/scriptPrint.js';

const project = {
  title: 'Antigone <prova>',
  company: 'Compagnia & Co.',
  cues: [
    { id: 'm1', type: 'marker', markerType: 'act', title: 'Prologo' },
    { id: 1, speaker: 'ANTIGONE', translations: { it: 'Ismene, sorella,\n<i>sangue</i> del mio sangue', en: 'Ismene, sister' }, note: 'Alba' },
    { id: 2, speaker: '', translations: { it: 'Seconda battuta' }, note: '' },
  ],
};
const options = { language: 'it', languageName: 'Italiano', date: '6 ottobre 2026', labels: { voice: 'Voce', text: 'Testo', note: 'Nota operatore', print: 'Stampa', cues: '2 battute' } };

test('copione da stampare: numeri, voci, testo su più righe, note e segnalibri', () => {
  const html = buildScriptHtml(project, options);
  assert.match(html, /<h1>Antigone &lt;prova&gt;<\/h1>/);
  assert.match(html, /Compagnia &amp; Co\. · Italiano · 2 battute · 6 ottobre 2026/);
  assert.match(html, /<tr class="section"><td colspan="4">Prologo<\/td><\/tr>/);
  assert.match(html, /<td class="n">001<\/td><td class="voice">ANTIGONE<\/td><td class="text" dir="ltr">Ismene, sorella,<br>sangue del mio sangue<\/td><td class="note">Alba<\/td>/);
  assert.match(html, /<td class="n">002<\/td>/);
  // Il documento sta in piedi da solo: nessun file esterno da caricare.
  assert.equal(/<link|src=|url\(/.test(html), false);
});

test('copione da stampare: lingua scelta, colonna note solo se serve, nome del file', () => {
  const english = buildScriptHtml(project, { ...options, language: 'en', languageName: 'English' });
  assert.match(english, /Ismene, sister/);
  const noNotes = buildScriptHtml({ ...project, cues: project.cues.map((cue) => ({ ...cue, note: '' })) }, options);
  assert.equal(noNotes.includes('class="note"'), false);
  assert.match(noNotes, /colspan="3"/);
  assert.match(buildScriptHtml({ ...project, cues: project.cues }, { ...options, language: 'ar' }), /class="text" dir="rtl"/);
  assert.equal(getScriptDownloadName({ title: 'Così è (se vi pare)' }), 'Così-è-se-vi-pare-copione.html');
  assert.equal(getScriptDownloadName({}), 'copione-copione.html');
});
