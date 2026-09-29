import { isMarkerCue } from './markers.js';

// Stato risultante dal salto a una battuta dall'elenco (doppio click): la battuta
// diventa quella in proiezione e selezionata, e lo schermo pulito viene disattivato
// come avviene con Precedente/Successivo. Restituisce null se l'indice non è proiettabile.
export function getCueJumpState(cues, index) {
  if (!Array.isArray(cues) || !Number.isInteger(index)) return null;
  if (index < 0 || index >= cues.length) return null;
  if (isMarkerCue(cues[index])) return null;
  return { projectedIndex: index, activeIndex: index, blackout: false };
}
