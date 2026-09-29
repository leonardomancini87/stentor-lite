import { useEffect, useRef, useState } from 'react';
import {
  createProjectSignature,
  saveProject,
} from '../utils/projectPersistence.js';

const AUTOSAVE_DELAY = 2500;

export function useAutosave(project) {
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimeoutRef = useRef(null);
  const lastSavedSignatureRef = useRef(createProjectSignature(project));

  useEffect(() => {
    const currentSignature = createProjectSignature(project);
    const dirty = currentSignature !== lastSavedSignatureRef.current;

    setIsDirty(dirty);

    if (!dirty) return;

    window.clearTimeout(autosaveTimeoutRef.current);

    autosaveTimeoutRef.current = window.setTimeout(() => {
      saveProject(project);
      lastSavedSignatureRef.current = createProjectSignature(project);
      setIsDirty(false);
    }, AUTOSAVE_DELAY);

    return () => {
      window.clearTimeout(autosaveTimeoutRef.current);
    };
  }, [project]);

  function markSaved(savedProject = project) {
    saveProject(savedProject);
    lastSavedSignatureRef.current = createProjectSignature(savedProject);
    setIsDirty(false);
  }

  return {
    isDirty,
    markSaved,
  };
}