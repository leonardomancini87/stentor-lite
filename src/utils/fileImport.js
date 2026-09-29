// Importazione di file esterni come nuovo progetto:
//   - tabelle Excel (.xlsx), CSV e TSV: una riga per battuta, una colonna per lingua;
//   - presentazioni PowerPoint (.pptx): una diapositiva per battuta;
//   - sottotitoli SRT e VTT: un sottotitolo per battuta, con i tempi;
//   - testo semplice (.txt): letto come un copione (PERSONAGGIO: battuta).
// I progetti Sténtor (.json, .stn) e i copioni Word (.docx) hanno i loro percorsi.

import { normalizeProject } from './projectSchema.js';
import { normalizeLanguageCode } from './projectLanguages.js';
import { parseSrt, parseVtt } from './subtitleExchange.js';
import { parseTheatreScriptText } from './wordScriptImport.js';
import { decodeXmlEntities, openZip } from './zipArchive.js';

export const IMPORT_ACCEPT = [
  '.stentore.json', '.json', '.stn', '.docx', '.xlsx', '.csv', '.tsv', '.pptx', '.srt', '.vtt', '.txt',
].join(',');

export function getImportKind(fileName) {
  const name = String(fileName || '').toLowerCase();
  if (/\.(json|stn)$/.test(name)) return 'project';
  if (name.endsWith('.docx')) return 'word';
  if (/\.(xlsx|csv|tsv)$/.test(name)) return 'table';
  if (name.endsWith('.pptx')) return 'slides';
  if (/\.(srt|vtt)$/.test(name)) return 'subtitles';
  if (name.endsWith('.txt')) return 'text';
  return null;
}

// ---------- Lingue riconosciute nelle intestazioni delle colonne ----------

const LANGUAGE_HEADERS = [
  ['it', 'Italiano', ['it', 'ita', 'italiano', 'italian', 'italien', 'italienisch', 'italiano originale']],
  ['en', 'English', ['en', 'eng', 'inglese', 'english', 'anglais', 'englisch', 'ingles', 'ingles']],
  ['fr', 'Français', ['fr', 'fra', 'fre', 'francese', 'francais', 'french', 'franzosisch', 'frances']],
  ['de', 'Deutsch', ['de', 'deu', 'ger', 'tedesco', 'deutsch', 'german', 'allemand', 'aleman']],
  ['es', 'Español', ['es', 'spa', 'spagnolo', 'espanol', 'spanish', 'espagnol', 'spanisch', 'castellano']],
  ['pt', 'Português', ['pt', 'por', 'portoghese', 'portugues', 'portuguese', 'portugais']],
  ['zh', '中文', ['zh', 'cinese', 'chinese', 'chinois', '中文', '简体中文', '繁體中文']],
  ['ar', 'العربية', ['ar', 'arabo', 'arabic', 'arabe', 'العربية']],
  ['ru', 'Русский', ['ru', 'russo', 'russian', 'russe', 'русский']],
  ['ja', '日本語', ['ja', 'giapponese', 'japanese', 'japonais', '日本語']],
  ['hi', 'हिन्दी', ['hi', 'hindi', 'हिन्दी']],
  ['ml', 'മലയാളം', ['ml', 'malayalam', 'മലയാളം']],
  ['la', 'Latino', ['la', 'latino', 'latin']],
  ['ca', 'Català', ['ca', 'catalano', 'catalan', 'catala']],
  ['nl', 'Nederlands', ['nl', 'olandese', 'dutch', 'nederlands']],
  ['pl', 'Polski', ['pl', 'polacco', 'polish', 'polski']],
];

const SPEAKER_HEADERS = ['personaggio', 'personaggi', 'voce', 'ruolo', 'speaker', 'character', 'role', 'personnage', 'rolle', 'figur', 'personaje', 'chi'];
const NOTE_HEADERS = ['nota', 'note', 'notes', 'regia', 'commento', 'commenti', 'comment', 'comments', 'remarque', 'anmerkung'];
const IGNORED_HEADERS = ['n', 'nr', 'no', 'num', 'numero', 'number', '#', 'id', 'cue', 'battuta n', 'inizio', 'fine', 'start', 'end', 'tempo', 'time'];
const ORIGINAL_HEADERS = ['testo', 'text', 'originale', 'original', 'source', 'sorgente', 'sopratitolo', 'sopratitoli', 'sottotitolo', 'surtitle', 'subtitle'];

