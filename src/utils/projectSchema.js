import { normalizeCueTextSpans } from './inlineStyleSpans.js';
import { normalizePerformances } from './showTimer.js';

export const PROJECT_SCHEMA_VERSION = 1;
export const APP_VERSION = '0.4.52';

export function withProjectMetadata(project) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appVersion: project?.appVersion || APP_VERSION,
    ...project,
    schemaVersion: project?.schemaVersion || PROJECT_SCHEMA_VERSION,
    updatedAt: Date.now(),
  };
}

export function normalizeCue(cue, index = 0) {
  const source = cue && typeof cue === 'object' ? cue : {};
  const translations = source.translations && typeof source.translations === 'object'
    ? source.translations
    : {};

  return {
    ...source,
    id: source.id ?? index + 1,
    speaker: source.speaker ?? '',
    original: source.original || '',
    translations,
    textSpans: normalizeCueTextSpans(source.textSpans, translations),
    note: source.note || '',
    startTime: source.startTime ?? null,
    endTime: source.endTime ?? null,
    renderStyle: source.renderStyle || 'normal',
  };
}

export function normalizeProject(project) {
  if (!project || typeof project !== 'object') return null;

  const cues = Array.isArray(project.cues)
    ? project.cues.map(normalizeCue)
    : [];

  const languages = Array.isArray(project.languages) && project.languages.length
    ? project.languages
    : ['it', 'en'];

  const activeLanguage = languages.includes(project.activeLanguage)
    ? project.activeLanguage
    : languages[0];

  const primaryLanguage = languages.includes(project.primaryLanguage)
    ? project.primaryLanguage
    : activeLanguage;

  const languageNames = project.languageNames && typeof project.languageNames === 'object'
    ? Object.fromEntries(
        languages.map((lang) => [lang, project.languageNames[lang] || lang.toUpperCase()])
      )
    : Object.fromEntries(languages.map((lang) => [lang, lang.toUpperCase()]));

  const author = String(
    project.author
      || project.authorName
      || project.projectAuthor
      || project.playwright
      || project.metadata?.author
      || project.metadata?.projectAuthor
      || ''
  ).trim();

  return withProjectMetadata({
    id: project.id || `project-${Date.now()}`,
    title: project.title || 'Progetto Stentor',
    company: project.company || project.companyName || project.collective || project.troupe || '',
    author,
    languages,
    activeLanguage,
    primaryLanguage,
    languageNames,
    settings: project.settings || {},
    coverImage: project.coverImage || '',
    coverImageName: project.coverImageName || '',
    cues,
    // Durate delle ultime recite (card Tempo).
    performances: normalizePerformances(project.performances),
    archived: Boolean(project.archived),
    archivedAt: project.archivedAt || null,
    savedAt: project.savedAt || null,
  });
}
