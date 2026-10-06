import { useEffect, useRef, useState } from 'react';
import { Monitor } from 'lucide-react';

import StageFrame from './StageFrame.jsx';
import StageSubtitle from './StageSubtitle.jsx';
import { useI18n } from '../i18n/index.js';
import { getCueText, getCueTypography } from '../utils/cueTextStyle.js';
import { getCueTextSpans } from '../utils/inlineStyleSpans.js';
import { isMarkerCue } from '../utils/markers.js';
import {
  DEFAULT_SCREENS,
  FONT_FAMILY_OPTIONS,
  SCREEN_ASPECT_OPTIONS,
  SCREEN_OFFSET_LIMITS,
  clampScreenOffset,
  createScreen,
  deleteActiveScreen,
  getScreenAspectOption,
  getScreenLanguage,
  getScreenSecondLanguage,
  screenToPublicSettings,
  setActiveScreen,
  updateActiveScreenSettings,
  updateScreenSettings,
} from '../utils/screenSettings.js';
import PageHeader from './PageHeader.jsx';
import { getSecondProjectionText } from '../utils/projectionTargets.js';
import { SECOND_LANGUAGE_SCALE } from '../utils/stageLayout.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

// Pagina Schermi: elenco degli schermi, anteprima e impostazioni dello schermo scelto.
export default function ScreensPage({
  project,
  language,
  cue,
  blackout,
  setBlackout,
  updateProject,
  setProject,
  dialogs,
  projection,
}) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  // Valori dei cursori (e del trascinamento) mentre li si muove: si vedono subito, mentre il
  // progetto e lo schermo in sala si aggiornano al massimo una volta per fotogramma.
  const [draft, setDraft] = useState(null);
  const liveRef = useRef({ pending: null, frame: 0, idle: 0, inGesture: false });
  const { screens, activeScreen, openScreen } = projection;
  const activeSettings = {
    ...screenToPublicSettings(activeScreen),
    ...(draft?.screenId === activeScreen.id ? draft.values : {}),
  };
  const activeAspect = getScreenAspectOption(activeSettings.publicAspectRatio);
  const activeScreenLanguage = getScreenLanguage(activeScreen, language, project.languages);
  const activeSecondLanguage = getScreenSecondLanguage(activeScreen, language, project.languages);
  const screenLanguagesLabel = (screen) => [
    getScreenLanguage(screen, language, project.languages),
    getScreenSecondLanguage(screen, language, project.languages),
  ].filter(Boolean).join(' · ').toUpperCase();

  function updateSettings(nextSettings) {
    updateProject({ settings: nextSettings });
  }

  function updateActiveScreen(patch) {
    updateSettings(updateActiveScreenSettings(project.settings, patch));
  }

  useEffect(() => () => {
    window.cancelAnimationFrame(liveRef.current.frame);
    window.clearTimeout(liveRef.current.idle);
  }, []);

  function flushLive() {
    const live = liveRef.current;
    if (live.frame) {
      window.cancelAnimationFrame(live.frame);
      live.frame = 0;
    }
    const pending = live.pending;
    live.pending = null;
    if (!pending) return;
    // Un solo passo di Annulla per tutto il gesto: il primo aggiornamento entra nella cronologia, gli altri no.
    const skipHistory = live.inGesture;
    live.inGesture = true;
    const apply = (current) => ({
      ...current,
      settings: updateScreenSettings(current.settings, pending.screenId, pending.values),
    });
    if (setProject) setProject(apply, { skipHistory });
    else updateProject(apply(project));
  }

  function endLive() {
    const live = liveRef.current;
    window.clearTimeout(live.idle);
    flushLive();
    live.inGesture = false;
    setDraft(null);
  }

  function patchLive(values) {
    const screenId = activeScreen.id;
    const live = liveRef.current;
    const base = live.pending?.screenId === screenId ? live.pending.values : {};
    live.pending = { screenId, values: { ...base, ...values } };
    setDraft((current) => ({
      screenId,
      values: { ...(current?.screenId === screenId ? current.values : {}), ...values },
    }));
    if (!live.frame) {
      live.frame = window.requestAnimationFrame(() => {
        live.frame = 0;
        flushLive();
      });
    }
    // Il gesto finisce quando si lascia il cursore o dopo una breve pausa (anche con le frecce).
    window.clearTimeout(live.idle);
    live.idle = window.setTimeout(endLive, 500);
  }

  function statusOf(screen) {
    if (blackout) return { label: t('screens.status.blackout'), tone: 'off' };
    if (screen.id === activeScreen.id) return { label: t('screens.status.live'), tone: 'live' };
    return { label: t('screens.status.active'), tone: 'active' };
  }

  function previewText() {
    if (blackout) return '';
    const text = cue && !isMarkerCue(cue) ? getCueText(cue, activeScreenLanguage) : '';
    return text || t('screens.previewText.empty');
  }

  function previewSecondText() {
    if (blackout || !cue || isMarkerCue(cue) || !getCueText(cue, activeScreenLanguage).trim()) return '';
    return getSecondProjectionText(cue, activeSecondLanguage, project.primaryLanguage);
  }

  async function addScreen() {
    const name = await dialogs.input({
      title: t('screens.dialog.new.title'),
      message: t('screens.dialog.new.message'),
      inputLabel: t('screens.dialog.new.label'),
      defaultValue: t('screens.dialog.new.default'),
      confirmLabel: t('screens.dialog.new.confirm'),
      required: true,
    });
    if (!name) return;
    updateSettings(createScreen(project.settings, name.trim() || t('screens.dialog.new.default')));
  }

  async function removeScreen() {
    if (screens.length <= 1) return;
    const confirmed = await dialogs.confirm({
      title: t('screens.dialog.delete.title'),
      message: t('screens.dialog.delete.message', { name: activeScreen.name }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
    });
    if (confirmed) updateSettings(deleteActiveScreen(project.settings));
  }

  function resetStyle() {
    const fallback = DEFAULT_SCREENS[0];
    updateActiveScreen({
      publicBackground: fallback.publicBackground,
      publicTextColor: fallback.publicTextColor,
      publicFontSize: fallback.publicFontSize,
      publicVerticalAlign: fallback.publicVerticalAlign,
      publicPaddingTop: fallback.publicPaddingTop,
      publicMaxWidth: fallback.publicMaxWidth,
      publicFontFamily: fallback.publicFontFamily,
      publicFadeInMs: fallback.publicFadeInMs,
      publicFadeOutMs: fallback.publicFadeOutMs,
      publicBlackoutFadeMs: fallback.publicBlackoutFadeMs,
      publicAspectRatio: fallback.publicAspectRatio,
      publicSecondScale: fallback.publicSecondScale,
      publicOffsetX: 0,
      publicOffsetY: 0,
    });
  }

  // Trascinando il testo nell'anteprima lo si sposta; lo schermo in sala segue in diretta.
  function startDrag(event) {
    if (event.button !== 0 || document.fullscreenElement) return;
    const stage = event.currentTarget.querySelector('.stageDesignCanvas');
    const rect = stage?.getBoundingClientRect();
    if (!rect?.width || !rect?.height) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      offsetX: activeSettings.publicOffsetX,
      offsetY: activeSettings.publicOffsetY,
    };
    setDragging(true);
  }

  function moveDrag(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offsetX = clampScreenOffset(drag.offsetX + ((event.clientX - drag.startX) / drag.width) * 100);
    const offsetY = clampScreenOffset(drag.offsetY + ((event.clientY - drag.startY) / drag.height) * 100, 'y');
    if (offsetX !== activeSettings.publicOffsetX || offsetY !== activeSettings.publicOffsetY) {
      patchLive({ publicOffsetX: offsetX, publicOffsetY: offsetY });
    }
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    endLive();
  }

  function formatOffset(value, axis) {
    if (!value) return '0';
    const arrow = axis === 'x' ? (value > 0 ? '→' : '←') : (value > 0 ? '↓' : '↑');
    return `${arrow} ${Math.abs(value)}%`;
  }

  function toggleCanvasFullscreen() {
    const element = canvasRef.current;
    if (!element) return;
    if (!document.fullscreenElement) element.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const status = statusOf(activeScreen);
  const fontSize = parseInt(activeSettings.publicFontSize, 10) || 58;
  const maxWidth = parseInt(activeSettings.publicMaxWidth, 10) || 90;

  return (
    <section className="desktopScreensWorkspace liteScreensWorkspace" aria-label={t('screens.aria')}>
      <PageHeader
        title={t('screens.eyebrow')}
        subtitle={t('screens.subtitle')}
        actionsClassName="desktopScreensToolbarActions"
        actions={(
          <>
            <button type="button" className="isPrimary" onClick={() => openScreen(activeScreen)}>{t('screens.open')}</button>
            <button type="button" onClick={addScreen}>{t('screens.add')}</button>
            <button type="button" onClick={toggleCanvasFullscreen}>{t('screens.fullscreen')}</button>
            <button type="button" className={blackout ? 'isActive' : ''} onClick={() => setBlackout(!blackout)}>
              {blackout ? t('screens.showText') : t('screens.blackout')}
            </button>
          </>
        )}
      />

      <div className="liteScreensBody">
        <aside className="liteScreenPicker" aria-label={t('screens.list.aria')}>
          <div className="desktopOutputRows">
            {screens.map((screen) => {
              const rowStatus = statusOf(screen);
              return (
                <button
                  key={screen.id}
                  type="button"
                  className={classNames('desktopOutputRow', screen.id === activeScreen.id && 'selected')}
                  onClick={() => updateSettings(setActiveScreen(project.settings, screen.id))}
                >
                  <span className="desktopOutputIcon"><Monitor size={16} /></span>
                  <span className="desktopOutputCopy">
                    <strong>{screen.name}</strong>
                    <em>{screenLanguagesLabel(screen)}</em>
                  </span>
                  <span className={classNames('desktopOutputStatus', rowStatus.tone)}>{rowStatus.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="desktopScreenCanvasColumn liteScreenPreviewColumn">
          <div className="desktopCanvasHeader">
            <div>
              <span>{t('screens.preview')}</span>
              <strong>{activeScreen.name}</strong>
            </div>
            <div className="desktopCanvasMeta">
              <small>{t(`screens.aspect.${activeAspect.value}`)}</small>
              <small>{screenLanguagesLabel(activeScreen)}</small>
              <small className={classNames('desktopCanvasLiveBadge', status.tone)}>{status.label}</small>
            </div>
          </div>

          <div
            className={classNames('desktopScreenCanvasShell', 'liteScreenDragArea', dragging && 'isDragging')}
            ref={canvasRef}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            title={t('screens.offset.hint')}
          >
            <StageFrame id={`desktop-screen-canvas-${activeScreen.id}`} settings={activeSettings} className="desktopScreenStageFrame">
              {blackout ? null : (
                <StageSubtitle
                  key={`${cue?.id || 'empty'}-${activeScreen.id}-${activeScreenLanguage}-${activeSecondLanguage}`}
                  text={previewText()}
                  spans={getCueTextSpans(cue, activeScreenLanguage)}
                  secondText={previewSecondText()}
                  secondSpans={activeSecondLanguage ? getCueTextSpans(cue, activeSecondLanguage) : []}
                  secondScale={activeSettings.publicSecondScale}
                  fontSize={activeSettings.publicFontSize}
                  maxWidth={activeSettings.publicMaxWidth || '90%'}
                  verticalAlign={activeSettings.publicVerticalAlign || 'center'}
                  paddingTop={activeSettings.publicPaddingTop || '0vh'}
                  offsetX={activeSettings.publicOffsetX}
                  offsetY={activeSettings.publicOffsetY}
                  fadeInMs={activeSettings.publicFadeInMs ?? 120}
                  style={{
                    color: activeSettings.publicTextColor,
                    fontFamily: activeSettings.publicFontFamily || FONT_FAMILY_OPTIONS[0].value,
                    ...getCueTypography(cue),
                  }}
                />
              )}
            </StageFrame>
          </div>
        </main>

        <aside className="desktopScreenInspector liteScreenInspector" aria-label={t('screens.inspector.aria')}>
          <div className="desktopPanelTitle inspectorTitle" data-right-toggle-anchor="">
            <span>{t('screens.inspector.title')}</span>
          </div>

          <section className="desktopInspectorSection">
            <h3>{t('screens.section.screen')}</h3>
            <label>
              {t('screens.field.name')}
              <input value={activeScreen.name} onChange={(event) => updateActiveScreen({ name: event.target.value })} />
            </label>
            <label>
              {t('screens.field.language')}
              <select value={activeScreen.publicLanguage || 'active'} onChange={(event) => updateActiveScreen({ publicLanguage: event.target.value })}>
                <option value="active">{t('screens.field.followActive')}</option>
                {project.languages.map((lang) => (
                  <option key={lang} value={lang}>{project.languageNames?.[lang] || lang.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <label>
              {t('screens.field.secondLanguage')}
              <select
                value={activeSecondLanguage}
                onChange={(event) => updateActiveScreen({ publicSecondLanguage: event.target.value })}
                disabled={project.languages.length < 2}
              >
                <option value="">{t('screens.secondLanguage.none')}</option>
                {project.languages.filter((lang) => lang !== activeScreenLanguage).map((lang) => (
                  <option key={lang} value={lang}>{project.languageNames?.[lang] || lang.toUpperCase()}</option>
                ))}
              </select>
            </label>
            <small className="liteScreenFieldHint">
              {t(project.languages.length < 2 ? 'screens.secondLanguage.needMore' : 'screens.secondLanguage.hint')}
            </small>
            <label>
              {t('screens.field.format')}
              <select value={activeSettings.publicAspectRatio || '16:9'} onChange={(event) => updateActiveScreen({ publicAspectRatio: event.target.value })}>
                {SCREEN_ASPECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(`screens.aspect.${option.value}`)}</option>
                ))}
              </select>
            </label>
          </section>

          <section className="desktopInspectorSection">
            <h3>{t('screens.section.look')}</h3>
            <label>
              {t('screens.field.font')}
              <select value={activeSettings.publicFontFamily || FONT_FAMILY_OPTIONS[0].value} onChange={(event) => updateActiveScreen({ publicFontFamily: event.target.value })}>
                {FONT_FAMILY_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>{font.system ? t('screens.font.system') : font.label}</option>
                ))}
              </select>
            </label>
            <label>
              {t('screens.field.size')}
              <div className="desktopRange">
                <input type="range" min="28" max="120" value={fontSize} onChange={(event) => patchLive({ publicFontSize: `${event.target.value}px` })} onPointerUp={endLive} onKeyUp={endLive} />
                <strong>{fontSize}px</strong>
              </div>
            </label>
            <label>
              {t('screens.field.width')}
              <div className="desktopRange">
                <input type="range" min="45" max="100" value={maxWidth} onChange={(event) => patchLive({ publicMaxWidth: `${event.target.value}%` })} onPointerUp={endLive} onKeyUp={endLive} />
                <strong>{maxWidth}%</strong>
              </div>
            </label>
            {activeSecondLanguage && (
              <label>
                {t('screens.field.secondSize')}
                <div className="desktopRange">
                  <input type="range" min={SECOND_LANGUAGE_SCALE.min} max={SECOND_LANGUAGE_SCALE.max} step="5" value={activeSettings.publicSecondScale} onChange={(event) => patchLive({ publicSecondScale: Number(event.target.value) })} onPointerUp={endLive} onKeyUp={endLive} />
                  <strong>{activeSettings.publicSecondScale}%</strong>
                </div>
              </label>
            )}
            <label>
              {t('screens.field.position')}
              <select value={activeSettings.publicVerticalAlign || 'center'} onChange={(event) => updateActiveScreen({ publicVerticalAlign: event.target.value })}>
                <option value="top">{t('screens.position.top')}</option>
                <option value="center">{t('screens.position.center')}</option>
                <option value="bottom">{t('screens.position.bottom')}</option>
              </select>
            </label>
            <label>
              {t('screens.field.offsetX')}
              <div className="desktopRange">
                <input type="range" min={-SCREEN_OFFSET_LIMITS.x} max={SCREEN_OFFSET_LIMITS.x} step="1" value={activeSettings.publicOffsetX} onChange={(event) => patchLive({ publicOffsetX: clampScreenOffset(event.target.value, 'x') })} onPointerUp={endLive} onKeyUp={endLive} />
                <strong>{formatOffset(activeSettings.publicOffsetX, 'x')}</strong>
              </div>
            </label>
            <label>
              {t('screens.field.offsetY')}
              <div className="desktopRange">
                <input type="range" min={-SCREEN_OFFSET_LIMITS.y} max={SCREEN_OFFSET_LIMITS.y} step="1" value={activeSettings.publicOffsetY} onChange={(event) => patchLive({ publicOffsetY: clampScreenOffset(event.target.value, 'y') })} onPointerUp={endLive} onKeyUp={endLive} />
                <strong>{formatOffset(activeSettings.publicOffsetY, 'y')}</strong>
              </div>
            </label>
            <div className="liteScreenOffsetRow">
              <small>{t('screens.offset.hint')}</small>
              <button
                type="button"
                onClick={() => updateActiveScreen({ publicOffsetX: 0, publicOffsetY: 0 })}
                disabled={!activeSettings.publicOffsetX && !activeSettings.publicOffsetY}
              >
                {t('screens.offset.center')}
              </button>
            </div>
            <div className="desktopColorGrid">
              <label>
                {t('screens.field.text')}
                <input type="color" value={activeSettings.publicTextColor || '#F3E7B3'} onChange={(event) => updateActiveScreen({ publicTextColor: event.target.value })} />
              </label>
              <label>
                {t('screens.field.background')}
                <input type="color" value={activeSettings.publicBackground || '#000000'} onChange={(event) => updateActiveScreen({ publicBackground: event.target.value })} />
              </label>
            </div>
          </section>

          <section className="desktopInspectorSection liteScreenActionsSection">
            <button type="button" onClick={() => openScreen(activeScreen)}>{t('screens.open')}</button>
            <button type="button" onClick={resetStyle}>{t('screens.resetStyle')}</button>
            <button type="button" className="dangerMiniButton" onClick={removeScreen} disabled={screens.length <= 1}>{t('screens.delete')}</button>
          </section>
        </aside>
      </div>
    </section>
  );
}
