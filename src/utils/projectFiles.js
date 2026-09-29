import { convertStentorProProject, isStentorProProject } from './stentorProImport.js';
import { demoProject } from '../lib/demoProject.js';
import { normalizeProject, withProjectMetadata } from './projectSchema.js';

export const STENTORE_PROJECT_EXTENSION = '.stentore.json';

export function createBlankProject(title = 'Nuovo progetto') {
  return normalizeProject({
    id: `project-${Date.now()}`,
    title,
    languages: ['it'],
    activeLanguage: 'it',
    primaryLanguage: 'it',
    languageNames: {
      it: 'Italiano',
    },
    settings: {
      ...demoProject.settings,
      activeScreenId: demoProject.settings?.activeScreenId || 'studio-torino',
    },
    cues: [
      {
        id: 1,
        speaker: '',
        original: '',
        translations: {
          it: '',
        },
        note: '',
        startTime: null,
        endTime: null,
        renderStyle: 'normal',
      },
    ],
  });
}

export function getProjectDownloadName(project, fallback = 'progetto-stentore') {
  const base = String(project?.title || fallback)
    .trim()
    .replace(/[^a-z0-9-_.]+/gi, '-')
    .replace(/^-+|-+$/g, '') || fallback;

  return base.toLowerCase().endsWith(STENTORE_PROJECT_EXTENSION)
    ? base
    : `${base}${STENTORE_PROJECT_EXTENSION}`;
}

export async function readProjectFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const project = normalizeProject(
    isStentorProProject(parsed) ? convertStentorProProject(parsed, file?.name).project : parsed
  );

  if (!project || !Array.isArray(project.cues)) {
    throw new Error('File progetto non valido');
  }

  return project;
}

export async function writeProjectFileHandle(handle, project) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(withProjectMetadata(project), null, 2));
  await writable.close();
}

export async function chooseProjectSaveHandle(project) {
  if (!window.showSaveFilePicker) return null;

  return window.showSaveFilePicker({
    suggestedName: getProjectDownloadName(project),
    types: [
      {
        description: 'Progetto Stentor',
        accept: {
          'application/json': ['.json'],
        },
      },
    ],
  });
}
