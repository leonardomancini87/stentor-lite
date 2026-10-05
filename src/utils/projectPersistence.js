import { normalizeProject, withProjectMetadata } from './projectSchema.js';

const PROJECT_KEY = 'opensurtitles.currentProject';
const PROJECT_ARCHIVE_KEY = 'stentore.projectArchive.v1';
const CURRENT_PROJECT_ID_KEY = 'stentore.currentProjectId.v1';

function now() {
  return Date.now();
}

function ensureProjectId(project) {
  return project?.id || `project-${now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeArchiveItem(project) {
  const normalized = normalizeProject(project);
  if (!normalized) return null;

  return withProjectMetadata({
    ...normalized,
    id: ensureProjectId(normalized),
    updatedAt: normalized.updatedAt || normalized.savedAt || now(),
  });
}

function readArchiveRaw() {
  try {
    const raw = localStorage.getItem(PROJECT_ARCHIVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Project archive load failed:', error);
    return [];
  }
}

function writeArchiveRaw(projects) {
  localStorage.setItem(PROJECT_ARCHIVE_KEY, JSON.stringify(projects));
}

const DEMO_VERSION_KEY = 'stentor.demoVersion.v1';

// La demo inclusa nell'app viene salvata come un progetto qualsiasi. Quando una versione nuova
// porta una demo aggiornata (demoVersion più alto), la copia salvata viene sostituita:
// altrimenti chi aveva già aperto l'app continuerebbe a vedere la demo vecchia.
// Le modifiche fatte alla demo si perdono solo in quel momento; gli altri progetti non si toccano.
export function refreshBuiltInDemo(demo) {
  try {
    const current = Number(demo?.demoVersion) || 0;
    const saved = Number(localStorage.getItem(DEMO_VERSION_KEY)) || 0;
    if (!demo?.id || saved >= current) return false;

    const fresh = { ...demo, updatedAt: now() };
    let replaced = false;

    const archive = readArchiveRaw();
    if (archive.some((project) => project?.id === demo.id)) {
      writeArchiveRaw(archive.map((project) => (project?.id === demo.id ? fresh : project)));
      replaced = true;
    }

    const rawCurrent = localStorage.getItem(PROJECT_KEY);
    if (rawCurrent && JSON.parse(rawCurrent)?.id === demo.id) {
      localStorage.setItem(PROJECT_KEY, JSON.stringify(fresh));
      replaced = true;
    }

    localStorage.setItem(DEMO_VERSION_KEY, String(current));
    return replaced;
  } catch (error) {
    console.warn('Demo refresh failed:', error);
    return false;
  }
}

export function createProjectSignature(project) {
  return JSON.stringify(project);
}

export function loadProjectArchive({ includeArchived = false } = {}) {
  const archive = readArchiveRaw()
    .map(normalizeArchiveItem)
    .filter((project) => project && (includeArchived || !project.archived));

  // Migratione dalla vecchia versione: un solo progetto in opensurtitles.currentProject.
  if (archive.length === 0) {
    try {
      const legacyRaw = localStorage.getItem(PROJECT_KEY);
      const legacyProject = legacyRaw ? normalizeArchiveItem(JSON.parse(legacyRaw)) : null;

      if (legacyProject) {
        writeArchiveRaw([legacyProject]);
        localStorage.setItem(CURRENT_PROJECT_ID_KEY, legacyProject.id);
        return [legacyProject];
      }
    } catch (error) {
      console.warn('Project archive migration failed:', error);
    }
  }

  return archive.sort((a, b) => (b.updatedAt || b.savedAt || 0) - (a.updatedAt || a.savedAt || 0));
}

export function getCurrentProjectId() {
  return localStorage.getItem(CURRENT_PROJECT_ID_KEY);
}

export function setCurrentProjectId(projectId) {
  if (projectId) {
    localStorage.setItem(CURRENT_PROJECT_ID_KEY, projectId);
  }
}

export function loadProjectById(projectId) {
  if (!projectId) return null;
  return loadProjectArchive({ includeArchived: true }).find((project) => project.id === projectId) || null;
}

export function saveProject(project) {
  try {
    const projectToSave = withProjectMetadata({
      ...project,
      id: ensureProjectId(project),
      savedAt: now(),
      updatedAt: now(),
    });

    const archive = readArchiveRaw()
      .map(normalizeArchiveItem)
      .filter(Boolean);

    const nextArchive = [
      projectToSave,
      ...archive.filter((item) => item.id !== projectToSave.id),
    ];

    writeArchiveRaw(nextArchive);
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projectToSave));
    setCurrentProjectId(projectToSave.id);
  } catch (error) {
    console.warn('Project save failed:', error);
  }
}

export function loadProject() {
  try {
    const currentProjectId = getCurrentProjectId();
    const currentProject = loadProjectById(currentProjectId);
    if (currentProject) return currentProject;

    const archive = loadProjectArchive();
    if (archive[0]) {
      setCurrentProjectId(archive[0].id);
      return archive[0];
    }

    const raw = localStorage.getItem(PROJECT_KEY);
    return raw ? normalizeProject(JSON.parse(raw)) : null;
  } catch (error) {
    console.warn('Project load failed:', error);
    return null;
  }
}

export function deleteArchivedProject(projectId) {
  const archive = loadProjectArchive({ includeArchived: true }).filter((project) => project.id !== projectId);
  writeArchiveRaw(archive);

  if (getCurrentProjectId() === projectId) {
    const fallback = archive[0] || null;
    if (fallback) {
      setCurrentProjectId(fallback.id);
      localStorage.setItem(PROJECT_KEY, JSON.stringify(fallback));
    } else {
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      localStorage.removeItem(PROJECT_KEY);
    }
  }

  return archive;
}

export function clearProject() {
  localStorage.removeItem(PROJECT_KEY);
  localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
}

export function updateArchivedProject(projectId, updater) {
  if (!projectId || typeof updater !== 'function') return loadProjectArchive();

  const archive = loadProjectArchive({ includeArchived: true });
  const nextArchive = archive.map((project) => {
    if (project.id !== projectId) return project;
    return normalizeArchiveItem(updater(project));
  }).filter(Boolean);

  writeArchiveRaw(nextArchive);

  const currentId = getCurrentProjectId();
  const currentProject = nextArchive.find((item) => item.id === currentId && !item.archived);
  if (currentProject) {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(currentProject));
  } else if (currentId === projectId) {
    const fallback = nextArchive.find((item) => !item.archived) || null;
    if (fallback) {
      setCurrentProjectId(fallback.id);
      localStorage.setItem(PROJECT_KEY, JSON.stringify(fallback));
    } else {
      localStorage.removeItem(CURRENT_PROJECT_ID_KEY);
      localStorage.removeItem(PROJECT_KEY);
    }
  }

  return loadProjectArchive();
}

export function duplicateArchivedProject(projectId) {
  const source = loadProjectById(projectId);
  if (!source) return null;

  const copy = normalizeArchiveItem({
    ...source,
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${source.title || 'Spettacolo'} copia`,
    archived: false,
    archivedAt: null,
    savedAt: Date.now(),
    updatedAt: Date.now(),
  });

  const archive = loadProjectArchive({ includeArchived: true });
  writeArchiveRaw([copy, ...archive]);
  setCurrentProjectId(copy.id);
  localStorage.setItem(PROJECT_KEY, JSON.stringify(copy));
  return copy;
}
