import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

import { getImportKind, importFileAsProject, parseDelimitedText, tableRowsToCues } from '../src/utils/fileImport.js';
import { createBlankProject } from '../src/utils/projectFiles.js';

// ZIP minimale (compresso con deflate), come i file Office veri.
function zip(files) {
  const locals = []; const centrals = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const nameBytes = Buffer.from(name); const raw = Buffer.from(text); const body = deflateRawSync(raw);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body); centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  const bytes = Buffer.concat([...locals, ...centrals, end]);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
}

function file(name, content) {
  return {
    name,
    text: async () => content,
    arrayBuffer: async () => content,
  };
}

const base = () => ({ ...createBlankProject('Base'), primaryLanguage: 'it', activeLanguage: 'it', languages: ['it'] });

test('file import: formats by extension', () => {
  assert.equal(getImportKind('a.XLSX'), 'table');
  assert.equal(getImportKind('a.csv'), 'table');
  assert.equal(getImportKind('a.pptx'), 'slides');
  assert.equal(getImportKind('a.srt'), 'subtitles');
  assert.equal(getImportKind('a.txt'), 'text');
  assert.equal(getImportKind('a.docx'), 'word');
  assert.equal(getImportKind('a.stn'), 'project');
  assert.equal(getImportKind('a.pdf'), null);
});

test('file import: CSV with semicolons, quotes and a language per column', () => {
  const rows = parseDelimitedText('N;Personaggio;Italiano;Inglese;Note\n1;CORO;"Ciao; mondo";"Hello, world";luce\n2;;ATTO II;ACT II;\n');
  const result = tableRowsToCues(rows, { primaryLanguage: 'it' });
  assert.deepEqual(result.languages.map((item) => item.code), ['it', 'en']);
  assert.equal(result.cues[0].speaker, 'CORO');
  assert.deepEqual(result.cues[0].translations, { it: 'Ciao; mondo', en: 'Hello, world' });
  assert.equal(result.cues[0].note, 'luce');
  assert.equal(result.cues[1].type, 'marker');
  assert.equal(result.cues[1].markerType, 'act');
});

test('file import: table without a header uses the first column as the main language', () => {
  const result = tableRowsToCues([['Prima', 'First'], ['Seconda', 'Second']], { primaryLanguage: 'it', languageLabel: (n) => `L${n}` });
  assert.deepEqual(result.languages, [{ code: 'it', name: null }, { code: 'l2', name: 'L2' }]);
  assert.equal(result.cues[1].translations.l2, 'Second');
});

test('file import: Excel workbook with shared strings, inline strings and line breaks', async () => {
  const xlsx = zip({
    'xl/workbook.xml': '<workbook xmlns:r="r"><sheets><sheet name="Sopratitoli" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': '<sst><si><t>Italiano</t></si><si><t>English</t></si><si><r><t>Primo </t></r><r><t>verso&#10;secondo</t></r></si><si><t>First</t></si></sst>',
    'xl/worksheets/sheet1.xml': '<worksheet><sheetData>'
      + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>'
      + '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2" t="s"><v>3</v></c></row>'
      + '<row r="4"><c r="A4" t="inlineStr"><is><t>Terzo &amp; ultimo</t></is></c></row>'
      + '</sheetData></worksheet>',
  });
  const { project, summary } = await importFileAsProject(file('Tosca.xlsx', xlsx), base());
  assert.equal(project.title, 'Tosca');
  assert.deepEqual(project.languages, ['it', 'en']);
  assert.equal(project.cues[0].translations.it, 'Primo verso\nsecondo');
  assert.equal(project.cues[0].translations.en, 'First');
  assert.equal(project.cues[1].translations.it, 'Terzo & ultimo');
  assert.equal(summary.cues, 2);
});

test('file import: PowerPoint slides in presentation order, one cue each, without slide numbers', async () => {
  const slide = (text, extra = '') => `<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>${extra}</p:spTree></p:cSld></p:sld>`;
  const pptx = zip({
    'ppt/presentation.xml': '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId4"/></p:sldIdLst></p:presentation>',
    'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="rId2" Target="slides/slide1.xml"/><Relationship Id="rId3" Target="slides/slide2.xml"/><Relationship Id="rId4" Target="slides/slide3.xml"/></Relationships>',
    'ppt/slides/slide1.xml': slide('Seconda', '<p:sp><p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:fld type="slidenum"><a:t>2</a:t></a:fld></a:p></p:txBody></p:sp>'),
    'ppt/slides/slide2.xml': '<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Prima riga</a:t></a:r><a:br/><a:r><a:t>seconda riga</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
    'ppt/slides/slide3.xml': '<p:sld><p:cSld><p:spTree></p:spTree></p:cSld></p:sld>',
  });
  const { project, summary } = await importFileAsProject(file('opera.pptx', pptx), base());
  assert.deepEqual(project.cues.map((cue) => cue.translations.it), ['Prima riga\nseconda riga', 'Seconda', '']);
  assert.equal(summary.kind, 'slides');
});

test('file import: SRT keeps the timings', async () => {
  const srt = '1\n00:00:01,000 --> 00:00:02,500\nCiao\n\n2\n00:00:03,000 --> 00:00:04,000\nMondo\n';
  const { project, summary } = await importFileAsProject(file('prova.srt', srt), base());
  assert.equal(project.cues.length, 2);
  assert.equal(project.cues[0].startTime, 1);
  assert.equal(project.cues[0].endTime, 2.5);
  assert.equal(summary.timed, true);
});

test('file import: plain text is read as a script', async () => {
  const { project } = await importFileAsProject(file('copione.txt', 'ATTO I\nMARIA: Buongiorno.\nUna didascalia.'), base());
  assert.equal(project.cues[0].type, 'marker');
  assert.equal(project.cues[1].speaker, 'MARIA');
  assert.equal(project.cues[1].translations.it, 'Buongiorno.');
});

test('file import: a file without text is refused', async () => {
  await assert.rejects(importFileAsProject(file('vuoto.csv', 'Italiano\n\n'), base()), (error) => error.code === 'empty');
});
