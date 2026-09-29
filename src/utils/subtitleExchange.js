import { normalizeProject } from './projectSchema.js';

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

function secondsToSrtTime(value) {
  const totalMs = Math.max(0, Math.round(Number(value || 0) * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(ms, 3)}`;
}

function secondsToVttTime(value) {
  return secondsToSrtTime(value).replace(',', '.');
}

function subtitleTimeToSeconds(value) {
  const match = String(value || '').trim().match(/(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/);
  if (!match) return null;
  const [, hours, minutes, seconds, ms] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(ms.padEnd(3, '0')) / 1000;
}

function srtTimeToSeconds(value) {
  return subtitleTimeToSeconds(value);
}

function getCueText(cue, language) {
  return cue.translations?.[language] || cue.original || cue.note || '';
}

export function exportSrt(project, language = project.activeLanguage || 'it') {
  return project.cues
    .filter((cue) => cue.startTime !== null && cue.startTime !== undefined)
    .map((cue, index) => {
      const start = secondsToSrtTime(cue.startTime);
      const end = secondsToSrtTime(cue.endTime ?? Number(cue.startTime) + 2.5);
      return [index + 1, `${start} --> ${end}`, getCueText(cue, language)].join('\n');
    })
    .join('\n\n');
}

export function exportVtt(project, language = project.activeLanguage || 'it') {
  const blocks = project.cues
    .filter((cue) => cue.startTime !== null && cue.startTime !== undefined)
    .map((cue) => {
      const start = secondsToVttTime(cue.startTime);
      const end = secondsToVttTime(cue.endTime ?? Number(cue.startTime) + 2.5);
      return [`${start} --> ${end}`, getCueText(cue, language)].join('\n');
    });

  return ['WEBVTT', '', ...blocks].join('\n\n');
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (!/[",\n;]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportCsv(project, language = project.activeLanguage || 'it') {
  const rows = [
    ['id', 'speaker', 'startTime', 'endTime', 'original', `translation_${language}`, 'note'],
    ...project.cues.map((cue) => [
      cue.id,
      cue.speaker || '',
      cue.startTime ?? '',
      cue.endTime ?? '',
      cue.original || '',
      getCueText(cue, language),
      cue.note || '',
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export function parseSrt(text, startCueId = 1, language = 'it') {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split('\n');
      if (/^\d+$/.test(lines[0])) lines.shift();
      const timing = lines.shift() || '';
      const [startRaw, endRaw] = timing.split(/\s*-->\s*/);
      const startTime = srtTimeToSeconds(startRaw);
      const endTime = srtTimeToSeconds(endRaw);
      const content = lines.join('\n').trim();

      return {
        id: startCueId + index,
        speaker: '',
        original: content,
        translations: { [language]: content },
        note: '',
        startTime,
        endTime,
        renderStyle: 'normal',
      };
    })
    .filter((cue) => cue.original || cue.startTime !== null);
}

export function parseVtt(text, startCueId = 1, language = 'it') {
  const blocks = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => !/^WEBVTT(\s|$)/i.test(block))
    .filter((block) => !/^(NOTE|STYLE|REGION)(\s|$)/i.test(block));

  let cueIndex = 0;

  return blocks
    .map((block) => {
      const lines = block.split('\n');
      let timing = lines.shift() || '';

      if (!timing.includes('-->') && lines.length) {
        timing = lines.shift() || '';
      }

      const [startRaw, endRawWithSettings] = timing.split(/\s*-->\s*/);
      const endRaw = String(endRawWithSettings || '').split(/\s+/)[0];
      const startTime = subtitleTimeToSeconds(startRaw);
      const endTime = subtitleTimeToSeconds(endRaw);
      const content = lines.join('\n').trim();

      if (!content && startTime === null) return null;

      const cue = {
        id: startCueId + cueIndex,
        speaker: '',
        original: content,
        translations: { [language]: content },
        note: '',
        startTime,
        endTime,
        renderStyle: 'normal',
      };

      cueIndex += 1;
      return cue;
    })
    .filter(Boolean);
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ',') {
      row.push(cell);
      cell = '';
    } else if (!quoted && /\r|\n/.test(char)) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((item) => item.some((cellValue) => String(cellValue).trim()));
}

export function parseCsv(text, startCueId = 1, language = 'it') {
  const rows = parseCsvRows(String(text || ''));
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim());
  const lowerHeaders = headers.map((header) => header.toLowerCase());
  const indexOf = (...names) => names.map((name) => lowerHeaders.indexOf(name)).find((index) => index >= 0);
  const textIndex = indexOf(`translation_${language}`, 'text', 'subtitle', 'sottotitolo', 'original');
  const originalIndex = indexOf('original', 'source');
  const speakerIndex = indexOf('speaker', 'voce', 'personaggio');
  const noteIndex = indexOf('note', 'notes', 'nota');
  const startIndex = indexOf('starttime', 'start', 'inizio');
  const endIndex = indexOf('endtime', 'end', 'fine');

  return rows.map((row, index) => {
    const textValue = row[textIndex] || row[originalIndex] || '';
    return {
      id: startCueId + index,
      speaker: row[speakerIndex] || '',
      original: row[originalIndex] || textValue,
      translations: { [language]: textValue },
      note: row[noteIndex] || '',
      startTime: row[startIndex] ? Number(row[startIndex]) : null,
      endTime: row[endIndex] ? Number(row[endIndex]) : null,
      renderStyle: 'normal',
    };
  });
}

export function makeImportedProject(baseProject, cues, language = 'it') {
  return normalizeProject({
    ...baseProject,
    cues,
    languages: Array.from(new Set([language, ...(baseProject.languages || [])])),
    activeLanguage: language,
  });
}
