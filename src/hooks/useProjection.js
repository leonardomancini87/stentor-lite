import { useCallback, useEffect, useRef, useState } from 'react';

import { buildProjectionPayload, getProjectionStorageKey } from '../utils/projectionTargets.js';
import { getActiveScreen, getScreenAspectOption, getScreens } from '../utils/screenSettings.js';

// Indirizzo della finestra dello schermo (public/public-stage.html), relativo alla base dell'app:
// funziona uguale nel browser, con `npm run dev` e nell'app desktop.
export function getStageWindowUrl(screenId) {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const params = new URLSearchParams({ i: screenId, t: Date.now().toString(36) });
  return `${normalizedBase}public-stage.html?${params.toString()}`;
}

export function getStageWindowName(screenId) {
  return `stentore-public-stage-${screenId}`;
}

// Finestre degli schermi di proiezione: apertura e aggiornamento del testo proiettato.
// Il testo arriva alla finestra in tre modi (chiamata diretta, postMessage, localStorage),
// così resta aggiornato anche se la finestra è stata ricaricata.
export function useProjection({ project, cue, language, blackout, onBlocked }) {
  const windowsRef = useRef({});
  // Vero finché almeno una finestra di proiezione aperta da qui è ancora aperta.
  const [isOpen, setIsOpen] = useState(false);
  const screens = getScreens(project.settings);
  const activeScreen = getActiveScreen(project.settings);

  const buildPayload = useCallback((screen, overrides = {}) => ({
    ...buildProjectionPayload({
      cue,
      screen,
      activeLanguage: language,
      languages: project.languages,
      primaryLanguage: project.primaryLanguage,
      blackout,
    }),
    projectTitle: project.title || '',
    ...overrides,
  }), [cue, language, blackout, project.languages, project.primaryLanguage, project.title]);

  const publish = useCallback((screen, payload = buildPayload(screen)) => {
    const screenId = screen?.id || payload.screenId;
    try {
      window.localStorage.setItem(getProjectionStorageKey(screenId), JSON.stringify(payload));
    } catch {
      // Memoria locale non disponibile (es. navigazione privata): resta il messaggio diretto.
    }

    const stageWindow = windowsRef.current[screenId];
    if (!stageWindow || stageWindow.closed) return;
    try {
      stageWindow.__STENTORE_APPLY_PUBLIC_PAYLOAD?.(payload);
    } catch {
      // La finestra potrebbe non aver ancora finito di caricarsi.
    }
    try {
      stageWindow.postMessage({ type: 'OPENSURTITLES_PUBLIC_STAGE_UPDATE', screenId, payload }, '*');
    } catch {
      // Errori momentanei della finestra durante lo spettacolo: si ignorano.
    }
  }, [buildPayload]);

  const openScreen = useCallback((screen = activeScreen) => {
    publish(screen);
    const aspect = getScreenAspectOption(screen.publicAspectRatio);
    const stageWindow = window.open(
      getStageWindowUrl(screen.id),
      getStageWindowName(screen.id),
      `popup=yes,width=${aspect.width},height=${aspect.height}`
    );
    if (!stageWindow) {
      onBlocked?.();
      return null;
    }
    windowsRef.current[screen.id] = stageWindow;
    setIsOpen(true);
    stageWindow.focus();
    [0, 100, 300, 700, 1500, 3000].forEach((delay) => {
      window.setTimeout(() => publish(screen), delay);
    });
    return stageWindow;
  }, [activeScreen, onBlocked, publish]);

  // Ogni cambio di battuta, lingua, buio o stile arriva a tutti gli schermi: anche una finestra
  // ricaricata, o aperta da sé con il suo indirizzo, legge il testo aggiornato dalla memoria locale.
  useEffect(() => {
    screens.forEach((screen) => publish(screen));
  }, [publish, project.settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // La chiusura di una finestra non avvisa: si controlla una volta al secondo.
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setInterval(() => {
      const anyOpen = Object.values(windowsRef.current).some((stageWindow) => stageWindow && !stageWindow.closed);
      if (!anyOpen) setIsOpen(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  return { openScreen, activeScreen, screens, isOpen };
}
