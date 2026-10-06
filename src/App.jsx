import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, Monitor, Moon, Search, SkipBack, SkipForward } from 'lucide-react';
import { convertStentorProProject, isStentorProProject } from './utils/stentorProImport.js';
import ShowMap from './components/ShowMap.jsx';
import LanguagesDialog from './components/LanguagesDialog.jsx';
import LanguageSwitcher from './components/LanguageSwitcher.jsx';
import { getLanguageName, removeProjectLanguage, setPrimaryProjectLanguage } from './utils/projectLanguages.js';
import ToolsCard from './components/ToolsCard.jsx';
import TimeCard from './components/TimeCard.jsx';
import {
  addPerformance,
  changeSection,
  clearCueTimings,
  closeCueTiming,
  countTimedCues,
  createTimer,
  cueHasTime,
  finishTimer,
  formatDuration,
  getElapsed,
  pauseTimer,
  stampCueChange,
  startTimer,
} from './utils/showTimer.js';
import { saveTimingBackup } from './utils/timingBackup.js';

import { demoProject } from './lib/demoProject.js';

import {
  deleteArchivedProject,
  duplicateArchivedProject,
  loadProject,
  loadProjectArchive,
  loadProjectById,
  refreshBuiltInDemo,
  saveProject,
  updateArchivedProject,
} from './utils/projectPersistence.js';
import { downloadJson } from './lib/storage.js';
import {
  chooseProjectSaveHandle,
  createBlankProject,
  getProjectDownloadName,
  readProjectFile,
  writeProjectFileHandle,
} from './utils/projectFiles.js';
import { normalizeCue, normalizeProject, withProjectMetadata } from './utils/projectSchema.js';
import { toggleFullscreen } from './utils/fullscreen.js';
import { getInitialAppLanguage, saveAppLanguage, isRtlLanguage } from './utils/appLanguage.js';
import { getInitialAppTheme, saveAppTheme } from './utils/appTheme.js';
import { findNextPlayableIndex, getMarkerJumpIndex, getMarkerTitle, isMarkerCue } from './utils/markers.js';
import {
  buildShowMap,
  findIndexByCueNumber,
  findMarkerTargetByText,
  findSectionForIndex,
  formatCueNumber,
  getCueNumbers,
} from './utils/showMap.js';
import { getCueJumpState } from './utils/cueJump.js';
import { getRevealScrollTop } from './utils/listScroll.js';
import { FONT_FAMILY_OPTIONS, getActiveScreen, getPublicSettings, getScreenSecondLanguage } from './utils/screenSettings.js';
import { getSecondProjectionText } from './utils/projectionTargets.js';
import { STAGE_COMMAND_STORAGE_KEY, STAGE_COMMAND_TYPE, normalizeStageCommand } from './utils/stageCommands.js';

import { useProjectHistory } from './hooks/useProjectHistory.js';
import { useAutosave } from './hooks/useAutosave.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';
import { useCueNavigation } from './hooks/useCueNavigation.js';
import { useCueActions } from './hooks/useCueActions.js';
import { useTimedPlayback } from './hooks/useTimedPlayback.js';
import { useProjection } from './hooks/useProjection.js';
import { useWorkspaceUi } from './hooks/useWorkspaceUi.js';

import Sidebar from './components/Sidebar.jsx';
import ScreensPage from './components/ScreensPage.jsx';
import InlineCueTextEditor from './components/InlineCueTextEditor.jsx';
import CueRowEditor from './components/CueRowEditor.jsx';
import CueStructuralToolbar from './components/CueStructuralToolbar.jsx';
import CueRowAnnotation from './components/CueRowAnnotation.jsx';
import { importWordScriptAsProject } from './utils/wordScriptImport.js';
import { getImportKind, importFileAsProject } from './utils/fileImport.js';
import { buildWordImportSummaryDialog } from './utils/voiceMessages.js';
import { normalizeVoice } from './utils/cueVoices.js';
import { getCueText, getCueTypography } from './utils/cueTextStyle.js';
import { getCueTextSpans } from './utils/inlineStyleSpans.js';
import StageSubtitle from './components/StageSubtitle.jsx';
import StageFrame from './components/StageFrame.jsx';
import ScreenPreview from './components/ScreenPreview.jsx';
import ShortcutsCard from './components/ShortcutsCard.jsx';
import { I18nProvider, translate } from './i18n/index.js';
import { getDefaultShortcuts, loadShortcuts, saveShortcuts } from './utils/keyboardShortcuts.js';
import StentoreDialog from './components/StentoreDialog.jsx';
import StentoreErrorBoundary from './components/StentoreErrorBoundary.jsx';
import DesktopDashboard from './components/DesktopDashboard.jsx';
import DesktopPreferences from './components/DesktopPreferences.jsx';
import useAppUpdates from './hooks/useAppUpdates.js';
import { getWindowTitle } from './utils/windowTitle.js';
import PageHeader from './components/PageHeader.jsx';

const RIGHT_SIDEBAR_STORAGE_KEY = 'stentor.rightSidebar.collapsed.v1';
const SHOW_TIMER_STORAGE_KEY = 'stentor.showTimer.v1';
const TIMING_MODE_KEY = 'stentor.timingMode.v1'; // manual | record | play

// Il cronometro sopravvive a un ricaricamento della pagina (stesso progetto).
function loadShowTimer(projectId) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SHOW_TIMER_STORAGE_KEY) || 'null');
    if (saved?.projectId === projectId && saved.timer?.status) return saved.timer;
  } catch {
    // Memoria locale non disponibile.
  }
  return createTimer(null);
}

function loadRightSidebarCollapsed() {
  try {
    return window.localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function getClickCaretOffset(event) {
  const { clientX: x, clientY: y } = event;
  let node = null;
  let offset = 0;
  if (typeof document.caretPositionFromPoint === 'function') {
    const position = document.caretPositionFromPoint(x, y);
    node = position?.offsetNode ?? null;
    offset = position?.offset ?? 0;
  } else if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y);
    node = range?.startContainer ?? null;
    offset = range?.startOffset ?? 0;
  }
  const textElement = event.currentTarget.querySelector('.liteEditableCueBody > span');
  if (!node || node.nodeType !== Node.TEXT_NODE || !textElement?.contains(node)) return null;
  return offset;
}

async function invokeTauriCommand(command, args = {}) {
  if (typeof window === 'undefined' || !window.__TAURI_INTERNALS__) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke(command, args);
}


