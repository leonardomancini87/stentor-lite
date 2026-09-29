import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseTheatreScriptText as parse, parseDocxTheatreScript } from '../src/utils/wordScriptImport.js';

for (const separator of [': ', '\t', '    ', ' - ', ' \u2014 ']) {
  test(`word voices: generic label and explicit separator ${JSON.stringify(separator)}`, () => {
    const result = parse(`AMLETO${separator}Essere o non essere...`);
    assert.equal(result.cues[0].speaker, 'AMLETO');
    assert.equal(result.cues[0].original, 'Essere o non essere...');
  });
}
test('word voices: mixed-case names retain their spelling', () => {
  assert.equal(parse('Amleto: Essere o non essere...').cues[0].speaker, 'Amleto');
  assert.equal(parse('Zefiro\tParlo io.').cues[0].speaker, 'Zefiro');
});
test('word voices: standalone labels alternate without a character map', () => {
  const result = parse('AMLETO\nEssere o non essere...\nOFELIA\nMio signore.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['AMLETO', 'OFELIA']);
  assert.equal(result.cues[0].original, 'Essere o non essere...');
});
test('word voices: a repeated standalone label is recognized', () => {
  const result = parse('ASTREA\nVieni qui.\nASTREA\nAscoltami.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['ASTREA', 'ASTREA']);
});
test('word voices: a standalone label with colon is sufficient evidence', () => {
  assert.equal(parse('Amleto:\nEssere o non essere...').cues[0].speaker, 'Amleto');
});
test('word voices: an isolated unknown uppercase title is preserved as text', () => {
  const result = parse('LA NOTTE\nUna storia sulla memoria.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['', '']);
  assert.equal(result.cues[0].original, 'LA NOTTE');
});
test('word voices: an orphan name is never discarded', () => {
  const result = parse('AMLETO');
  assert.equal(result.cues.length, 1);
  assert.equal(result.cues[0].original, 'AMLETO');
  assert.equal(result.cues[0].speaker, '');
});
test('word voices: parenthetical directions before a speech stay neutral', () => {
  const result = parse('CORO\n(Si voltano.)\nLa notte ci ascolta.');
  assert.equal(result.cues[0].speaker, '');
  assert.equal(result.cues[0].original, '(Si voltano.)');
  assert.equal(result.cues[1].speaker, 'CORO');
});
test('word voices: ordinary sentences are never shortened into speakers', () => {
  const lines = ['La notte ascolta le nostre voci.', 'Questa frase non ha un personaggio.', 'NON temere la notte.', 'IL RE entra lentamente.', '(Tutti escono.)'];
  const result = parse(lines);
  assert.deepEqual(result.cues.map((cue) => cue.original), lines);
  assert.ok(result.cues.every((cue) => cue.speaker === ''));
});
test('word voices: headings and markers do not enter the voice suggestions', () => {
  const result = parse(['TITOLO: La notte', 'ATTO I', 'SCENA 2', 'DIDASCALIA: Luci basse.', 'CORO: Ascolta.']);
  assert.deepEqual(result.characters, ['CORO']);
  assert.equal(result.stats.markers, 2);
  assert.equal(result.cues[0].speaker, '');
  assert.equal(result.cues[3].speaker, '');
});
test('word voices: previously established names can precede a later speech', () => {
  const result = parse('Zefiro\tAscolta.\nZefiro Vieni vicino.\nZefiro entra da destra.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['Zefiro', 'Zefiro', '']);
  assert.equal(result.cues[2].original, 'Zefiro entra da destra.');
});
test('word voices: all-caps prefixes remain supported without named characters', () => {
  const result = parse('PRIMA VOCE Torneremo domani.\nNEREIDE Resteremo qui.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['PRIMA VOCE', 'NEREIDE']);
});
test('word voices: Unicode names, apostrophes and hyphens are supported', () => {
  for (const name of ['\u0141ucja', '\u00c9LO\u00cfSE', "D'ARTAGNAN", 'Jean-Luc', 'SOPRANO I']) {
    assert.equal(parse(`${name}: Ciao.`).cues[0].speaker, name);
  }
});
test('word voices: dialogue does not inherit a voice beyond the next paragraph', () => {
  const result = parse('CORO\nCantiamo insieme.\nUna frase senza un nome esplicito.');
  assert.deepEqual(result.cues.map((cue) => cue.speaker), ['CORO', '']);
});
test('word voices: no play-specific vocabulary remains in the parser', async () => {
  const source = await readFile(new URL('../src/utils/wordScriptImport.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /MACBETT|GLAMISS|CANDOR|DUNCAN|BANCO/);
});

// Minimal uncompressed ZIP, exercising the existing real DOCX extraction path.
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
test('word voices: full DOCX import retains text, language and inferred voice', async () => {
  const xml = '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>ASTREA: Ascoltami.</w:t></w:r></w:p><w:p><w:r><w:t>Una frase senza voce.</w:t></w:r></w:p></w:body></w:document>';
  const result = await parseDocxTheatreScript({ arrayBuffer: async () => docxBytes(xml) }, { language: 'en' });
  assert.equal(result.cues[0].speaker, 'ASTREA');
  assert.equal(result.cues[0].translations.en, 'Ascoltami.');
  assert.equal(result.cues[1].speaker, '');
});
