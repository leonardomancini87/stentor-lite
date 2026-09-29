import { useState } from 'react';

// Stato "ridotta" delle card della colonna destra. All'apertura di Sténtor Lite sono
// tutte chiuse; durante la sessione lo stato resta anche cambiando pagina
// (è tenuto in memoria, non salvato: alla prossima apertura ripartono chiuse).
const sessionState = new Map();

export function useCardCollapsed(cardId) {
  const [collapsed, setCollapsed] = useState(() => (sessionState.has(cardId) ? sessionState.get(cardId) : true));

  function toggle() {
    setCollapsed((value) => {
      sessionState.set(cardId, !value);
      return !value;
    });
  }

  return [collapsed, toggle];
}
