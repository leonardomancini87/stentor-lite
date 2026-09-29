import test from 'node:test';
import assert from 'node:assert/strict';

import {
  extractParagraphsFromDocumentXml,
  parseTheatreScriptText,
} from '../src/utils/wordScriptImport.js';

test('estrae paragrafi dal document.xml Word preservando tab e testo', () => {
  const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body><w:p><w:r><w:t>GLAMISS</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>Buongiorno.</w:t></w:r></w:p></w:body></w:document>`;
  assert.deepEqual(extractParagraphsFromDocumentXml(xml), ['GLAMISS\tBuongiorno.']);
});

test('riconosce voci, battute, marcatori e didascalie da un copione teatrale', () => {
  const result = parseTheatreScriptText([
    'Scena: un campo.',
    'Glamiss e Candor entrano da lati opposti.',
    'Glamiss \t(girandosi verso Candor): Buongiorno.',
    'Candor\t(girandosi verso Glamiss): Buongiorno. [Bong]',
    'Si rivolgono al pubblico.',
    'LADY DUNCAN Candor è stato sconfitto?',
  ], { language: 'it' });

  assert.equal(result.cues.length, 6);
  assert.equal(result.cues[0].type, 'marker');
  // Stage directions remain intact, but are not fictitious voices.
  assert.equal(result.cues[1].speaker, '');
  assert.equal(result.cues[2].speaker, 'Glamiss');
  assert.equal(result.cues[3].speaker, 'Candor');
  assert.equal(result.cues[4].speaker, '');
  assert.equal(result.cues[5].speaker, 'LADY DUNCAN');
  assert.equal(result.stats.dialogue, 3);
  assert.ok(result.characters.includes('Glamiss'));
  assert.ok(result.characters.includes('LADY DUNCAN'));
  assert.ok(!result.characters.includes('Glamiss e Candor'));
});
