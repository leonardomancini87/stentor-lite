import { useEffect } from 'react';
import { getDefaultShortcuts, matchShortcut } from '../utils/keyboardShortcuts.js';

const DEFAULT_SHORTCUTS = getDefaultShortcuts();

function isTypingTarget(target) {
  if (!target) return false;

  const tagName = target.tagName;
  const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
  const isEditable = target.isContentEditable || target.closest?.('[contenteditable="true"]');

  return Boolean(isFormField || isEditable);
}

export function useKeyboardShortcuts({
  undo,
  redo,
  goNext,
  goPrevious,
  browseNext,
  browsePrevious,
  toggleBlackout,
  toggleFullscreen,
  viewMode,
  shortcuts = DEFAULT_SHORTCUTS,
}) {
  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const typing = isTypingTarget(target);
      const inEditor = viewMode === 'editor';

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();

        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }

        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      // Lascia libere le scorciatoie del browser e del sistema operativo
      // come Cmd+R, Cmd+Shift+R, Cmd+L, Cmd+W, Ctrl+R, ecc.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // Nella sezione Testo, Esc fa uscire dai campi: dopo Esc la barra
      // spaziatrice torna subito a scorrere le battute senza inserire spazi.
      if (typing && inEditor && event.key === 'Escape') {
        event.preventDefault();
        target.blur?.();
        return;
      }

      // Non rubare la barra spaziatrice mentre si sta scrivendo il copione.
      // Per scorrere da un campo testo: premere Esc, poi Spazio.
      if (typing) return;

      // Tasti personalizzabili dalla card "Scorciatoie".
      const actionId = matchShortcut(event, shortcuts, { inEditor });
      if (!actionId) return;
      const handlers = {
        next: goNext,
        previous: goPrevious,
        blackout: toggleBlackout,
        fullscreen: toggleFullscreen,
        browseNext,
        browsePrevious,
      };
      const handler = handlers[actionId];
      if (!handler) return;
      event.preventDefault();
      handler();
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [
    undo,
    redo,
    goNext,
    goPrevious,
    browseNext,
    browsePrevious,
    toggleBlackout,
    toggleFullscreen,
    viewMode,
    shortcuts,
  ]);
}
