const TIMING_BACKUP_KEY = 'stentore.timingBackup.v1';

function getProjectId(project) {
  return project?.id || project?.title || 'stentore-project';
}

export function buildTimingBackup(project, language, activeIndex = 0) {
  return {
    version: 1,
    savedAt: Date.now(),
    projectId: getProjectId(project),
    projectTitle: project?.title || 'Stentor',
    language,
    activeIndex,
    cues: (project?.cues || []).map((cue) => ({
      id: cue.id,
      startTime: cue.startTime ?? null,
      endTime: cue.endTime ?? null,
    })),
  };
}

export function saveTimingBackup(project, language, activeIndex = 0) {
  try {
    const backup = buildTimingBackup(project, language, activeIndex);
    localStorage.setItem(TIMING_BACKUP_KEY, JSON.stringify(backup));
    return backup;
  } catch (error) {
    console.warn('Copia tempi non salvata:', error);
    return null;
  }
}

export function loadTimingBackup() {
  try {
    const raw = localStorage.getItem(TIMING_BACKUP_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Copia tempi non caricata:', error);
    return null;
  }
}

export function clearTimingBackup() {
  try {
    localStorage.removeItem(TIMING_BACKUP_KEY);
  } catch (error) {
    console.warn('Copia tempi non cancellata:', error);
  }
}

export function hasUsefulTimingBackup(project, backup) {
  if (!project || !backup || !Array.isArray(backup.cues)) return false;
  if (backup.projectId !== getProjectId(project)) return false;

  const cueIds = new Set((project.cues || []).map((cue) => cue.id));

  return backup.cues.some(
    (item) =>
      cueIds.has(item.id) &&
      (item.startTime != null || item.endTime != null)
  );
}

export function applyTimingBackup(project, backup) {
  if (!project || !backup || !Array.isArray(backup.cues)) return project;

  const timingById = new Map(
    backup.cues.map((item) => [item.id, item])
  );

  return {
    ...project,
    cues: project.cues.map((cue) => {
      const timing = timingById.get(cue.id);
      if (!timing) return cue;

      return {
        ...cue,
        startTime: timing.startTime ?? null,
        endTime: timing.endTime ?? null,
      };
    }),
  };
}
