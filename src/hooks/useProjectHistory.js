import { useState } from 'react';

const MAX_HISTORY_ITEMS = 25;

export function useProjectHistory(initialProject) {
  const [project, setProjectState] = useState(initialProject);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  function pushPast(projectSnapshot) {
    setPast((items) => {
      const nextItems = [...items, projectSnapshot];
      return nextItems.slice(-MAX_HISTORY_ITEMS);
    });
  }

  function setProject(action, options = {}) {
    const { skipHistory = false, replace = false } = options;

    setProjectState((current) => {
      const nextProject =
        typeof action === 'function'
          ? action(current)
          : action;

      if (nextProject === current) {
        return current;
      }

      if (!skipHistory && !replace) {
        pushPast(current);
        setFuture([]);
      }

      return nextProject;
    });
  }

  function undo() {
    setPast((currentPast) => {
      if (currentPast.length === 0) return currentPast;

      const previousProject = currentPast[currentPast.length - 1];
      const newPast = currentPast.slice(0, -1);

      setProjectState((currentProject) => {
        setFuture((currentFuture) => [currentProject, ...currentFuture]);
        return previousProject;
      });

      return newPast;
    });
  }

  function redo() {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) return currentFuture;

      const nextProject = currentFuture[0];
      const newFuture = currentFuture.slice(1);

      setProjectState((currentProject) => {
        pushPast(currentProject);
        return nextProject;
      });

      return newFuture;
    });
  }

  function resetHistory(nextProject) {
    setProjectState(nextProject);
    setPast([]);
    setFuture([]);
  }

  return {
    project,
    setProject,
    undo,
    redo,
    resetHistory,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}