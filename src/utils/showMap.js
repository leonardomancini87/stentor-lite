import { getMarkerTitle, getMarkerTypeLabel, isMarkerCue } from './markers.js';

// Mappa dello spettacolo: i marcatori (Atto, Scena, Quadro, Intervallo…) dividono
// l'elenco in sezioni. Le battute sono numerate senza contare i marcatori, così
// inserire "Atto II" non fa saltare la numerazione.

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function toRoman(value) {
  let rest = Math.max(1, Math.floor(Number(value) || 1));
  let result = '';
  for (const [amount, symbol] of ROMAN) {
    while (rest >= amount) {
      result += symbol;
      rest -= amount;
    }
  }
  return result;
}

// Numero di battuta (1, 2, 3…) per ogni posizione; null per i marcatori.
export function getCueNumbers(cues = []) {
  let count = 0;
  return cues.map((cue) => {
    if (isMarkerCue(cue)) return null;
    count += 1;
    return count;
  });
}

export function formatCueNumber(number) {
  return Number.isInteger(number) && number > 0 ? String(number).padStart(3, '0') : '—';
}

// Posizione nell'elenco della battuta con quel numero, oppure -1.
export function findIndexByCueNumber(cues = [], number) {
  const wanted = Number(number);
  if (!Number.isInteger(wanted) || wanted < 1) return -1;
  let count = 0;
  for (let index = 0; index < cues.length; index += 1) {
    if (isMarkerCue(cues[index])) continue;
    count += 1;
    if (count === wanted) return index;
  }
  return -1;
}

// Sezioni della mappa, nell'ordine dello spettacolo. Se ci sono battute prima del
// primo marcatore compare una sezione implicita "Inizio".
export function buildShowMap(cues = []) {
  const numbers = getCueNumbers(cues);
  const sections = [];
  let current = null;

  function openSection(section) {
    current = { ...section, firstCueIndex: -1, firstNumber: null, lastNumber: null, cueCount: 0 };
    sections.push(current);
  }

  cues.forEach((cue, index) => {
    if (isMarkerCue(cue)) {
      openSection({
        id: String(cue.id ?? `marker-${index}`),
        markerId: cue.id,
        markerIndex: index,
        markerType: cue.markerType || 'other',
        typeLabel: getMarkerTypeLabel(cue.markerType),
        title: getMarkerTitle(cue),
        implicit: false,
      });
      return;
    }
    if (!current) {
      openSection({
        id: 'start',
        markerId: null,
        markerIndex: -1,
        markerType: 'start',
        typeLabel: 'Inizio',
        title: 'Inizio',
        implicit: true,
      });
    }
    if (current.firstCueIndex < 0) {
      current.firstCueIndex = index;
      current.firstNumber = numbers[index];
    }
    current.lastNumber = numbers[index];
    current.cueCount += 1;
  });

  // Una mappa con la sola sezione implicita non aggiunge nulla.
  if (sections.length === 1 && sections[0].implicit) return [];
  return sections;
}

// Sezione che contiene la posizione indicata (di solito la battuta proiettata).
export function findSectionForIndex(sections = [], index) {
  let found = null;
  for (const section of sections) {
    const start = section.implicit ? 0 : section.markerIndex;
    if (start <= index) found = section;
    else break;
  }
  return found;
}

// Titolo proposto per un nuovo marcatore: "Atto II" se esiste già un atto, ecc.
// typeLabel / otherTitle permettono di proporre il titolo nella lingua dell'interfaccia.
export function suggestMarkerTitle(cues = [], markerType = 'act', beforeIndex = cues.length, typeLabel = getMarkerTypeLabel, otherTitle = 'Marcatore') {
  const label = typeLabel(markerType);
  if (markerType === 'other') return otherTitle;
  if (markerType === 'interval') return label;
  const before = cues.slice(0, Math.max(0, beforeIndex));
  const previous = before.filter((cue) => isMarkerCue(cue) && (cue.markerType || 'other') === markerType).length;
  // Primo marcatore di questo tipo ma con battute già prima: quelle battute sono
  // implicitamente la prima sezione, quindi questa è la seconda ("inizia il secondo atto").
  const firstSameType = before.findIndex((cue) => isMarkerCue(cue) && (cue.markerType || 'other') === markerType);
  const leading = firstSameType < 0 ? before : before.slice(0, firstSameType);
  const implicitFirst = leading.some((cue) => !isMarkerCue(cue)) ? 1 : 0;
  return `${label} ${toRoman(previous + implicitFirst + 1)}`;
}

// Corregge un indice dopo l'inserimento di un elemento in posizione insertIndex.
export function shiftIndexAfterInsert(index, insertIndex) {
  return Number.isInteger(index) && index >= insertIndex ? index + 1 : index;
}

// Corregge un indice dopo la rimozione dell'elemento in posizione removedIndex.
export function shiftIndexAfterRemove(index, removedIndex) {
  return Number.isInteger(index) && index > removedIndex ? index - 1 : index;
}

// Cerca per titolo un marcatore ("atto 2", "intervallo") e restituisce la sua
// prima battuta, oppure -1.
export function findMarkerTargetByText(cues = [], query = '') {
  const needle = normalizeSearch(query);
  if (!needle) return -1;
  const sections = buildShowMap(cues).filter((section) => !section.implicit && section.firstCueIndex >= 0);
  const match = sections.find((section) => normalizeSearch(section.title) === needle)
    || sections.find((section) => normalizeSearch(section.title).startsWith(needle));
  return match ? match.firstCueIndex : -1;
}

function normalizeSearch(value) {
  return String(value || '')
    .toLocaleLowerCase('it')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(\d+)\b/g, (_, digits) => toRoman(Number(digits)).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}