function simplify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[._:()[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findLanguage(header) {
  const simple = simplify(header);
  if (!simple) return null;
  const words = simple.split(' ');
  for (const [code, name, aliases] of LANGUAGE_HEADERS) {
    if (aliases.some((alias) => simple === simplify(alias))) return { code, name };
  }
  // "Traduzione inglese", "Testo francese", "English translation"…
  for (const [code, name, aliases] of LANGUAGE_HEADERS) {
    if (aliases.some((alias) => simplify(alias).length > 3 && words.includes(simplify(alias)))) return { code, name };
  }
  return null;
}

function classifyHeader(header) {
  const simple = simplify(header);
  if (!simple) return { role: 'empty' };
  if (SPEAKER_HEADERS.includes(simple)) return { role: 'speaker' };
  if (NOTE_HEADERS.includes(simple)) return { role: 'note' };
  if (IGNORED_HEADERS.includes(simple)) return { role: 'ignore' };
  const language = findLanguage(header);
  if (language) return { role: 'language', ...language };
  if (ORIGINAL_HEADERS.includes(simple)) return { role: 'original' };
  return { role: 'unknown' };
}

// ---------- Marcatori (atti, scene…) ----------

const MARKER_PATTERNS = [
  ['act', /^(atto|act|acte|akt|acto|ato)\b/i],
  ['scene', /^(scena|scene|scène|szene|escena|cena)\b/i],
  ['picture', /^(quadro|tableau|bild|cuadro)\b/i],
  ['interval', /^(intervallo|intermission|interval|entracte|entr'acte|pause|pausa|intermedio)\b/i],
];

function markerType(text) {
  const value = String(text || '').trim();
  if (!value || value.length > 60 || value.includes('\n')) return null;
  return MARKER_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0] || null;
}

function makeMarker(id, type, title) {
  return {
    id,
    type: 'marker',
    markerType: type,
    title,
    speaker: '',
    original: '',
    translations: {},
    note: '',
    startTime: null,
    endTime: null,
    renderStyle: 'normal',
  };
}

// ---------- Tabelle ----------

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/).find((line) => line.trim()) || '';
  const counts = { '\t': 0, ';': 0, ',': 0 };
  let quoted = false;
  for (const char of firstLine) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && char in counts) counts[char] += 1;
  }
  const [best, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return count > 0 ? best : ',';
}

