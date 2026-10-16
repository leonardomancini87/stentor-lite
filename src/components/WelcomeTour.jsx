import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, FileText, Folder, Keyboard, Monitor, RectangleHorizontal, Settings, Star, X } from 'lucide-react';
import { renderRich, useI18n } from '../i18n/index.js';
import { WELCOME_TOUR_STEPS } from '../utils/welcomeTour.js';

const STEP_ICONS = {
  welcome: Star,
  projects: Folder,
  cues: FileText,
  screens: Monitor,
  projection: RectangleHorizontal,
  live: Keyboard,
  ready: Settings,
};

// Guida di benvenuto in sette passaggi. Il riquadro sta in basso a destra, così
// dietro si vede la pagina di cui parla (la cambia App con `onStepChange`).
export default function WelcomeTour({ step, onStepChange, onClose }) {
  const { t } = useI18n();
  const nextRef = useRef(null);
  const total = WELCOME_TOUR_STEPS.length;
  const current = WELCOME_TOUR_STEPS[step] || WELCOME_TOUR_STEPS[0];
  const isFirst = step === 0;
  const isLast = step === total - 1;
  const Icon = STEP_ICONS[current.id] || Star;

  useEffect(() => { nextRef.current?.focus(); }, [step]);

  // Mentre la guida è aperta i tasti di conduzione non devono proiettare nulla:
  // frecce e Invio scorrono la guida, Esc la chiude.
  useEffect(() => {
    function onKeyDown(event) {
      const back = document.documentElement.dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      const forward = document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      else if (event.key === forward || event.key === 'PageDown') { event.preventDefault(); if (isLast) onClose(); else onStepChange(step + 1); }
      else if (event.key === back || event.key === 'PageUp') { event.preventDefault(); if (!isFirst) onStepChange(step - 1); }
      event.stopPropagation();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [step, isFirst, isLast, onClose, onStepChange]);

  return (
    <div className="welcomeTourOverlay" role="presentation">
      <section className="welcomeTourCard" role="dialog" aria-modal="true" aria-labelledby="welcome-tour-title" aria-describedby="welcome-tour-text">
        <button type="button" className="welcomeTourClose" aria-label={t('tour.close')} title={t('tour.close')} onClick={onClose}><X size={16} /></button>
        <div className="welcomeTourIcon" aria-hidden="true"><Icon size={22} /></div>
        <p className="welcomeTourCounter">{t('tour.counter', { current: step + 1, total })}</p>
        <h2 id="welcome-tour-title">{t(`tour.${current.id}.title`)}</h2>
        <p id="welcome-tour-text" className="welcomeTourText">{renderRich(t(`tour.${current.id}.text`))}</p>
        <div className="welcomeTourDots" role="tablist" aria-label={t('tour.aria')}>
          {WELCOME_TOUR_STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={t('tour.goToStep', { current: index + 1, total })}
              className={index === step ? 'welcomeTourDot active' : 'welcomeTourDot'}
              onClick={() => onStepChange(index)}
            />
          ))}
        </div>
        <footer className="welcomeTourFooter">
          {isLast
            ? <span />
            : <button type="button" className="welcomeTourSkip" onClick={onClose}>{t('tour.skip')}</button>}
          <div className="welcomeTourNav">
            {!isFirst && (
              <button type="button" className="welcomeTourBack" onClick={() => onStepChange(step - 1)}>
                <ChevronLeft size={15} className="welcomeTourArrow" /> {t('tour.back')}
              </button>
            )}
            <button ref={nextRef} type="button" className="welcomeTourNext" onClick={() => (isLast ? onClose() : onStepChange(step + 1))}>
              {isLast ? t('tour.done') : <>{t('tour.next')} <ChevronRight size={15} className="welcomeTourArrow" /></>}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
