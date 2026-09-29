import { useState } from 'react';

// Buio in sala: lo schermo di proiezione resta nero finché non si torna a mostrare il testo.
export function useWorkspaceUi() {
  const [blackout, setBlackout] = useState(false);

  function toggleBlackout() {
    setBlackout((value) => !value);
  }

  function clearBlackout() {
    setBlackout(false);
  }

  return { blackout, setBlackout, toggleBlackout, clearBlackout };
}
