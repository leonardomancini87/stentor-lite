import { useCallback, useEffect, useRef, useState } from 'react';

import { buildProjectionPayload, getProjectionStorageKey, isStageAlive } from '../utils/projectionTargets.js';
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

// App desktop: chiede al programma di portare in primo piano la finestra di quello schermo
// (su Mac il «focus» chiesto dalla pagina non basta). Nel browser non fa nulla.
function bringStageToFront(screenId) {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return;
  import('@tauri-apps/api/core')
    .then(({ invoke }) => invoke('stentor_focus_stage', { screenId }))
    .catch(() => {});
}

// Finestre degli schermi di proiezione: apertura e aggiornamento del testo proiettato.
// Il testo arriva alla finestra in tre modi (chiamata diretta, postMessage, localStorage),
// così resta aggiornato anche se la finestra è stata ricaricata.
export function useProjection({ project, cue, language, blackout, testPattern = false, cardText = '', onBlocked }) {
  const windowsRef = useRef({});
  // Vero finché almeno una finestra di proiezione è aperta: aperta da qui, oppure viva per conto
  // suo (segnale di presenza), per esempio dopo che la regia è stata ricaricata.
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
      testPattern,
      cardText,
    }),
    projectTitle: project.title || '',
    ...overrides,
  }), [cue, language, blackout, testPattern, cardText, project.languages, project.primaryLanguage, project.title]);

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

  // Sempre l'ultima versione di publish e degli schermi, per gli invii ritardati di openScreen.
  const publishRef = useRef(publish);
  publishRef.current = publish;
  const screensRef = useRef(screens);
  screensRef.current = screens;

  const openScreen = useCallback((screen = activeScreen) => {
    publish(screen);
    // Schermo già aperto e vivo: non lo si ricarica (sarebbe un lampo nero in sala),
    // lo si riporta soltanto in primo piano.
    const existing = windowsRef.current[screen.id];
    if (existing && !existing.closed && isStageAlive(screen.id)) {
      try { existing.focus(); } catch { /* finestra in chiusura */ }
      bringStageToFront(screen.id);
      return existing;
    }
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
    bringStageToFront(screen.id);
    // La finestra impiega un momento a caricarsi: il testo le viene rimandato per qualche secondo.
    // Ogni invio usa battuta e stile del momento, non quelli di quando lo schermo è stato aperto:
    // altrimenti un «Avanti» dato subito dopo l'apertura verrebbe sovrascritto dal testo vecchio.
    [0, 100, 300, 700, 1500, 3000].forEach((delay) => {
      window.setTimeout(() => {
        const current = screensRef.current.find((item) => item.id === screen.id) || screen;
        publishRef.current(current);
      }, delay);
    });
    return stageWindow;
  }, [activeScreen, onBlocked, publish]);

  // Ogni cambio di battuta, lingua, buio o stile arriva a tutti gli schermi: anche una finestra
  // ricaricata, o aperta da sé con il suo indirizzo, legge il testo aggiornato dalla memoria locale.
  useEffect(() => {
    screens.forEach((screen) => publish(screen));
  }, [publish, project.settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Né la chiusura né l'apertura di una finestra avvisano: si controlla una volta al secondo.
  const screenIds = screens.map((screen) => screen.id).join('|');
  useEffect(() => {
    const check = () => {
      const openedHere = Object.values(windowsRef.current).some((stageWindow) => stageWindow && !stageWindow.closed);
      const alive = screenIds.split('|').some((screenId) => isStageAlive(screenId));
      setIsOpen(openedHere || alive);
    };
    check();
    const timer = window.setInterval(check, 1000);
    return () => window.clearInterval(timer);
  }, [screenIds]);

  return { openScreen, activeScreen, screens, isOpen };
}