export default function App() {
  const initialProject = useMemo(
    () => {
      refreshBuiltInDemo(demoProject);
      return loadProject() || demoProject;
    },
    []
  );
  const [projects, setProjects] = useState(() => loadProjectArchive());

  const {
    project,
    setProject,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  } = useProjectHistory(initialProject);

  const {
    isDirty,
    markSaved,
  } = useAutosave(project);

  const {
    activeIndex,
    setActiveIndex,
    resetNavigation,
  } = useCueNavigation(project.cues.length);

  const {
    blackout,
    setBlackout,
    toggleBlackout,
    clearBlackout,
  } = useWorkspaceUi();

  const activeTextareaRef = useRef(null);
  const editorStagePreviewRef = useRef(null);
  const [editorPreviewOpen, setEditorPreviewOpen] = useState(false);
  const [viewMode, setViewMode] = useState('dashboard');
  const updates = useAppUpdates();
  const [appLanguage, setAppLanguage] = useState(getInitialAppLanguage);
  // Testi dell'interfaccia per chiave (vedi src/i18n).
  const ui = useCallback((key, vars) => translate(appLanguage, key, vars), [appLanguage]);
  const [appTheme, setAppTheme] = useState(getInitialAppTheme);
  const [nativeProjectPath, setNativeProjectPath] = useState(null);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(loadRightSidebarCollapsed);
  // Finestra Lingue del progetto: id del progetto da gestire (quello aperto o uno dell'archivio).
  const [languagesDialogProjectId, setLanguagesDialogProjectId] = useState(null);
  const [showTimer, setShowTimer] = useState(() => loadShowTimer(initialProject?.id));
  const [timingMode, setTimingMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(TIMING_MODE_KEY);
      return saved === 'record' || saved === 'play' ? saved : 'manual';
    } catch {
      return 'manual';
    }
  });
  const [archivedLanguagesProject, setArchivedLanguagesProject] = useState(null);
  const [goToQuery, setGoToQuery] = useState('');
  const [goToMissed, setGoToMissed] = useState(false);
  const goToInputRef = useRef(null);
  const [projectedIndex, setProjectedIndex] = useState(0);
  const [editingCue, setEditingCue] = useState(null);
  const [expandedCueId, setExpandedCueId] = useState(null);
  const cueListRef = useRef(null);
  // Tasto G: porta il cursore nel campo Vai a (mai mentre si scrive).
  useEffect(() => {
    function onGoToKey(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key !== 'g' && event.key !== 'G') return;
      const target = event.target;
      const tag = (target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      if (!goToInputRef.current) return;
      event.preventDefault();
      goToInputRef.current.focus();
    }
    window.addEventListener('keydown', onGoToKey);
    return () => window.removeEventListener('keydown', onGoToKey);
  }, []);
  const [cueListRevealTick, setCueListRevealTick] = useState(0);
  const splitSelectionByCueRef = useRef(new Map());
  const [, setSplitSelectionRevision] = useState(0);

  function rememberSplitSelection(selection) {
    if (!selection?.cueId || !selection.language || !Number.isInteger(selection.cursor)) return;
    splitSelectionByCueRef.current.set(selection.cueId, selection);
    setSplitSelectionRevision((value) => value + 1);
  }

  // Expansion is an interface preference, not a selection/projection change.
  useEffect(() => {
    setExpandedCueId(null);
    setEditingCue(null);
    splitSelectionByCueRef.current.clear();
    setSplitSelectionRevision((value) => value + 1);
  }, [project.id, viewMode]);

  useEffect(() => {
    if (expandedCueId !== null && !project.cues.some((cue, index) => normalizeCue(cue, index).id === expandedCueId)) {
      setExpandedCueId(null);
    }
  }, [expandedCueId, project.cues]);

  // Reveal at most the expanded item, never scroll the page or the other panels.
  // If taller than the list, align its header and let the operator scroll within it.
  useLayoutEffect(() => {
    if (expandedCueId === null) return;
    const list = cueListRef.current;
    const index = project.cues.findIndex((cue, i) => normalizeCue(cue, i).id === expandedCueId);
    const item = list?.querySelector(`[data-cue-index="${index}"]`)?.parentElement;
    if (!list || !item) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    list.scrollTop = getRevealScrollTop({
      scrollTop: list.scrollTop, viewportHeight: list.clientHeight, scrollHeight: list.scrollHeight,
      itemTop: itemRect.top - listRect.top + list.scrollTop, itemHeight: itemRect.height,
      isFirst: list.firstElementChild === item, isLast: list.lastElementChild === item,
    });
  }, [expandedCueId]); // Do not scroll on typing, ordinary clicks or double clicks.

  // Barra laterale destra: comprimibile da una freccia globale, speculare a quella sinistra.
  // Presente nelle pagine che hanno una colonna destra (Progetti, Sopratitoli, Schermi).
  const hasRightSidebar =
    viewMode === 'dashboard' ||
    viewMode === 'editor' ||
    viewMode === 'screens';
  const isRightSidebarCollapsed = hasRightSidebar && rightSidebarCollapsed;

  useEffect(() => {
    try {
      window.localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, rightSidebarCollapsed ? '1' : '0');
    } catch {
      // Memoria locale non disponibile: lo stato vale solo per questa sessione.
    }
  }, [rightSidebarCollapsed]);

  // Titolo della finestra: il nome del progetto aperto (vedi utils/windowTitle.js).
  const windowTitle = getWindowTitle(project.title, { untitled: ui('nav.untitled') });
  useEffect(() => {
    document.title = windowTitle;
    if (!window.__TAURI_INTERNALS__) return;
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => getCurrentWindow().setTitle(windowTitle))
      .catch(() => {});
  }, [windowTitle]);

  // La freccia destra sta in alto nella colonna destra, sulla riga indicata da
  // [data-right-toggle-anchor]. A colonna ridotta resta alla stessa altezza, nella striscia laterale.
  const rightToggleCenters = useRef({});
  useLayoutEffect(() => {
    if (!hasRightSidebar) return undefined;
    const rootStyle = document.documentElement.style;
    function alignRightToggle() {
      const anchor = document.querySelector('[data-right-toggle-anchor]');
      const rect = anchor?.getBoundingClientRect();
      if (rect && rect.height) {
        const paddingRight = parseFloat(window.getComputedStyle(anchor).paddingRight) || 0;
        const center = Math.round(rect.top + rect.height / 2);
        const right = Math.round(window.innerWidth - rect.right + Math.max(0, paddingRight - 6));
        rightToggleCenters.current[viewMode] = center;
        rootStyle.setProperty('--stentor-right-toggle-center', `${center}px`);
        rootStyle.setProperty('--stentor-right-toggle-right', `${right}px`);
        return;
      }
      // Colonna ridotta: la riga non è visibile, si riusa l'ultima altezza misurata in questa pagina.
      rootStyle.removeProperty('--stentor-right-toggle-right');
      const saved = rightToggleCenters.current[viewMode];
      if (saved) rootStyle.setProperty('--stentor-right-toggle-center', `${saved}px`);
      else rootStyle.removeProperty('--stentor-right-toggle-center');
    }
    alignRightToggle();
    const frame = window.requestAnimationFrame(alignRightToggle);
    // Qualsiasi cambio di dimensione nella pagina (testi, font, card ridotte) può spostare la riga.
    const main = document.querySelector('.appShell > .main');
    const observer = typeof ResizeObserver === 'function' && main ? new ResizeObserver(alignRightToggle) : null;
    observer?.observe(main);
    document.fonts?.ready?.then(alignRightToggle).catch(() => {});
    const settle = window.setTimeout(alignRightToggle, 400);
    window.addEventListener('resize', alignRightToggle);
    window.addEventListener('scroll', alignRightToggle, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      observer?.disconnect();
      window.removeEventListener('resize', alignRightToggle);
      window.removeEventListener('scroll', alignRightToggle, true);
    };
  }, [hasRightSidebar, isRightSidebarCollapsed, leftSidebarCollapsed, viewMode]);


  useEffect(() => {
    saveAppLanguage(appLanguage);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = appLanguage;
      document.documentElement.dir = isRtlLanguage(appLanguage) ? 'rtl' : 'ltr';
      document.documentElement.dataset.appLanguage = appLanguage;
    }
  }, [appLanguage]);

  useEffect(() => {
    saveAppTheme(appTheme);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.appTheme = appTheme;
    }
  }, [appTheme]);

  const [dialog, setDialog] = useState(null);
  const [projectFileHandle, setProjectFileHandle] = useState(null);
  const lastStageCommandIdRef = useRef(null);
  const dialogResolverRef = useRef(null);

  function openDialog(config) {
    return new Promise((resolve) => {
      dialogResolverRef.current = resolve;
      setDialog(config.trapFocus ? { ...config, restoreFocusTo: document.activeElement } : config);
    });
  }

  function closeDialog(value) {
    const resolver = dialogResolverRef.current;
    dialogResolverRef.current = null;
    setDialog(null);
    resolver?.(value);
  }

  const dialogs = useMemo(() => ({
    alert: (config) => openDialog({ kind: 'alert', confirmLabel: 'OK', ...config }),
    confirm: (config) => openDialog({ kind: 'confirm', ...config }),
    input: (config) => openDialog({ kind: 'input', ...config }),
    marker: (config = {}) => openDialog({ kind: 'marker', ...config }),
    language: (config = {}) => openDialog({ kind: 'language', ...config }),
    choice: (config = {}) => openDialog({ kind: 'choice', ...config }),
    projectDetails: (config = {}) => openDialog({ kind: 'projectDetails', ...config }),
  }), []);

  const language =
    project.activeLanguage || 'it';

  const activeCue = useMemo(() => {
    const cue = project.cues[activeIndex] || project.cues[0] || null;
    return cue ? normalizeCue(cue, Math.max(0, activeIndex)) : null;
  }, [project.cues, activeIndex]);

  const projectedCue = useMemo(() => {
    const cue = project.cues[projectedIndex] || project.cues[0] || null;
    return cue ? normalizeCue(cue, Math.max(0, projectedIndex)) : null;
  }, [project.cues, projectedIndex]);

  useEffect(() => {
    // La proiezione non resta mai su un marcatore (es. dopo un Annulla): passa alla battuta successiva.
    setProjectedIndex((index) => {
      const clamped = Math.max(0, Math.min(index, project.cues.length - 1));
      return isMarkerCue(project.cues[clamped]) ? findNextPlayableIndex(project.cues, clamped) : clamped;
    });
  }, [project.cues]);

  const publicSettings = getPublicSettings(project.settings);
  const toolsScreenColors = useMemo(
    () => ({ text: publicSettings.publicTextColor, background: publicSettings.publicBackground }),
    [publicSettings.publicTextColor, publicSettings.publicBackground]
  );
  const editorPreviewText =
    activeCue && !isMarkerCue(activeCue)
      ? activeCue.translations?.[language] || activeCue.original || ''
      : '';

  const {
    updateProject,
    updateCue,
    updateTranslation,
    changeCueVoice,
    addCue,
    addCueAfter,
    addMarker,
    editMarker,
    deleteMarker,
    deleteCueWithConfirm,
    splitCueAtCursor,
    splitCueAtSelection,
    mergeWithNext,
  } = useCueActions({
    project,
    setProject,
    language,
    activeIndex,
    activeTextareaRef,
    setActiveIndex,
    projectedIndex,
    setProjectedIndex,
    setExpandedCueId,
    setEditingCue,
    dialogs,
    appLanguage,
  });

  const {
    isPlaying: isSemiAutoPlaying,
    playbackTime,
    startFrom: startTimelineHere,
    pause: pauseSemiAuto,
  } = useTimedPlayback({
    cues: project.cues,
    activeIndex: projectedIndex,
    setActiveIndex: setProjectedIndex,
    clearBlackout,
  });

  // Finestre degli schermi di proiezione (pagina Schermi e pulsante Proiezione).
  const showProjectionBlocked = useCallback(() => {
    dialogs.alert({
      title: ui('screens.dialog.blocked.title'),
      message: ui('screens.dialog.blocked.message'),
    });
  }, [dialogs, ui]);
  const projection = useProjection({
    project,
    cue: projectedCue,
    language,
    blackout,
    onBlocked: showProjectionBlocked,
  });


  async function createNewProject() {
    if (isDirty) {
      saveProject(project);
    }

    const title = await dialogs.input({
      title: ui('projects.dialog.new.title'),
      message: ui('projects.dialog.new.message'),
      inputLabel: ui('projects.dialog.new.label'),
      defaultValue: ui('projects.dialog.new.default'),
      confirmLabel: ui('projects.dialog.new.confirm'),
      required: true,
    });

    if (!title) return;

    const nextProject = createBlankProject(title);
    resetHistory(nextProject);
    markSaved(nextProject);
    setProjects(loadProjectArchive());
    resetNavigation();
    setProjectedIndex(0);
    setBlackout(false);
    setProjectFileHandle(null);
  }

  async function switchProject(projectId) {
    if (!projectId || projectId === project.id) return;

    if (isDirty) {
      saveProject(project);
    }

    const nextProject = loadProjectById(projectId);
    if (!nextProject) {
      dialogs.alert({
        title: ui('projects.dialog.notFound.title'),
        message: ui('projects.dialog.notFound.message'),
      });
      return;
    }

    resetHistory(nextProject);
    markSaved(nextProject);
    setProjects(loadProjectArchive());
    resetNavigation();
    setProjectedIndex(0);
    setBlackout(false);
    setProjectFileHandle(null);
  }

  // Cronometro della recita: un progetto diverso ha il suo cronometro.
  const showTimerProjectRef = useRef(project.id);
  useEffect(() => {
    if (showTimerProjectRef.current === project.id) return;
    showTimerProjectRef.current = project.id;
    lastStampedIndexRef.current = null;
    setShowTimer(loadShowTimer(project.id));
  }, [project.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SHOW_TIMER_STORAGE_KEY, JSON.stringify({ projectId: showTimerProjectRef.current, timer: showTimer }));
    } catch {
      // Memoria locale non disponibile: il cronometro vale solo per questa sessione.
    }
  }, [showTimer]);

  // ---- Tempi delle battute: Manuale / Registra / Riproduci (card Tempi) ----
  const lastStampedIndexRef = useRef(null);
  useEffect(() => {
    try { window.localStorage.setItem(TIMING_MODE_KEY, timingMode); } catch { /* solo sessione */ }
    if (timingMode !== 'record') lastStampedIndexRef.current = null;
    if (timingMode !== 'play' && isSemiAutoPlaying) pauseSemiAuto();
  }, [timingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Registra: con il cronometro avviato, ogni battuta che entra in proiezione riceve il suo orario.
  useEffect(() => {
    if (timingMode !== 'record' || showTimer.status !== 'running') return;
    const from = lastStampedIndexRef.current;
    if (from === projectedIndex) return;
    const seconds = getElapsed(showTimer, Date.now()) / 1000;
    lastStampedIndexRef.current = projectedIndex;
    setProject((current) => {
      const next = { ...current, cues: stampCueChange(current.cues, from ?? -1, projectedIndex, seconds) };
      saveTimingBackup(next, language, projectedIndex);
      return next;
    }, { skipHistory: true });
  }, [projectedIndex, timingMode, showTimer.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Riproduci: le battute avanzano da sole seguendo i tempi registrati. Se l'operatore
  // interviene (Avanti, Indietro, clic, Vai a), la riproduzione riparte dal tempo di quella battuta;
  // se la battuta non ha un tempo, la riproduzione si ferma.
  useEffect(() => {
    if (timingMode !== 'play' || !isSemiAutoPlaying) return;
    if (cueHasTime(project.cues[projectedIndex])) startTimelineHere(projectedIndex);
    else pauseSemiAuto();
  }, [projectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  function startPlayback() {
    if (!cueHasTime(project.cues[projectedIndex])) return;
    startTimelineHere(projectedIndex);
  }

  function finishShowTimer() {
    const now = Date.now();
    if (timingMode === 'record' && showTimer.status !== 'idle' && lastStampedIndexRef.current !== null) {
      const seconds = getElapsed(showTimer, now) / 1000;
      const index = lastStampedIndexRef.current;
      setProject((current) => ({ ...current, cues: closeCueTiming(current.cues, index, seconds) }), { skipHistory: true });
    }
    lastStampedIndexRef.current = null;
    const { timer, performance } = finishTimer(showTimer, now);
    setShowTimer(timer);
    if (performance) {
      setProject((current) => ({ ...current, performances: addPerformance(current.performances, performance) }), { skipHistory: true });
    }
  }

  async function clearRecordedTimings() {
    const confirmed = await dialogs.confirm({
      title: ui('time.dialog.clear.title'),
      message: ui('time.dialog.clear.message'),
      confirmLabel: ui('time.dialog.clear.confirm'),
      cancelLabel: ui('common.cancel'),
      variant: 'danger',
      trapFocus: true,
    });
    if (!confirmed) return;
    if (isSemiAutoPlaying) pauseSemiAuto();
    lastStampedIndexRef.current = null;
    setProject((current) => ({ ...current, cues: clearCueTimings(current.cues) }), { skipHistory: true });
  }

  async function resetShowTimer() {
    const confirmed = await dialogs.confirm({
      title: ui('time.dialog.reset.title'),
      message: ui('time.dialog.reset.message'),
      confirmLabel: ui('time.dialog.reset.confirm'),
      cancelLabel: ui('common.cancel'),
      variant: 'danger',
      trapFocus: true,
    });
    if (confirmed) {
      lastStampedIndexRef.current = null;
      setShowTimer((timer) => createTimer(timer.section));
    }
  }

  function openLanguagesDialog(projectId = project.id) {
    const targetId = projectId || project.id;
    if (targetId !== project.id) {
      const source = loadProjectById(targetId);
      if (!source) return;
      setArchivedLanguagesProject(source);
    } else {
      setArchivedLanguagesProject(null);
    }
    setLanguagesDialogProjectId(targetId);
  }

  // Tasto destro su una lingua nella lista battute: elimina con conferma (si può annullare).
  async function deleteProjectLanguage(code) {
    if ((project.languages || []).length <= 1) return;
    const confirmed = await dialogs.confirm({
      title: ui('langs.delete.title'),
      message: `${ui('langs.delete.message', { language: getLanguageName(project, code), project: project.title || ui('langs.thisProject') })} ${ui('common.undoHint')}`,
      confirmLabel: ui('common.delete'),
      cancelLabel: ui('common.cancel'),
      variant: 'danger',
      trapFocus: true,
    });
    if (!confirmed) return;
    setProject((current) => removeProjectLanguage(current, code).project);
  }

  function closeLanguagesDialog() {
    setLanguagesDialogProjectId(null);
    setArchivedLanguagesProject(null);
  }

  // Progetto non aperto: le modifiche alle lingue vanno direttamente nell'archivio.
  function updateArchivedLanguages(updater) {
    const targetId = languagesDialogProjectId;
    if (!targetId) return;
    let nextProject = null;
    updateArchivedProject(targetId, (current) => {
      nextProject = typeof updater === 'function' ? updater(current) : updater;
      return nextProject || current;
    });
    const refreshed = loadProjectById(targetId);
    setArchivedLanguagesProject(refreshed || nextProject);
    setProjects(loadProjectArchive());
  }

  async function editProjectDetails(projectId) {
    const source = loadProjectById(projectId);
    if (!source) return;

    const details = await dialogs.projectDetails({
      title: ui('projects.dialog.details.title'),
      message: ui('projects.dialog.details.message'),
      defaultTitle: source.title || ui('projects.untitled'),
      defaultCompany: source.company || '',
      defaultAuthor: source.author || source.authorName || source.projectAuthor || source.playwright || source.metadata?.author || source.metadata?.projectAuthor || '',
      confirmLabel: ui('common.save'),
      requiredTitle: true,
    });

    if (!details) return;

    const nextProject = {
      ...source,
      title: details.title.trim() || source.title,
      company: details.company.trim(),
      author: details.author.trim(),
      authorName: details.author.trim(),
      projectAuthor: details.author.trim(),
    };

    updateArchivedProject(projectId, () => nextProject);
    if (projectId === project.id) {
      resetHistory(nextProject);
      markSaved(nextProject);
    }
    setProjects(loadProjectArchive());
  }


  function readProjectCoverImage(file) {
    return new Promise((resolve, reject) => {
      const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
      const allowedExtensions = /\.(jpe?g|png|webp)$/i;
      const fileType = String(file?.type || '').toLowerCase();
      const fileName = String(file?.name || '');

      if (!file || (!allowedTypes.has(fileType) && !allowedExtensions.test(fileName))) {
        reject(new Error(ui('projects.dialog.image.format')));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        if (!result.startsWith('data:image/')) {
          reject(new Error('Il file scelto non sembra essere un’immagine valida.'));
          return;
        }
        resolve(result);
      };
      reader.onerror = () => reject(new Error(ui('projects.dialog.image.message')));
      reader.readAsDataURL(file);
    });
  }

  async function updateProjectCover(projectId, file) {
    const source = loadProjectById(projectId);
    if (!source || !file) return;

    try {
      const coverImage = await readProjectCoverImage(file);
      const nextProject = {
        ...source,
        coverImage,
        coverImageName: file.name,
        updatedAt: Date.now(),
      };

      updateArchivedProject(projectId, () => nextProject);
      if (projectId === project.id) {
        resetHistory(nextProject);
        markSaved(nextProject);
      }
      setProjects(loadProjectArchive());
    } catch (error) {
      dialogs.alert({
        title: ui('projects.dialog.image.title'),
        message: error?.message || ui('projects.dialog.image.message'),
      });
    }
  }

  async function duplicateProject(projectId) {
    if (isDirty) {
      saveProject(project);
    }

    const copy = duplicateArchivedProject(projectId);
    if (!copy) return;

    resetHistory(copy);
    markSaved(copy);
    setProjects(loadProjectArchive());
    resetNavigation();
    setProjectedIndex(0);
    setBlackout(false);
    setProjectFileHandle(null);
  }

  async function exportProject(projectId) {
    const source = loadProjectById(projectId);
    if (!source) return;
    downloadJson(getProjectDownloadName(source), withProjectMetadata(source));
  }

  async function deleteProject(projectId) {
    const source = loadProjectById(projectId);
    if (!source) return;

    const confirmed = await dialogs.confirm({
      title: ui('projects.dialog.delete.title'),
      message: ui('projects.dialog.delete.message', { title: source.title || ui('projects.dialog.thisShow') }),
      confirmLabel: ui('common.delete'),
      destructive: true,
    });

    if (!confirmed) return;

    const nextArchive = deleteArchivedProject(projectId);
    setProjects(nextArchive);

    if (projectId === project.id) {
      const fallback = nextArchive[0] || createBlankProject(ui('projects.newShow'));
      resetHistory(fallback);
      markSaved(fallback);
      resetNavigation();
      setProjectedIndex(0);
      setBlackout(false);
      setProjectFileHandle(null);
    }
  }

  async function openProjectFile(event) {
    const importKind = getImportKind(event?.target?.files?.[0]?.name || '');
    const isWord = importKind === 'word';
    try {
      let nextProject = null;
      let nextNativePath = null;
      let shouldClearInput = false;
      let wordSummary = null;
      let fileSummary = null;

      if (event?.target?.files) {
        const file = event.target.files?.[0];
        if (!file) return;
        shouldClearInput = true;
        if (isWord) {
          const imported = await importWordScriptAsProject(file, project);
          nextProject = imported.project;
          wordSummary = imported.summary;
        } else if (importKind && importKind !== 'project') {
          // Tabelle (Excel, CSV), presentazioni PowerPoint, sottotitoli SRT/VTT e testo.
          const imported = await importFileAsProject(file, project, {
            languageLabel: (n) => ui('import.language.n', { n }),
          });
          nextProject = imported.project;
          fileSummary = imported.summary;
        } else {
          nextProject = await readProjectFile(file);
        }
      } else {
        const result = await invokeTauriCommand('stentor_open_project_file');
        if (!result) return;
        nextProject = normalizeProject(
          isStentorProProject(result.project) ? convertStentorProProject(result.project, result.path || '').project : result.project
        );
        nextNativePath = result.path || null;
        if (!nextProject || !Array.isArray(nextProject.cues)) {
          throw new Error('File progetto non valido');
        }
      }

      if (isDirty) {
        const confirmed = await dialogs.confirm({
          title: ui('projects.dialog.import.title'),
          message: ui('projects.dialog.import.message'),
          confirmLabel: ui('projects.dialog.import.confirm'),
        });

        if (!confirmed) return;
      }

      saveProject(nextProject);
      resetHistory(nextProject);
      markSaved(nextProject);
      setProjects(loadProjectArchive());
      resetNavigation();
      setProjectedIndex(0);
      setBlackout(false);
      setProjectFileHandle(null);
      setNativeProjectPath(nextNativePath);
      if (wordSummary) dialogs.alert(buildWordImportSummaryDialog(wordSummary, appLanguage));
      if (fileSummary) {
        const details = [
          ui('import.summary.message', {
            cues: ui('count.cues', { count: fileSummary.cues }),
            file: fileSummary.file,
            languages: fileSummary.languages.join(', '),
          }),
        ];
        if (fileSummary.markers) details.push(ui('import.summary.markers', { count: fileSummary.markers }));
        if (fileSummary.kind === 'slides') details.push(ui('import.summary.slides'));
        if (fileSummary.timed) details.push(ui('import.summary.timed'));
        dialogs.alert({ title: ui('import.summary.title'), message: details.join('\n\n') });
      }

      if (shouldClearInput && event?.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('Apertura progetto non riuscita:', error);
      dialogs.alert({
        title: ui('projects.dialog.importFailed.title'),
        message: error?.code === 'empty'
          ? ui('import.error.empty')
          : isWord
            ? ui('projects.dialog.importFailed.word')
            : importKind && importKind !== 'project'
              ? ui('import.error.file')
              : ui('projects.dialog.importFailed.project'),
      });
    } finally {
      if (event?.target) event.target.value = '';
    }
  }

  async function saveProjectFile({ saveAs = false } = {}) {
    const projectToSave = withProjectMetadata(project);

    try {
      const suggestedName = getProjectDownloadName(projectToSave);
      const nativeResultPath = await invokeTauriCommand('stentor_save_project_file', {
        payload: projectToSave,
        suggestedName,
        path: nativeProjectPath,
        forceSaveAs: saveAs || !nativeProjectPath,
      });

      if (nativeResultPath !== null) {
        if (!nativeResultPath) return;
        setNativeProjectPath(nativeResultPath);
        setProjectFileHandle(null);
        markSaved(projectToSave);
        return;
      }

      if (window.showSaveFilePicker) {
        const handle = saveAs || !projectFileHandle
          ? await chooseProjectSaveHandle(projectToSave)
          : projectFileHandle;

        if (!handle) return;

        await writeProjectFileHandle(handle, projectToSave);
        setProjectFileHandle(handle);
        setNativeProjectPath(null);
        markSaved(projectToSave);
        return;
      }

      let downloadName = suggestedName;

      if (saveAs || !projectFileHandle) {
        const requestedName = await dialogs.input({
          title: saveAs ? ui('projects.dialog.saveAs.title') : ui('projects.dialog.save.title'),
          message: ui('projects.dialog.save.message'),
          inputLabel: ui('projects.dialog.save.label'),
          defaultValue: downloadName,
          confirmLabel: ui('common.save'),
          required: true,
        });

        if (!requestedName) return;
        downloadName = getProjectDownloadName({ title: requestedName }, requestedName);
      }

      downloadJson(downloadName, projectToSave);
      markSaved(projectToSave);
    } catch (error) {
      if (error?.name === 'AbortError') return;

      console.error('Salvataggio progetto non riuscito:', error);
      dialogs.alert({
        title: ui('projects.dialog.saveFailed.title'),
        message: ui('projects.dialog.saveFailed.message'),
      });
    }
  }

  function findPlayableIndex(fromIndex, direction) {
    let index = fromIndex + direction;
    while (index >= 0 && index < project.cues.length) {
      if (!isMarkerCue(project.cues[index])) return index;
      index += direction;
    }
    return Math.max(0, Math.min(fromIndex, project.cues.length - 1));
  }

  function projectCue(direction) {
    setProjectedIndex((current) => {
      const next = findPlayableIndex(current, direction);
      setActiveIndex(next);
      clearBlackout();
      return next;
    });
  }

  function goNextCue() {
    projectCue(1);
  }

  function goPreviousCue() {
    projectCue(-1);
  }

  function jumpToCue(index) {
    const jump = getCueJumpState(project.cues, index);
    if (!jump) return;
    setProjectedIndex(jump.projectedIndex);
    setActiveIndex(jump.activeIndex);
    if (!jump.blackout) clearBlackout();
  }

  function browseNextCue() {
    setActiveIndex((current) => Math.min(current + 1, project.cues.length - 1));
    setCueListRevealTick((tick) => tick + 1);
  }

  function browsePreviousCue() {
    setActiveIndex((current) => Math.max(current - 1, 0));
    setCueListRevealTick((tick) => tick + 1);
  }

  // Con Freccia Su/Giù la riga selezionata resta visibile: scorre solo il contenitore
  // dell'elenco e solo quando serve (mai scrollIntoView, che potrebbe muovere la pagina).
  useLayoutEffect(() => {
    if (cueListRevealTick === 0) return;
    const list = cueListRef.current;
    const row = list?.querySelector(`[data-cue-index="${activeIndex}"]`);
    if (!list || !row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    const next = getRevealScrollTop({
      scrollTop: list.scrollTop,
      viewportHeight: list.clientHeight,
      scrollHeight: list.scrollHeight,
      itemTop: rowRect.top - listRect.top + list.scrollTop,
      itemHeight: rowRect.height,
      isFirst: list.firstElementChild === row.parentElement,
      isLast: list.lastElementChild === row.parentElement,
    });
    if (next !== list.scrollTop) list.scrollTop = next;
  }, [cueListRevealTick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mappa: porta in proiezione la prima battuta della sezione e mostra il marcatore
  // in cima all'elenco (scorre solo l'elenco, mai la pagina).
  function goToMapSection(section) {
    if (!section) return;
    const target = section.implicit
      ? findNextPlayableIndex(project.cues, 0)
      : getMarkerJumpIndex(project.cues, section.markerIndex);
    if (isMarkerCue(project.cues[target])) return;
    setEditingCue(null);
    jumpToCue(target);
    window.requestAnimationFrame(() => {
      const list = cueListRef.current;
      if (!list) return;
      const row = section.implicit
        ? list.querySelector(`[data-cue-index="${target}"]`)
        : list.querySelector(`[data-marker-index="${section.markerIndex}"]`);
      if (!row) return;
      const top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
      list.scrollTop = Math.max(0, top - 4);
    });
  }

  // Seleziona una battuta (senza proiettarla) e la rende visibile nell'elenco.
  function revealCueInList(index) {
    if (!Number.isInteger(index) || index < 0 || index >= project.cues.length) return;
    setEditingCue(null);
    setActiveIndex(index);
    setCueListRevealTick((tick) => tick + 1);
  }

  // Tasti premuti nella finestra dello schermo di proiezione (vedi utils/stageCommands.js).
  function handleStageCommand(command) {
    if (!command) return;
    if (command.id && command.id === lastStageCommandIdRef.current) return;
    lastStageCommandIdRef.current = command.id;
    if (command.action === 'next') goNextCue();
    else if (command.action === 'previous') goPreviousCue();
    else if (command.action === 'toggleBlackout') toggleBlackout();
  }

  function openEditorFullscreenPreview() {
    setEditorPreviewOpen(true);

    window.requestAnimationFrame(() => {
      const element = editorStagePreviewRef.current;
      if (!element || document.fullscreenElement) return;

      element.requestFullscreen?.().catch(() => {
        // Se il browser blocca il tutto schermo, lasciamo comunque aperta la anteprima sovrapposta.
      });
    });
  }

  function closeEditorFullscreenPreview() {
    if (document.fullscreenElement === editorStagePreviewRef.current) {
      document.exitFullscreen?.();
    }

    setEditorPreviewOpen(false);
  }

  useEffect(() => {
    function handleFullscreenChange() {
      if (document.fullscreenElement !== editorStagePreviewRef.current) {
        setEditorPreviewOpen(false);
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);


  const [keyboardShortcuts, setKeyboardShortcuts] = useState(() => loadShortcuts());
  useEffect(() => { saveShortcuts(keyboardShortcuts); }, [keyboardShortcuts]);

  useKeyboardShortcuts({
    shortcuts: keyboardShortcuts,
    undo,
    redo,
    goNext: goNextCue,
    goPrevious: goPreviousCue,
    browseNext: browseNextCue,
    browsePrevious: browsePreviousCue,
    toggleBlackout,
    toggleFullscreen: viewMode === 'editor' ? openEditorFullscreenPreview : toggleFullscreen,
    viewMode,
  });

  useEffect(() => {
    let cleanup = null;
    let cancelled = false;

    async function registerMacMenuBridge() {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen('stentor-menu-action', (event) => {
          const id = event?.payload?.id;
          if (!id) return;

          switch (id) {
            case 'app.settings':
              setViewMode('preferences');
              return;
            case 'app.about':
              dialogs.alert({
                title: 'Sténtor',
                message: ui('app.about.message', { version: import.meta.env?.VITE_APP_VERSION || '' }),
              });
              return;
            case 'file.new':
              createNewProject();
              return;
            case 'file.open':
              openProjectFile();
              return;
            case 'file.save':
              saveProjectFile();
              return;
            case 'file.saveAs':
            case 'file.export':
              saveProjectFile({ saveAs: true });
              return;
            case 'edit.undo':
              undo();
              return;
            case 'edit.redo':
              redo();
              return;
            case 'edit.cut':
              document.execCommand?.('cut');
              return;
            case 'edit.copy':
              document.execCommand?.('copy');
              return;
            case 'edit.paste':
              document.execCommand?.('paste');
              return;
            case 'edit.selectAll':
              document.execCommand?.('selectAll');
              return;
            case 'view.projects':
              setViewMode('dashboard');
              return;
            case 'view.text':
              setViewMode('editor');
              return;
            case 'view.regia':
              setViewMode('editor');
              return;
            case 'view.screens':
              setViewMode('screens');
              return;
            case 'view.fullscreen':
              viewMode === 'editor' ? openEditorFullscreenPreview() : toggleFullscreen();
              return;
            case 'text.newCue':
              setViewMode('editor');
              if (activeCue && !isMarkerCue(activeCue)) addCueAfter(activeCue.id);
              else addCue();
              return;
            case 'text.newMarker':
              setViewMode('editor');
              addMarker();
              return;
            case 'text.split':
              if (activeCue) splitCueAtCursor(activeCue.id);
              return;
            case 'text.merge':
              if (activeCue) mergeWithNext(activeCue.id);
              return;
            case 'text.preview':
              setViewMode('editor');
              openEditorFullscreenPreview();
              return;
            case 'regia.live':
              setViewMode('editor');
              return;
            case 'regia.previous':
              goPreviousCue();
              return;
            case 'regia.next':
              goNextCue();
              return;
            case 'regia.blackout':
              toggleBlackout();
              return;
            case 'help.shortcuts':
              dialogs.alert({
                title: ui('app.shortcuts.title'),
                message: ui('app.shortcuts.message'),
              });
              return;
            case 'help.feedback':
              window.location.href = 'mailto:feedback@stentor.live?subject=Feedback%20Stentor';
              return;
            default:
              return;
          }
        });

        if (cancelled) {
          unlisten?.();
          return;
        }
        cleanup = unlisten;
      } catch {
        // In browser normale il bridge Tauri non è disponibile.
      }
    }

    registerMacMenuBridge();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [
    activeCue,
    addCue,
    addCueAfter,
    addMarker,
    canRedo,
    canUndo,
    dialogs,
    goNextCue,
    goPreviousCue,
    mergeWithNext,
    saveProjectFile,
    setViewMode,
    splitCueAtCursor,
    toggleBlackout,
    undo,
    redo,
    viewMode,
  ]);


  useEffect(() => {
    function handleWindowMessage(event) {
      if (event.data?.type !== STAGE_COMMAND_TYPE) return;
      handleStageCommand(normalizeStageCommand(event.data));
    }

    function handleStorage(event) {
      if (event.key !== STAGE_COMMAND_STORAGE_KEY || !event.newValue) return;
      handleStageCommand(normalizeStageCommand(event.newValue));
    }

    window.addEventListener('message', handleWindowMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener('storage', handleStorage);
    };
  });

  const structuralCue = activeCue && !isMarkerCue(activeCue) ? activeCue : null;
  const structuralSplitSelection = structuralCue
    ? splitSelectionByCueRef.current.get(structuralCue.id) || null
    : null;
  const structuralSplitText = structuralCue && structuralSplitSelection
    ? getCueText(structuralCue, structuralSplitSelection.language)
    : '';
  const canSplitStructuralCue = Boolean(
    structuralCue
    && structuralSplitSelection
    && structuralSplitSelection.cueId === structuralCue.id
    && Number.isInteger(structuralSplitSelection.cursor)
    && structuralSplitSelection.fullText === structuralSplitText
  );
  const structuralNextCue = structuralCue ? project.cues[activeIndex + 1] : null;
  const canMergeStructuralCue = Boolean(
    structuralCue
    && structuralNextCue
    && !isMarkerCue(structuralNextCue)
  );
  const playableCueCount = project.cues.filter((cue) => !isMarkerCue(cue)).length;
  // Numeri di battuta senza marcatori, e mappa dello spettacolo costruita dai marcatori.
  const cueNumbers = getCueNumbers(project.cues);
  const cueNumberLabel = (index) => formatCueNumber(cueNumbers[index]);
  const showMapSections = buildShowMap(project.cues);
  const currentMapSection = findSectionForIndex(showMapSections, projectedIndex);
  const currentMapSectionId = currentMapSection?.id ?? null;
  const currentMapSectionTitle = currentMapSection?.title ?? null;

  // Card Tempo: segue le sezioni della Mappa, ma conta solo dopo Avvia.
  useEffect(() => {
    setShowTimer((timer) => changeSection(
      timer,
      currentMapSectionId ? { id: currentMapSectionId, title: currentMapSectionTitle } : null,
      Date.now()
    ));
  }, [currentMapSectionId, currentMapSectionTitle]);
  const canDeleteStructuralCue = Boolean(structuralCue && playableCueCount > 1);

  const projectedText = blackout
    ? ''
    : (getCueText(projectedCue, language) || ui('cues.empty'));
  // Seconda lingua dello schermo attivo, come in sala (sotto, più piccola).
  const projectedSecondLanguage = getScreenSecondLanguage(getActiveScreen(project.settings), language, project.languages);
  const projectedSecondText = blackout || projectedSecondLanguage === language || !getCueText(projectedCue, language).trim()
    ? ''
    : getSecondProjectionText(projectedCue, projectedSecondLanguage, project.primaryLanguage);
  const nextCueIndex = findPlayableIndex(projectedIndex, 1);
  const hasNextCue = nextCueIndex > projectedIndex;
  function goToFromQuery() {
    const query = goToQuery.trim();
    if (!query) return;
    let target = -1;
    if (/^\d+$/.test(query)) {
      target = findIndexByCueNumber(project.cues, Number(query));
    } else {
      // Prima i titoli dei marcatori ("atto 2", "intervallo"), poi il testo delle battute.
      target = findMarkerTargetByText(project.cues, query);
    }
    if (target < 0 && !/^\d+$/.test(query)) {
      const needle = query.toLocaleLowerCase('it');
      const total = project.cues.length;
      for (let step = 1; step <= total; step += 1) {
        const index = (projectedIndex + step) % total;
        const cue = normalizeCue(project.cues[index], index);
        if (isMarkerCue(cue)) continue;
        if (getCueText(cue, language).toLocaleLowerCase('it').includes(needle)) { target = index; break; }
      }
    }
    if (target < 0) { setGoToMissed(true); return; }
    setGoToMissed(false);
    setGoToQuery('');
    goToInputRef.current?.blur();
    jumpToCue(target);
  }

  return (
    <I18nProvider language={appLanguage}>
    <div
      className={classNames(
        'appShell',
        blackout && 'blackoutMode',
        leftSidebarCollapsed && 'leftSidebarCollapsed',
        isRightSidebarCollapsed && 'rightSidebarCollapsed'
      )}
    >
      <Sidebar
        viewMode={viewMode}
        setViewMode={setViewMode}
        project={project}
        appLanguage={appLanguage}
        setAppLanguage={setAppLanguage}
        collapsed={leftSidebarCollapsed}
        updateAvailable={updates.hasUpdate}
        onToggleCollapsed={() => setLeftSidebarCollapsed((value) => !value)}
      />

      <main className="main">
        <StentoreErrorBoundary resetKey={`${viewMode}:${activeIndex}:${project.cues.length}`} onResetCue={() => setActiveIndex(0)}>
        {viewMode === 'dashboard' && (
          <DesktopDashboard
            project={project}
            projects={projects}
            setViewMode={setViewMode}
            createNewProject={createNewProject}
            openProjectFile={openProjectFile}
            saveProjectFile={saveProjectFile}
            switchProject={switchProject}
            editProjectDetails={editProjectDetails}
            exportProject={exportProject}
            duplicateProject={duplicateProject}
            deleteProject={deleteProject}
            updateProjectCover={updateProjectCover}
            onManageLanguages={openLanguagesDialog}
            appLanguage={appLanguage}
          />
        )}

        {viewMode === 'preferences' && (
          <DesktopPreferences
            appLanguage={appLanguage}
            setAppLanguage={setAppLanguage}
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            updates={updates}
          />
        )}

        {viewMode === 'editor' && (
          <>
            <div className="workspace liteRegiaWorkspace">
              <main className="liteRegiaEditorMain">
                <PageHeader
                  title={ui('nav.cues')}
                  subtitle={`${project.title || ui('langs.thisProject')} · ${ui('count.cues', { count: (project.cues || []).filter((item) => item?.type !== 'marker').length })}`}
                />
                <div className="liteRegiaTopStack">
                  <div className="r11Previews r11PreviewsSingle">
                  <section className="liteRegiaEditorPreview" aria-label={ui('cues.current')}>
                  <div className="r11PreviewLabel live"><span className="r11Dot" aria-hidden="true" />{!blackout ? ui('cues.current') : ui('cues.blackout')} · {cueNumberLabel(projectedIndex)}</div>
                  <article className="regiaLiveCueCard regiaLiveCueCardCurrent">
                    <div className="regiaLiveCueText liteScreenPreviewHost">
                      <ScreenPreview cue={projectedCue} text={projectedText} spans={getCueTextSpans(projectedCue, language)} secondText={projectedSecondText} secondSpans={projectedSecondText ? getCueTextSpans(projectedCue, projectedSecondLanguage) : []} settings={publicSettings} empty={blackout} />
                    </div>
                  </article>
                </section>
                </div>

                <section className="regiaLiveCueCard regiaLiveCueListCard liteEditableCueListCard" aria-label={ui('cues.list.aria')}>
                  <div className="regiaLiveCueHeader liteSequenceHeader">
                    <div className="liteSequenceHeaderCopy">
                      <span>{ui('cues.list.title')}</span>
                    </div>
                    <div className="liteSequenceHeaderControls">
                      <LanguageSwitcher
                        project={project}
                        language={language}
                        onChange={(code) => updateProject({ activeLanguage: code })}
                        onManage={() => openLanguagesDialog(project.id)}
                        onMakePrimary={(code) => setProject((current) => setPrimaryProjectLanguage(current, code))}
                        onDelete={deleteProjectLanguage}
                      />
                      <CueStructuralToolbar
                        onAddAfter={() => structuralCue && addCueAfter(structuralCue.id)}
                        onSplit={() => structuralCue && splitCueAtSelection(structuralCue.id, structuralSplitSelection)}
                        onMergeNext={() => structuralCue && mergeWithNext(structuralCue.id)}
                        onDelete={() => structuralCue && deleteCueWithConfirm(structuralCue.id)}
                        canAddAfter={Boolean(structuralCue)}
                        canSplit={canSplitStructuralCue}
                        canMergeNext={canMergeStructuralCue}
                        canDelete={canDeleteStructuralCue}
                        onAddMarker={() => addMarker(activeIndex)}
                        canAddMarker={project.cues.length > 0}
                      />
                      <em>{cueNumbers[projectedIndex] || 1} / {playableCueCount || 1}</em>
                    </div>
                  </div>
                  <div ref={cueListRef} className="regiaLiveCueList liteEditableCueList" role="list" aria-label={ui('cues.list.title')}>
                    {project.cues.map((rawCue, index) => {
                      const cue = normalizeCue(rawCue, index);
                      if (isMarkerCue(cue)) {
                        return (
                          <div
                            key={cue.id || `marker-${index}`}
                            className={classNames('r11SceneHeader', 'liteMarkerRow', currentMapSection?.markerIndex === index && 'current')}
                            role="listitem"
                            data-marker-index={index}
                            onDoubleClick={() => editMarker(cue.id)}
                            title={ui('marker.row.title')}
                          >
                            <span className="liteMarkerRowTitle">{getMarkerTitle(cue)}</span>
                            <span className="liteMarkerRowActions">
                              <button type="button" onClick={() => editMarker(cue.id)} aria-label={ui('marker.edit.aria', { title: getMarkerTitle(cue) })} title={ui('marker.edit')}><Pencil size={13} /></button>
                              <button type="button" className="danger" onClick={() => deleteMarker(cue.id)} aria-label={ui('marker.delete.aria', { title: getMarkerTitle(cue) })} title={ui('marker.delete')}><Trash2 size={13} /></button>
                            </span>
                          </div>
                        );
                      }
                      const text = getCueText(cue, language);
                      const isProjected = index === projectedIndex;
                      const isSelected = index === activeIndex;
                      const isEditing = editingCue?.index === index;
                      const isExpanded = expandedCueId === cue.id;
                      const panelId = `lite-cue-editor-${index}`;
                      const startInlineEdit = (event) => {
                        const offset = getClickCaretOffset(event);
                        const leading = text.length - text.trimStart().length;
                        setEditingCue({
                          index,
                          caret: offset === null || !text.trim() ? null : leading + offset,
                        });
                      };
                      return (
                        <div key={cue.id} className={classNames('liteCueItem', isExpanded && 'expanded')} role="listitem">
                        <div
                          data-cue-index={index}
                          className={classNames(
                            'regiaLiveCueListRow',
                            isProjected && 'live',
                            isSelected && 'selected',
                            hasNextCue && index === nextCueIndex && !isProjected && 'next',
                            isEditing && 'editing',
                            !projection.isOpen && 'textClickEdit'
                          )}
                          onClick={(event) => {
                            if (isEditing) return;
                            // A proiezione chiusa, un clic proprio sul testo lo modifica senza mandarlo in onda.
                            // Con uno schermo aperto il clic manda sempre in onda: in spettacolo niente sorprese.
                            if (!projection.isOpen && event.target.closest?.('.liteEditableCueBody > span')) {
                              startInlineEdit(event);
                              return;
                            }
                            // Un clic manda in onda la battuta (Regia 1.1).
                            setEditingCue(null);
                            jumpToCue(index);
                          }}
                          onDoubleClick={(event) => {
                            // Doppio clic: modifica il testo nel punto cliccato.
                            setActiveIndex(index);
                            if (isEditing) return;
                            startInlineEdit(event);
                          }}
                        >
                          <strong>{cueNumberLabel(index)}</strong>
                          <span className="liteCueSpeaker" data-no-translate="">{normalizeVoice(cue.speaker)}</span>
                          <div className="liteEditableCueBody">
                            {isEditing ? (
                              <InlineCueTextEditor
                                value={text}
                                caret={editingCue.caret}
                                onChange={(value) => updateTranslation(cue.id, language, value)}
                                onExit={() => setEditingCue((current) => (current?.index === index ? null : current))}
                                ariaLabel={ui('cues.inlineText', { number: index + 1 })}
                              />
                            ) : (
                              <span>{text.trim() || ui('cues.empty')}</span>
                            )}
                          </div>
                          {timingMode !== 'manual' && cueHasTime(cue) ? (
                            // Nota/etichetta e orario registrato nella stessa colonna, così la riga non si scompone.
                            <span className="liteCueAnnotationCell">
                              <CueRowAnnotation cue={cue} isProjected={isProjected} isNext={hasNextCue && index === nextCueIndex} onEditNote={(value) => updateCue(cue.id, (current) => ({ ...current, note: value }))} />
                              <span className="liteCueRecordedTime" title={ui('cues.recordedTime')}>{formatDuration(Number(cue.startTime) * 1000)}</span>
                            </span>
                          ) : (
                            <CueRowAnnotation cue={cue} isProjected={isProjected} isNext={hasNextCue && index === nextCueIndex} onEditNote={(value) => updateCue(cue.id, (current) => ({ ...current, note: value }))} />
                          )}
                          <button
                            type="button" className="liteCueExpandButton"
                            aria-label={ui(isExpanded ? 'cues.collapse' : 'cues.expand', { number: index + 1 })}
                            aria-expanded={isExpanded} aria-controls={panelId}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedCueId((current) => current === cue.id ? null : cue.id);
                            }}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                              if (event.code === 'Space' || event.key === 'Enter') event.stopPropagation();
                            }}
                          ><ChevronDown size={16} /></button>
                        </div>
                        {isExpanded && <CueRowEditor
                          cue={cue} index={index} project={project} panelId={panelId}
                          updateCue={updateCue} updateTranslation={updateTranslation}
                          changeCueVoice={changeCueVoice} appLanguage={appLanguage}
                          onSplitSelectionChange={rememberSplitSelection}
                          activeTextareaRef={activeTextareaRef}
                        />}
                        </div>
                      );
                    })}
                  </div>
                  </section>
                </div>

                <nav className="liteRegiaConductorBar" aria-label={ui('conductor.aria')}>
                  <button type="button" className="liteConductorButton" onClick={goPreviousCue}>
                    <SkipBack /> <span>{ui('conductor.back')}</span>
                  </button>
                  <button type="button" className="liteConductorButton primary" onClick={goNextCue}>
                    <SkipForward /> <span>{ui('conductor.next')}</span>
                  </button>
                  <form
                    className={classNames('liteConductorGoTo', 'r11GoTo', goToMissed && 'missed')}
                    role="search"
                    onSubmit={(event) => { event.preventDefault(); goToFromQuery(); }}
                  >
                    <Search aria-hidden="true" />
                    <label className="r11SrOnly" htmlFor="r11-goto">{ui('conductor.goTo.label')}</label>
                    <input
                      id="r11-goto"
                      title={ui('conductor.goTo.title')}
                      ref={goToInputRef}
                      type="text"
                      autoComplete="off"
                      value={goToQuery}
                      placeholder={goToMissed ? ui('conductor.goTo.missed') : ui('conductor.goTo.placeholder')}
                      onChange={(event) => { setGoToQuery(event.target.value); setGoToMissed(false); }}
                    />
                  </form>
                  <button
                    type="button"
                    className={classNames('liteConductorButton', 'blackout', blackout && 'active')}
                    onClick={toggleBlackout}
                  >
                    <Moon /> <span>{blackout ? ui('conductor.showText') : ui('conductor.blackout')}</span>
                  </button>
                  <button
                    type="button"
                    className="liteConductorButton projection"
                    onClick={() => projection.openScreen()}
                    title={ui('conductor.projection.title')}
                    aria-label={ui('conductor.projection.aria')}
                  >
                    <Monitor /> <span>{ui('conductor.projection')}</span>
                  </button>
                </nav>
              </main>

              <aside className="liteRegiaRightColumn" aria-label={ui('rightColumn.aria')}>
                <div className="stentorRightToggleRow" data-right-toggle-anchor="" aria-hidden="true" />
                <ShowMap
                  sections={showMapSections}
                  currentSectionId={currentMapSection?.id ?? null}
                  onGoToSection={goToMapSection}
                  onAddMarker={() => addMarker(activeIndex)}
                  canAddMarker={project.cues.length > 0}
                />
                <TimeCard
                  timer={showTimer}
                  performances={project.performances || []}
                  onStart={() => setShowTimer((timer) => startTimer(timer, Date.now()))}
                  onPause={() => setShowTimer((timer) => pauseTimer(timer, Date.now()))}
                  onFinish={finishShowTimer}
                  onReset={resetShowTimer}
                  timingMode={timingMode}
                  onChangeTimingMode={setTimingMode}
                  timedCues={countTimedCues(project.cues)}
                  onClearTimings={clearRecordedTimings}
                  playback={{
                    playing: isSemiAutoPlaying,
                    time: playbackTime,
                    canPlay: cueHasTime(project.cues[projectedIndex]),
                    cueNumber: cueNumberLabel(projectedIndex),
                  }}
                  onPlay={startPlayback}
                  onPausePlayback={pauseSemiAuto}
                />
                <ToolsCard
                  project={project}
                  language={language}
                  activeIndex={activeIndex}
                  setProject={setProject}
                  screenColors={toolsScreenColors}
                  onRevealCue={revealCueInList}
                />
                <ShortcutsCard
                  shortcuts={keyboardShortcuts}
                  onChange={setKeyboardShortcuts}
                  onReset={() => setKeyboardShortcuts(getDefaultShortcuts())}
                />
              </aside>
            </div>
          </>
        )}

        {viewMode === 'screens' && (
          <div className="liveOnlyWorkspace desktopLiveWorkspace">
            <ScreensPage
              project={project}
              language={language}
              cue={projectedCue}
              blackout={blackout}
              setBlackout={setBlackout}
              updateProject={updateProject}
              setProject={setProject}
              dialogs={dialogs}
              projection={projection}
            />
          </div>
        )}
        </StentoreErrorBoundary>
      </main>

      {isRightSidebarCollapsed && <div className="stentorRightRail" aria-hidden="true" />}
      {hasRightSidebar && (
        <button
          type="button"
          className={classNames('stentorRightSidebarToggle', isRightSidebarCollapsed && 'collapsed')}
          onClick={() => setRightSidebarCollapsed((value) => !value)}
          title={isRightSidebarCollapsed ? ui('nav.right.expand') : ui('nav.right.collapse')}
          aria-label={isRightSidebarCollapsed ? ui('nav.right.expand') : ui('nav.right.collapse')}
          aria-pressed={isRightSidebarCollapsed}
        >
          {isRightSidebarCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </button>
      )}

      {languagesDialogProjectId && (languagesDialogProjectId === project.id ? (
        <LanguagesDialog
          project={project}
          language={language}
          setProject={setProject}
          dialogs={dialogs}
          canUndo
          onClose={closeLanguagesDialog}
        />
      ) : archivedLanguagesProject ? (
        <LanguagesDialog
          project={archivedLanguagesProject}
          language={archivedLanguagesProject.activeLanguage}
          setProject={updateArchivedLanguages}
          dialogs={dialogs}
          onClose={closeLanguagesDialog}
        />
      ) : null)}

      <StentoreDialog
        dialog={dialog}
        onCancel={() => closeDialog(false)}
        onConfirm={(value) => closeDialog(value)}
      />

      {editorPreviewOpen && (
        <StageFrame
          id="editor-stage-preview"
          ref={editorStagePreviewRef}
          className="editorFullscreenPreview"
          settings={publicSettings}
          onDoubleClick={closeEditorFullscreenPreview}
        >
          {blackout ? null : (
            <StageSubtitle
              text={editorPreviewText}
              spans={getCueTextSpans(activeCue, language)}
              fontSize={publicSettings.publicFontSize || '58px'}
              maxWidth={publicSettings.publicMaxWidth || '90%'}
              style={{
                color: publicSettings.publicTextColor || '#F3E7B3',
                fontFamily:
                  publicSettings.publicFontFamily ||
                  FONT_FAMILY_OPTIONS[0].value,
                ...getCueTypography(activeCue),
              }}
            />
          )}

          <button
            type="button"
            className="editorFullscreenClose"
            onClick={closeEditorFullscreenPreview}
          >
            {ui('preview.exit')}
          </button>
        </StageFrame>
      )}
    </div>
    </I18nProvider>
  );
}
