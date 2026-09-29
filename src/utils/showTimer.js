// Cronometro della recita (card "Tempo" di Sténtor Lite). Parte solo a mano e non
// comanda mai la proiezione. Funzioni pure: ogni azione restituisce un nuovo stato.

export const MAX_PERFORMANCES = 10;

export function createTimer(section = null) {
  return {
    status: 'idle', // idle | running | paused
    runStartedAt: null, // orario (ms) dell'ultimo Avvia/Riprendi
    elapsedBefore: 0, // tempo accumulato prima dell'ultimo Avvia/Riprendi
    startedAt: null, // orario del primo Avvia della recita
    section: section ? { id: section.id, title: section.title } : null,
    sectionStart: 0, // tempo totale a cui è iniziata la sezione in corso
    segments: [], // sezioni concluse: { id, title, ms }
  };
}

export function getElapsed(timer, now = Date.now()) {
  if (!timer) return 0;
  const running = timer.status === 'running' && Number.isFinite(timer.runStartedAt) ? Math.max(0, now - timer.runStartedAt) : 0;
  return Math.max(0, (timer.elapsedBefore || 0) + running);
}

export function getSectionElapsed(timer, now = Date.now()) {
  if (!timer?.section || timer.status === 'idle') return 0;
  return Math.max(0, getElapsed(timer, now) - (timer.sectionStart || 0));
}

export function startTimer(timer, now = Date.now()) {
  if (timer.status === 'running') return timer;
  if (timer.status === 'idle') {
    return { ...timer, status: 'running', runStartedAt: now, elapsedBefore: 0, startedAt: now, sectionStart: 0, segments: [] };
  }
  return { ...timer, status: 'running', runStartedAt: now };
}

export function pauseTimer(timer, now = Date.now()) {
  if (timer.status !== 'running') return timer;
  return { ...timer, status: 'paused', runStartedAt: null, elapsedBefore: getElapsed(timer, now) };
}

// La proiezione è entrata in un'altra sezione della Mappa.
export function changeSection(timer, section, now = Date.now()) {
  const nextSection = section ? { id: section.id, title: section.title } : null;
  if ((timer.section?.id ?? null) === (nextSection?.id ?? null)) {
    if (nextSection && timer.section && timer.section.title !== nextSection.title) return { ...timer, section: nextSection };
    return timer;
  }
  if (timer.status === 'idle') return { ...timer, section: nextSection, sectionStart: 0 };
  const total = getElapsed(timer, now);
  const segments = timer.section
    ? [...timer.segments, { id: timer.section.id, title: timer.section.title, ms: total - timer.sectionStart }]
    : timer.segments;
  return { ...timer, section: nextSection, sectionStart: total, segments };
}

// Durate per sezione, nell'ordine in cui sono comparse (una sezione ripresa più volte si somma).
export function summarizeSections(segments = []) {
  const byId = new Map();
  segments.forEach((segment) => {
    if (!segment || segment.ms <= 0) return;
    const current = byId.get(segment.id);
    if (current) current.ms += segment.ms;
    else byId.set(segment.id, { id: segment.id, title: segment.title, ms: segment.ms });
  });
  return [...byId.values()];
}

// Termina la recita: restituisce il registro della recita e un cronometro azzerato.
export function finishTimer(timer, now = Date.now()) {
  if (timer.status === 'idle') return { timer, performance: null };
  const total = getElapsed(timer, now);
  const segments = timer.section
    ? [...timer.segments, { id: timer.section.id, title: timer.section.title, ms: total - timer.sectionStart }]
    : timer.segments;
  const performance = {
    id: `recita-${now}`,
    startedAt: timer.startedAt || now,
    endedAt: now,
    totalMs: Math.round(total),
    sections: summarizeSections(segments).map((item) => ({ title: item.title, ms: Math.round(item.ms) })),
  };
  return { timer: createTimer(timer.section), performance };
}

export function addPerformance(performances = [], performance) {
  if (!performance) return performances;
  return [performance, ...(Array.isArray(performances) ? performances : [])].slice(0, MAX_PERFORMANCES);
}

export function normalizePerformances(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && Number.isFinite(item.totalMs))
    .map((item) => ({
      id: String(item.id || `recita-${item.endedAt || item.startedAt || 0}`),
      startedAt: Number(item.startedAt) || null,
      endedAt: Number(item.endedAt) || null,
      totalMs: Math.max(0, Math.round(item.totalMs)),
      sections: Array.isArray(item.sections)
        ? item.sections.filter((s) => s && Number.isFinite(s.ms)).map((s) => ({ title: String(s.title || ''), ms: Math.max(0, Math.round(s.ms)) }))
        : [],
    }))
    .slice(0, MAX_PERFORMANCES);
}

export function formatDuration(ms, { alwaysHours = false } = {}) {
  const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours || alwaysHours ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}


// ---------- Tempi delle battute (registrazione) ----------
// Stesso formato di Sténtor Pro: startTime / endTime in secondi su ogni battuta.

function isMarker(cue) {
  return cue?.type === 'marker';
}

function hasTime(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

// La proiezione passa da fromIndex a toIndex al secondo "seconds".
export function stampCueChange(cues = [], fromIndex, toIndex, seconds) {
  const time = Number(Math.max(0, seconds).toFixed(2));
  let changed = false;
  const next = cues.map((cue, index) => {
    if (index === fromIndex && index !== toIndex && cue && !isMarker(cue)) {
      changed = true;
      return { ...cue, endTime: time };
    }
    if (index === toIndex && cue && !isMarker(cue)) {
      changed = true;
      return { ...cue, startTime: time, endTime: null };
    }
    return cue;
  });
  return changed ? next : cues;
}

// Fine della registrazione: la battuta in proiezione si chiude al secondo "seconds".
export function closeCueTiming(cues = [], index, seconds) {
  const cue = cues[index];
  if (!cue || isMarker(cue) || !hasTime(cue.startTime)) return cues;
  const time = Number(Math.max(0, seconds).toFixed(2));
  return cues.map((item, i) => (i === index ? { ...item, endTime: time } : item));
}

export function cueHasTime(cue) {
  return Boolean(cue) && !isMarker(cue) && hasTime(cue.startTime);
}

export function countTimedCues(cues = []) {
  const playable = cues.filter((cue) => !isMarker(cue));
  return { timed: playable.filter((cue) => hasTime(cue.startTime)).length, total: playable.length };
}

export function clearCueTimings(cues = []) {
  return cues.map((cue) => (cue.startTime == null && cue.endTime == null ? cue : { ...cue, startTime: null, endTime: null }));
}
