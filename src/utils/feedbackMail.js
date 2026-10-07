// Feedback di chi usa Sténtor Lite: prepara un'email già compilata (mailto:),
// così non serve nessun server e chi risponde vede esattamente cosa invia.
// Il testo dell'email è in italiano (per chi lo riceve); le risposte aperte restano come scritte.

export const FEEDBACK_EMAIL = 'feedback@stentor.live';

export const FEEDBACK_RECOMMEND = ['yes', 'maybe', 'no'];
export const FEEDBACK_CONTEXTS = ['rehearsals', 'shows', 'festivals', 'education', 'other'];
export const FEEDBACK_FEATURES = ['live', 'editor', 'screens', 'timing', 'languages'];

const IT_LABELS = {
  recommend: { yes: 'Sì', maybe: 'Forse', no: 'No' },
  context: { rehearsals: 'Prove', shows: 'Spettacoli', festivals: 'Festival', education: 'Scuola o università', other: 'Altro' },
  feature: { live: 'Conduzione dal vivo', editor: 'Scrittura e modifica delle battute', screens: 'Schermi e proiezione', timing: 'Tempi', languages: 'Lingue e traduzioni' },
};

export function createEmptyFeedback() {
  return { overall: 0, ease: 0, recommend: '', contexts: [], feature: '', usage: '', improve: '', problems: '', contact: '' };
}

export function hasFeedbackAnswers(answers = {}) {
  return Boolean(
    answers.overall || answers.ease || answers.recommend || answers.feature
    || (answers.contexts || []).length
    || [answers.usage, answers.improve, answers.problems].some((text) => String(text || '').trim())
  );
}

function stars(value) {
  const n = Math.max(0, Math.min(5, Number(value) || 0));
  return n ? `${'★'.repeat(n)}${'☆'.repeat(5 - n)} (${n}/5)` : '—';
}

function text(value) {
  const clean = String(value || '').trim();
  return clean || '—';
}

export function buildFeedbackEmail(answers = {}, meta = {}) {
  const contexts = (answers.contexts || []).map((id) => IT_LABELS.context[id]).filter(Boolean);
  const lines = [
    'Feedback su Sténtor Lite',
    '',
    `Gradimento complessivo: ${stars(answers.overall)}`,
    `Facilità d'uso: ${stars(answers.ease)}`,
    `Lo consiglierebbe: ${IT_LABELS.recommend[answers.recommend] || '—'}`,
    `Dove lo usa: ${contexts.length ? contexts.join(', ') : '—'}`,
    `Parte più usata: ${IT_LABELS.feature[answers.feature] || '—'}`,
    '',
    'Come lo usa:',
    text(answers.usage),
    '',
    'Cosa migliorerebbe o aggiungerebbe:',
    text(answers.improve),
    '',
    'Problemi o errori incontrati:',
    text(answers.problems),
    '',
    `Contatto: ${text(answers.contact)}`,
    '',
    '---',
    `Versione: Sténtor Lite ${meta.version || ''}`.trim(),
    `Lingua dell'interfaccia: ${meta.language || '—'}`,
    `Sistema: ${meta.platform || '—'}`,
  ];
  const body = lines.join('\n');
  const subject = `Feedback Sténtor Lite ${meta.version || ''}`.trim();
  const mailto = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto };
}

// Riassunto breve del sistema, senza identificare la persona.
export function describePlatform(navigatorLike = globalThis.navigator) {
  const ua = String(navigatorLike?.userAgent || '');
  const os = /Mac OS X/.test(ua) ? 'macOS' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : /iPhone|iPad/.test(ua) ? 'iOS' : '';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  const desktop = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ ? 'app desktop' : browser;
  return [os, desktop].filter(Boolean).join(' · ') || '—';
}