export function parseDelimitedText(text, delimiter = detectDelimiter(text)) {
  const source = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell); cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else {
      cell += char;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function columnIndex(reference) {
  const letters = String(reference || '').match(/^[A-Z]+/i)?.[0].toUpperCase() || 'A';
  return [...letters].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xmlTexts(xml) {
  // Unisce i frammenti <t>…</t> (anche con formattazione diversa) di una cella o di una stringa condivisa.
  return [...String(xml || '').matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)]
    .map((match) => decodeXmlEntities(match[1]))
    .join('');
}

function relationshipTargets(relsXml, baseDir) {
  const targets = new Map();
  for (const match of String(relsXml || '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = match[0].match(/\bId="([^"]+)"/)?.[1];
    const target = match[0].match(/\bTarget="([^"]+)"/)?.[1];
    if (!id || !target) continue;
    targets.set(id, target.startsWith('/') ? target.slice(1) : `${baseDir}${target}`.replace(/[^/]+\/\.\.\//g, ''));
  }
  return targets;
}

// Righe del primo foglio di un file Excel (.xlsx), come testo.
export async function parseXlsxRows(arrayBuffer) {
  const zip = openZip(arrayBuffer);
  const workbook = await zip.readText('xl/workbook.xml');
  const rels = relationshipTargets(await zip.readText('xl/_rels/workbook.xml.rels'), 'xl/');
  const firstSheetId = workbook?.match(/<(?:\w+:)?sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const sheetPath = (firstSheetId && rels.get(firstSheetId))
    || zip.names.filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0];
  const sheet = sheetPath ? await zip.readText(sheetPath) : null;
  if (!sheet) throw new Error('Foglio non trovato');

  const sharedXml = (await zip.readText('xl/sharedStrings.xml')) || '';
  const shared = [...sharedXml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((match) => xmlTexts(match[1]));

  const rows = [];
  for (const rowMatch of sheet.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
    const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1]) || rows.length + 1;
    const cells = [];
    for (const cellMatch of rowMatch[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2] || '';
      const reference = attributes.match(/\br="([A-Z]+)\d+"/i)?.[1];
      const type = attributes.match(/\bt="(\w+)"/)?.[1];
      const value = body.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
      let text = '';
      if (type === 's') text = shared[Number(value)] ?? '';
      else if (type === 'inlineStr') text = xmlTexts(body);
      else if (value !== undefined) text = decodeXmlEntities(value);
      cells[reference ? columnIndex(reference) : cells.length] = text;
    }
    rows[rowNumber - 1] = Array.from(cells, (cell) => cell ?? '');
  }
  return Array.from(rows, (row) => row ?? []);
}

function cleanCell(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/ /g, ' ').trim();
}

// Da righe di tabella a battute. La prima riga è l'intestazione se nomina lingue,
// personaggio o note; altrimenti la prima colonna è la lingua principale e le altre sono lingue in più.
export function tableRowsToCues(rows, { primaryLanguage = 'it', languageLabel = (n) => `Lingua ${n}` } = {}) {
  const cleanRows = rows.map((row) => (row || []).map(cleanCell)).filter((row) => row.some(Boolean));
  if (!cleanRows.length) return { cues: [], languages: [], markers: 0 };

  const width = Math.max(...cleanRows.map((row) => row.length));
  const headerRoles = Array.from({ length: width }, (_, index) => classifyHeader(cleanRows[0][index]));
  const hasHeader = headerRoles.some((item) => ['language', 'speaker', 'note', 'original', 'ignore'].includes(item.role));
  const body = hasHeader ? cleanRows.slice(1) : cleanRows;

  const columns = [];
  const usedCodes = new Set();
  const addLanguage = (index, code, name) => {
    let finalCode = code || 'l';
    let suffix = 2;
    while (usedCodes.has(finalCode)) finalCode = `${code}${suffix++}`;
    usedCodes.add(finalCode);
    columns.push({ index, role: 'language', code: finalCode, name });
  };

  if (hasHeader) {
    let extra = 1;
    headerRoles.forEach((item, index) => {
      if (item.role === 'speaker' || item.role === 'note') columns.push({ index, role: item.role });
      else if (item.role === 'language') addLanguage(index, item.code, item.name);
      else if (item.role === 'original') addLanguage(index, primaryLanguage, null);
      else if (item.role === 'unknown' && body.some((row) => row[index])) {
        const header = cleanRows[0][index];
        extra += 1;
        addLanguage(index, normalizeLanguageCode(header).slice(0, 8) || `l${extra}`, header);
      }
    });
  } else {
    for (let index = 0; index < width; index += 1) {
      if (!body.some((row) => row[index])) continue;
      const position = columns.length + 1;
      if (position === 1) addLanguage(index, primaryLanguage, null);
      else addLanguage(index, `l${position}`, languageLabel(position));
    }
  }

  const languageColumns = columns.filter((column) => column.role === 'language');
  if (!languageColumns.length) return { cues: [], languages: [], markers: 0 };
  const speakerColumn = columns.find((column) => column.role === 'speaker');
  const noteColumn = columns.find((column) => column.role === 'note');

  const cues = [];
  let markers = 0;
  for (const row of body) {
    const texts = Object.fromEntries(languageColumns.map((column) => [column.code, row[column.index] || '']));
    const speaker = speakerColumn ? row[speakerColumn.index] || '' : '';
    const note = noteColumn ? row[noteColumn.index] || '' : '';
    const filled = Object.values(texts).filter(Boolean);
    if (!filled.length && !speaker) continue;
    const first = texts[languageColumns[0].code];
    const type = !speaker && filled.length && markerType(first || filled[0]) ? markerType(first || filled[0]) : null;
    if (type && languageColumns.every((column) => !texts[column.code] || markerType(texts[column.code]))) {
      cues.push(makeMarker(cues.length + 1, type, first || filled[0]));
      markers += 1;
      continue;
    }
    cues.push({
      id: cues.length + 1,
      speaker,
      original: first || filled[0] || '',
      translations: texts,
      note,
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    });
  }

  return {
    cues,
    languages: languageColumns.map((column) => ({ code: column.code, name: column.name })),
    markers,
  };
}

// ---------- PowerPoint ----------

function slideText(slideXml) {
  // Numero di pagina, data e piè di pagina non sono sopratitoli.
  const shapes = [...String(slideXml || '').matchAll(/<p:(?:sp|graphicFrame)\b[\s\S]*?<\/p:(?:sp|graphicFrame)>/g)]
    .map((match) => match[0])
    .filter((shape) => !/<p:ph\b[^>]*\btype="(?:sldNum|dt|ftr)"/.test(shape))
    .map((shape) => shape.replace(/<a:fld\b[\s\S]*?<\/a:fld>/g, ''));
  const blocks = (shapes.length ? shapes : [slideXml]).map((shape) => (
    [...shape.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>|<a:p\s*\/>/g)]
      .map((paragraph) => [...String(paragraph[1] || '').matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/>/g)]
        .map((token) => (token[0].startsWith('<a:br') ? '\n' : decodeXmlEntities(token[1])))
        .join(''))
      .join('\n')
      .replace(/ /g, ' ')
      .split('\n').map((line) => line.trim()).join('\n')
      .trim()
  )).filter(Boolean);
  return blocks.join('\n');
}

