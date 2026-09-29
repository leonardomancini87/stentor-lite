import { normalizeProject } from './projectSchema.js';
import { getUniqueVoices } from './cueVoices.js';
import { decodeXmlEntities, extractZipEntry } from './zipArchive.js';

function stripXmlTags(value) {
  return decodeXmlEntities(String(value || '').replace(/<[^>]+>/g, ''));
}

export function extractParagraphsFromDocumentXml(xml) {
  const paragraphs = [];
  const paragraphRegex = /<w:p[\s\S]*?<\/w:p>/g;
  const tokenRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>/g;
  let paragraphMatch;

  while ((paragraphMatch = paragraphRegex.exec(xml))) {
    const paragraphXml = paragraphMatch[0];
    let text = '';
    let tokenMatch;

    while ((tokenMatch = tokenRegex.exec(paragraphXml))) {
      const token = tokenMatch[0];

      if (token.startsWith('<w:tab')) {
        text += '\t';
      } else if (token.startsWith('<w:br') || token.startsWith('<w:cr')) {
        text += '\n';
      } else {
        text += decodeXmlEntities(tokenMatch[1] || '');
      }
    }

    if (!text) {
      const fallback = stripXmlTags(paragraphXml).trim();
      if (fallback) text = fallback;
    }

    paragraphs.push(text.replace(/\u00a0/g, ' ').trimEnd());
  }

  return paragraphs.filter((paragraph) => paragraph.trim());
}

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function normalizeLine(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

function hasLowerCase(value) {
  return /\p{Ll}/u.test(value);
}

function hasLetter(value) {
  return /\p{L}/u.test(value);
}

function isMostlyUppercase(value) {
  const text = normalizeSpaces(value).replace(/[0-9.,;:!?()[\]{}'’"\-\/]/g, '').trim();
  return Boolean(text) && text === text.toUpperCase();
}

function looksLikeStageHeading(value) {
  const text = normalizeSpaces(value);
  return /^(SCENA|ATTO|QUADRO|INTERVALLO|FINE|BUIO|SIPARIO|PROLOGO|EPILOGO|TITOLO|AUTORE|PERSONAGGI|DIDASCALIA|DIDASCALIE|DRAMATIS PERSONAE|ACT|SCENE|TITLE)(\b|\s|:|\.)/i.test(text);
}

function isTitleCaseName(value) {
  const text = normalizeSpaces(value).replace(/[:.]+$/g, '');
  if (!text || text.length > 80) return false;
  if (!hasLetter(text)) return false;
  if (looksLikeStageHeading(text)) return false;

  const words = text
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length || words.length > 6) return false;

  return words.every((word) => {
    const clean = word.replace(/^["'’]+|["'’.,;:!?]+$/g, '');
    if (!clean) return true;
    if (/^(di|del|della|dei|degli|e|o|a|da|de|la|il|lo|l'|l’)$/i.test(clean)) return true;
    return /^[\p{Lu}\p{Lt}][\p{L}'\u2019.-]*$/u.test(clean);
  });
}

function isSpeakerCandidate(value, options = {}) {
  const text = normalizeSpaces(value).replace(/:$/g, '');
  if (!text || text.length > 80 || !hasLetter(text) || looksLikeStageHeading(text)) return false;
  // Labels may contain initials, apostrophes, hyphens or a voice number, not
  // arbitrary sentence punctuation, parenthetical directions or whole phrases.
  if (!/^[\p{L}\p{N} .'\u2019-]+$/u.test(text)) return false;
  const words = text.split(/\s+/);
  if (words.length > 6 || /^(IL|LO|LA|I|GLI|LE|UN|UNA|UNO|NON|SI|NO|E|O)$/i.test(text)) return false;
  if (!hasLowerCase(text) && isMostlyUppercase(text)) return true;
  return Boolean(options.allowTitleCase) && isTitleCaseName(text);
}

function isLikelyDialogueContinuation(value) {
  const text = normalizeSpaces(value);
  return /^[\p{Lu}\p{Lt}0-9([{"'\u201c\u2018]/u.test(text);
}

function cleanSpeaker(value) {
  return normalizeSpaces(value).replace(/[:.]+$/g, '').trim();
}

function splitSpeakerLine(line, knownSpeakers = []) {
  const raw = normalizeLine(line);
  if (!raw || looksLikeStageHeading(raw)) return null;
  // Explicit separators are stronger evidence than the spelling of a name.
  const separated = raw.match(/^(.{1,80}?)\t+\s*(.+)$/)
    || raw.match(/^(.{1,80}?) {2,}(.+)$/)
    || raw.match(/^(.{1,80}?):\s*(\S.*)$/)
    || raw.match(/^(.{1,80}?) +- +(.+)$/);
  if (separated && isSpeakerCandidate(separated[1], { allowTitleCase: true })) {
    return { speaker: cleanSpeaker(separated[1]), text: normalizeSpaces(separated[2]) };
  }

  for (const speaker of [...knownSpeakers].sort((a, b) => b.length - a.length)) {
    const escaped = speaker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = raw.match(new RegExp(`^${escaped}\\s+(.+)$`));
    if (match && isLikelyDialogueContinuation(match[1])) {
      return { speaker, text: normalizeSpaces(match[1]) };
    }
  }

  // Keep the existing ALL-CAPS-prefix convention, but do not split phrases
  // such as "NON temere" or stage directions such as "IL RE entra".
  const prefix = raw.match(/^([\p{Lu}\p{Lt}0-9][\p{Lu}\p{Lt}0-9 '\u2019.,-]{0,79})\s+(.+)$/u);
  if (prefix && isSpeakerCandidate(prefix[1]) && !isMostlyUppercase(prefix[2])
    && isLikelyDialogueContinuation(prefix[2])) {
    return { speaker: cleanSpeaker(prefix[1]), text: normalizeSpaces(prefix[2]) };
  }
  return null;
}

function markerFromLine(line, cueId) {
  const text = normalizeSpaces(line);
  const lower = text.toLowerCase();

  if (/^atto\b/.test(lower)) {
    return {
      id: cueId,
      type: 'marker',
      markerType: 'act',
      title: text,
      speaker: 'MARCATORE',
      original: '',
      translations: {},
      note: 'Importato dal copione Word',
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    };
  }

  if (/^scena\b/.test(lower) || /^scena:/.test(lower)) {
    return {
      id: cueId,
      type: 'marker',
      markerType: 'scene',
      title: text,
      speaker: 'MARCATORE',
      original: '',
      translations: {},
      note: 'Importato dal copione Word',
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    };
  }

  if (/^quadro\b/.test(lower)) {
    return {
      id: cueId,
      type: 'marker',
      markerType: 'picture',
      title: text,
      speaker: 'MARCATORE',
      original: '',
      translations: {},
      note: 'Importato dal copione Word',
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    };
  }

  if (/^intervallo\b/.test(lower)) {
    return {
      id: cueId,
      type: 'marker',
      markerType: 'interval',
      title: text,
      speaker: 'MARCATORE',
      original: '',
      translations: {},
      note: 'Importato dal copione Word',
      startTime: null,
      endTime: null,
      renderStyle: 'normal',
    };
  }

  return null;
}

function createScriptCue({ id, speaker, text, language, note = '' }) {
  const cleanText = normalizeSpaces(text);
  return {
    id,
    speaker,
    original: cleanText,
    translations: {
      [language]: cleanText,
    },
    note,
    startTime: null,
    endTime: null,
    renderStyle: 'normal',
  };
}

function collectKnownSpeakers(lines) {
  const speakers = new Set();
  for (const line of lines) {
    const parsed = splitSpeakerLine(line);
    if (parsed) speakers.add(parsed.speaker);
  }
  return speakers;
}

function isStageDirection(line) {
  const text = normalizeSpaces(line);
  return /^[([{].*[)\]}]$/.test(text)
    || /^(?:si\s+)?(?:alza|alzano|siede|siedono|rivolge|rivolgono|entra|entrano|esce|escono)\b/i.test(text)
    || /\b(?:entrano|escono) (?:da|in|di)\b/i.test(text);
}

function bareSpeakerCandidate(line) {
  const text = normalizeSpaces(line);
  if (/[.!?;,()[\]]/.test(text) || !isSpeakerCandidate(text)) return '';
  // Long all-caps titles are not names. Explicit separators still support
  // longer labels such as "PRIMA VOCE FUORI CAMPO".
  return text.split(/\s+/).length <= 3 ? cleanSpeaker(text) : '';
}

function findStandaloneVoices(lines, knownSpeakers) {
  const occurrences = new Map();
  for (const line of lines) {
    const candidate = bareSpeakerCandidate(line);
    if (candidate) occurrences.set(candidate, (occurrences.get(candidate) || 0) + 1);
  }
  const candidates = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const explicit = raw.endsWith(':') && isSpeakerCandidate(raw.slice(0, -1), { allowTitleCase: true });
    const voice = explicit ? cleanSpeaker(raw) : bareSpeakerCandidate(raw);
    if (!voice) continue;
    let next = index + 1;
    while (next < lines.length && isStageDirection(lines[next])) next += 1;
    if (next >= lines.length || looksLikeStageHeading(lines[next]) || /^\*+$/.test(lines[next])
      || splitSpeakerLine(lines[next], [...knownSpeakers]) || bareSpeakerCandidate(lines[next])
      || /^[([{]/.test(lines[next])) continue;
    candidates.set(index, { voice, next, explicit });
  }
  const distinct = new Set([...candidates.values()].map(({ voice }) => voice));
  const result = new Map();
  for (const [index, candidate] of candidates) {
    const { voice, explicit } = candidate;
    const generic = /^(CORO|NARRATORE|VOCE|VOCI|TUTTI)(?:\s|$)/.test(voice);
    // An isolated unknown uppercase title is ambiguous: keep it as text.
    // Repeated labels, two alternating voices, a colon, or an already known
    // voice provide structural evidence without any play-specific names.
    if (explicit || generic || knownSpeakers.has(voice) || occurrences.get(voice) > 1 || distinct.size > 1) {
      result.set(index, candidate);
    }
  }
  return result;
}

export function parseTheatreScriptText(text, options = {}) {
  const language = options.language || 'it';
  const startCueId = options.startCueId || 1;
  const paragraphs = Array.isArray(text) ? text : String(text || '').split(/\r?\n/);
  const lines = paragraphs.flatMap((paragraph) => String(paragraph || '').split(/\n/))
    .map(normalizeLine).filter(Boolean);
  const knownSpeakers = collectKnownSpeakers(lines);
  const standalone = findStandaloneVoices(lines, knownSpeakers);
  for (const { voice } of standalone.values()) knownSpeakers.add(voice);
  const cues = [];
  let dialogueCount = 0;
  let stageDirectionCount = 0;
  let unassignedCount = 0;
  let pending = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = markerFromLine(line, startCueId + cues.length);
    if (marker) { cues.push(marker); pending = null; continue; }
    if (standalone.has(index)) { pending = standalone.get(index); continue; }
    if (/^\*+$/.test(line)) continue;

    const speakerLine = splitSpeakerLine(line, [...knownSpeakers]);
    if (speakerLine || (pending && pending.next === index)) {
      const speaker = speakerLine?.speaker || pending.voice;
      const body = speakerLine?.text ?? line;
      knownSpeakers.add(speaker);
      cues.push(createScriptCue({ id: startCueId + cues.length, speaker, text: body, language,
        note: 'Battuta importata dal copione Word' }));
      dialogueCount += 1;
      pending = null;
      continue;
    }

    const direction = isStageDirection(line);
    cues.push(createScriptCue({ id: startCueId + cues.length, speaker: '', text: line, language,
      note: direction ? 'Didascalia importata dal copione Word' : 'Testo importato dal copione Word' }));
    if (direction) stageDirectionCount += 1;
    else unassignedCount += 1;
  }

  return {
    cues,
    // Legacy result key retained for callers; there is no character registry.
    characters: getUniqueVoices(cues),
    stats: { total: cues.length, dialogue: dialogueCount, stageDirections: stageDirectionCount,
      unassigned: unassignedCount, markers: cues.filter((cue) => cue.type === 'marker').length },
  };
}

export async function parseDocxTheatreScript(file, options = {}) {
  const arrayBuffer = await file.arrayBuffer();
  const documentXml = await extractZipEntry(arrayBuffer, 'word/document.xml');
  const paragraphs = extractParagraphsFromDocumentXml(documentXml);
  return parseTheatreScriptText(paragraphs, options);
}

function fileTitle(fileName) {
  return String(fileName || 'Copione')
    .replace(/\.[^.]+$/g, '')
    .replace(/[-_]+/g, ' ')
    .trim() || 'Copione';
}

export async function importWordScriptAsProject(file, baseProject, options = {}) {
  const language = options.language || baseProject.activeLanguage || baseProject.primaryLanguage || 'it';
  const result = await parseDocxTheatreScript(file, { language, startCueId: 1 });
  const title = options.title || fileTitle(file.name);

  const project = normalizeProject({
    ...baseProject,
    id: `project-${Date.now()}`,
    title,
    languages: Array.from(new Set([language, ...(baseProject.languages || ['it'])])),
    activeLanguage: language,
    primaryLanguage: language,
    languageNames: {
      ...(baseProject.languageNames || {}),
      [language]: baseProject.languageNames?.[language] || 'Italiano',
    },
    cues: result.cues,
    savedAt: null,
  });

  return {
    project,
    summary: {
      title,
      ...result.stats,
      characters: result.characters,
    },
  };
}
