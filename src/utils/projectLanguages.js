import { isMarkerCue } from './markers.js';

// Gestione delle lingue del progetto (Sténtor Lite): elenco, lingua principale,
// aggiunta, rinomina ed eliminazione. Funzioni pure: restituiscono un nuovo progetto.

export const QUICK_LANGUAGES = [
  { code: 'it', name: 'Italiano' },
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
];

export function normalizeLanguageCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

export function getLanguageName(project, code) {
  return project?.languageNames?.[code] || String(code || '').toUpperCase();
}

export function getLanguageCompletion(project, code) {
  const cues = (project?.cues || []).filter((cue) => !isMarkerCue(cue));
  const filled = cues.filter((cue) => String(cue.translations?.[code] || '').trim()).length;
  return { total: cues.length, filled };
}

export function getPrimaryLanguage(project) {
  const languages = project?.languages || [];
  return languages.includes(project?.primaryLanguage) ? project.primaryLanguage : languages[0];
}

// Aggiunge una lingua. copyFrom (facoltativo) copia i testi di un'altra lingua come base;
// activate la rende subito lingua di lavoro (di norma no: la vista non cambia da sola).
export function addProjectLanguage(project, rawCode, rawName = '', { copyFrom = null, activate = false } = {}) {
  const code = normalizeLanguageCode(rawCode);
  if (!code) return { project, error: 'code' };
  if ((project.languages || []).includes(code)) return { project, error: 'exists', code };
  const name = String(rawName || '').trim() || code.toUpperCase();
  return {
    code,
    project: {
      ...project,
      languages: [...(project.languages || []), code],
      languageNames: { ...(project.languageNames || {}), [code]: name },
      activeLanguage: activate ? code : project.activeLanguage,
      cues: (project.cues || []).map((cue) => ({
        ...cue,
        translations: {
          ...(cue.translations || {}),
          [code]: copyFrom && !isMarkerCue(cue) ? (cue.translations?.[copyFrom] || '') : '',
        },
      })),
    },
  };
}

export function renameProjectLanguage(project, code, rawName) {
  const name = String(rawName || '').trim();
  if (!name || !(project.languages || []).includes(code)) return project;
  if (project.languageNames?.[code] === name) return project;
  return { ...project, languageNames: { ...(project.languageNames || {}), [code]: name } };
}

export function setPrimaryProjectLanguage(project, code) {
  if (!(project.languages || []).includes(code) || project.primaryLanguage === code) return project;
  return { ...project, primaryLanguage: code };
}

// Elimina una lingua e i suoi testi. Deve restarne almeno una.
export function removeProjectLanguage(project, code) {
  const languages = project.languages || [];
  if (!languages.includes(code)) return { project, error: 'missing' };
  if (languages.length <= 1) return { project, error: 'last' };
  const remaining = languages.filter((lang) => lang !== code);
  const primary = getPrimaryLanguage(project);
  const nextPrimary = primary === code ? remaining[0] : primary;
  const languageNames = { ...(project.languageNames || {}) };
  delete languageNames[code];
  return {
    project: {
      ...project,
      languages: remaining,
      languageNames,
      primaryLanguage: nextPrimary,
      activeLanguage: project.activeLanguage === code ? nextPrimary : project.activeLanguage,
      cues: (project.cues || []).map((cue) => {
        const translations = { ...(cue.translations || {}) };
        const textSpans = { ...(cue.textSpans || {}) };
        delete translations[code];
        delete textSpans[code];
        return { ...cue, translations, textSpans };
      }),
    },
  };
}