// Testi delle diapositive, nell'ordine della presentazione (le diapositive nascoste sono saltate).
export async function parsePptxSlides(arrayBuffer) {
  const zip = openZip(arrayBuffer);
  const presentation = (await zip.readText('ppt/presentation.xml')) || '';
  const rels = relationshipTargets(await zip.readText('ppt/_rels/presentation.xml.rels'), 'ppt/');
  let paths = [...presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)].map((match) => rels.get(match[1])).filter(Boolean);
  if (!paths.length) {
    paths = zip.names
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => Number(a.match(/(\d+)\.xml$/)[1]) - Number(b.match(/(\d+)\.xml$/)[1]));
  }
  const slides = [];
  for (const path of paths) {
    const xml = await zip.readText(path);
    if (!xml || /<p:sld\b[^>]*\bshow="0"/.test(xml)) continue;
    slides.push(slideText(xml));
  }
  return slides;
}

export function slidesToCues(slides, language) {
  let markers = 0;
  const cues = slides.map((text, index) => {
    const type = markerType(text);
    if (type) { markers += 1; return makeMarker(index + 1, type, text); }
    // Una diapositiva vuota resta una battuta vuota: in sala è lo schermo nero.
    return {
      id: index + 1,
      speaker: '',
      original: text,
      translations: { [language]: text },
      note: '',
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    };
  });
  return { cues, markers };
}

// ---------- Nuovo progetto ----------

function fileTitle(fileName) {
  return String(fileName || '')
    .replace(/\.[^.]+$/g, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function buildProject(baseProject, { cues, languages, title }) {
  const codes = languages.map((item) => item.code);
  const languageNames = { ...(baseProject.languageNames || {}) };
  for (const { code, name } of languages) {
    if (name) languageNames[code] = name;
    else if (!languageNames[code]) languageNames[code] = code.toUpperCase();
  }
  return normalizeProject({
    ...baseProject,
    id: `project-${Date.now()}`,
    title: title || baseProject.title,
    company: '',
    author: '',
    authorName: '',
    projectAuthor: '',
    coverImage: '',
    coverImageName: '',
    languages: codes,
    activeLanguage: codes[0],
    primaryLanguage: codes[0],
    languageNames,
    cues,
    performances: [],
    archived: false,
    archivedAt: null,
    savedAt: null,
  });
}

// Legge un file (tabella, presentazione, sottotitoli o testo) e crea un nuovo progetto.
// Errori: `error.code === 'empty'` se nel file non ci sono testi; 'unsupported' per altri formati.
export async function importFileAsProject(file, baseProject, options = {}) {
  const kind = getImportKind(file?.name);
  const primaryLanguage = baseProject.primaryLanguage || baseProject.activeLanguage || baseProject.languages?.[0] || 'it';
  const name = String(file?.name || '').toLowerCase();
  let result;

  if (kind === 'table') {
    const rows = name.endsWith('.xlsx')
      ? await parseXlsxRows(await file.arrayBuffer())
      : parseDelimitedText(await file.text(), name.endsWith('.tsv') ? '\t' : undefined);
    result = tableRowsToCues(rows, { primaryLanguage, languageLabel: options.languageLabel });
  } else if (kind === 'slides') {
    result = { ...slidesToCues(await parsePptxSlides(await file.arrayBuffer()), primaryLanguage), languages: [{ code: primaryLanguage }] };
  } else if (kind === 'subtitles') {
    const text = await file.text();
    const cues = name.endsWith('.vtt') ? parseVtt(text, 1, primaryLanguage) : parseSrt(text, 1, primaryLanguage);
    result = { cues, languages: [{ code: primaryLanguage }], markers: 0 };
  } else if (kind === 'text') {
    const parsed = parseTheatreScriptText(await file.text(), { language: primaryLanguage });
    const cues = parsed.cues.map((cue) => ({ ...cue, note: '' }));
    result = { cues, languages: [{ code: primaryLanguage }], markers: parsed.stats.markers };
  } else {
    const error = new Error('Formato non supportato');
    error.code = 'unsupported';
    throw error;
  }

  const playable = result.cues.filter((cue) => cue.type !== 'marker');
  if (!playable.some((cue) => Object.values(cue.translations || {}).some((text) => String(text).trim()))) {
    const error = new Error('Nessun testo da importare');
    error.code = 'empty';
    throw error;
  }

  const project = buildProject(baseProject, { ...result, title: fileTitle(file.name) });
  return {
    project,
    summary: {
      kind,
      file: file.name,
      cues: playable.length,
      markers: result.markers || 0,
      languages: project.languages.map((code) => project.languageNames?.[code] || code.toUpperCase()),
      timed: playable.some((cue) => cue.startTime !== null && cue.startTime !== undefined),
    },
  };
}
