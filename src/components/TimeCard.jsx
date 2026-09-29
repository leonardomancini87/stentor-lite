import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Flag, Pause, Play, RotateCcw, Timer } from 'lucide-react';

import { formatDuration, getElapsed, getSectionElapsed } from '../utils/showTimer.js';
import { useCardCollapsed } from '../hooks/useCardCollapsed.js';
import CardCollapseButton from './CardCollapseButton.jsx';
import { renderRich, useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function formatDate(ms, language = 'it') {
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat({ en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-PT', zh: 'zh-CN', 'zh-Hant': 'zh-TW', ar: 'ar-u-nu-latn', ml: 'ml-IN', hi: 'hi-IN' }[language] || 'it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  } catch {
    return '';
  }
}

// Ridisegna solo questa card, due volte al secondo, mentre il cronometro è in marcia.
function useTicker(active) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) { setNow(Date.now()); return undefined; }
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

// Card "Tempi": cronometro della recita, a mano. Non comanda mai la proiezione.
export default function TimeCard({
  timer,
  performances = [],
  onStart,
  onPause,
  onFinish,
  onReset,
  timingMode = 'manual',
  onChangeTimingMode,
  timedCues = { timed: 0, total: 0 },
  onClearTimings,
  playback = { playing: false, time: 0, canPlay: false, cueNumber: '' },
  onPlay,
  onPausePlayback,
}) {
  const running = timer.status === 'running';
  const now = useTicker(running);
  const [showHistory, setShowHistory] = useState(false);
  const [collapsed, toggleCollapsed] = useCardCollapsed('time');
  const { t, language } = useI18n();
  const total = getElapsed(timer, now);
  const sectionMs = getSectionElapsed(timer, now);
  const last = performances[0] || null;
  const previous = performances.slice(1);

  return (
    <section className={classNames('liteTimeCard', 'liteSideCard', timer.status, collapsed && 'collapsed')} aria-label={t('time.title')}>
      <header className="liteTimeHeader">
        <span className="liteTimeEyebrow"><Timer size={13} aria-hidden="true" /> {t('time.title')}</span>
        {collapsed ? <span className="liteTimeStatus" /> : (
          <span className="liteTimeStatus">{t(running ? 'time.status.running' : timer.status === 'paused' ? 'time.status.paused' : 'time.status.idle')}</span>
        )}
        <CardCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} label={t('time.title')} />
      </header>
      {collapsed ? null : (<>

      <div className="liteTimeClock" aria-live="off">
        <strong>{formatDuration(total, { alwaysHours: true })}</strong>
        {timer.section && timer.status !== 'idle' ? (
          <span>
            <span className="liteTimeSection">{timer.section.title}</span>
            <b>{formatDuration(sectionMs)}</b>
          </span>
        ) : null}
      </div>

      <div className="liteTimeActions">
        {timer.status === 'running' ? (
          <button type="button" className="liteTimeButton" onClick={onPause}><Pause size={15} /> {t('time.pause')}</button>
        ) : (
          <button type="button" className="liteTimeButton primary" onClick={onStart}>
            <Play size={15} /> {t(timer.status === 'paused' ? 'time.resume' : 'time.start')}
          </button>
        )}
        {timer.status !== 'idle' ? (
          <>
            <button type="button" className="liteTimeButton" onClick={onFinish} title={t('time.finish.title')}><Flag size={15} /> {t('time.finish')}</button>
            <button type="button" className="liteTimeButton icon" onClick={onReset} title={t('time.reset')} aria-label={t('time.reset')}><RotateCcw size={15} /></button>
          </>
        ) : null}
      </div>

      <div className="liteTimeCues">
        <div className="liteTimeCuesHead">
          <strong>{t('time.cues.title')}</strong>
          <span>{t('time.cues.count', { timed: timedCues.timed, total: timedCues.total })}</span>
        </div>
        <div className="liteTimeModes" role="radiogroup" aria-label={t('time.cues.title')}>
          {[
            { id: 'manual', label: t('time.mode.manual') },
            { id: 'record', label: t('time.mode.record') },
            { id: 'play', label: t('time.mode.play') },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={timingMode === mode.id}
              className={timingMode === mode.id ? 'active' : undefined}
              title={mode.label}
              onClick={() => onChangeTimingMode?.(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {timingMode === 'manual' ? (
          <p className="liteTimeCuesText">{t('time.manual.text')}</p>
        ) : null}

        {timingMode === 'record' ? (
          timer.status === 'idle' ? (
            <ol className="liteTimeSteps">
              {['time.record.step1', 'time.record.step2', 'time.record.step3', 'time.record.step4'].map((key) => (
                <li key={key}>{renderRich(t(key))}</li>
              ))}
            </ol>
          ) : (
            <p className="liteTimeCuesText recording">
              {t(running ? 'time.record.running' : 'time.record.paused')}
            </p>
          )
        ) : null}

        {timingMode === 'play' ? (
          <div className="liteTimePlay">
            {timedCues.timed ? (
              <>
                <div className="liteTimePlayRow">
                  {playback.playing ? (
                    <button type="button" className="liteTimeButton" onClick={onPausePlayback}><Pause size={15} /> {t('time.play.stop')}</button>
                  ) : (
                    <button type="button" className="liteTimeButton primary" onClick={onPlay} disabled={!playback.canPlay}>
                      <Play size={15} /> {t('time.play.from', { number: playback.cueNumber })}
                    </button>
                  )}
                  <b className="liteTimePlayClock">{formatDuration((playback.time || 0) * 1000)}</b>
                </div>
                <p className="liteTimeCuesText">
                  {t(playback.playing ? 'time.play.playing' : playback.canPlay ? 'time.play.ready' : 'time.play.noTime')}
                </p>
              </>
            ) : (
              <p className="liteTimeCuesText">{renderRich(t('time.play.none'))}</p>
            )}
          </div>
        ) : null}

        {timingMode !== 'manual' && timedCues.timed ? (
          <button type="button" className="liteTimeClearTimings" onClick={onClearTimings}>{t('time.clear')}</button>
        ) : null}
      </div>

      {last ? (
        <div className="liteTimeLast">
          <div className="liteTimeLastHead">
            <span>{t('time.last', { date: formatDate(last.startedAt, language) })}</span>
            <strong>{formatDuration(last.totalMs, { alwaysHours: true })}</strong>
          </div>
          {last.sections.length ? (
            <ul>
              {last.sections.map((item, index) => (
                <li key={`${item.title}-${index}`}><span>{item.title}</span><b>{formatDuration(item.ms)}</b></li>
              ))}
            </ul>
          ) : null}
          {previous.length ? (
            <>
              <button type="button" className="liteTimeHistoryToggle" onClick={() => setShowHistory((value) => !value)} aria-expanded={showHistory}>
                {showHistory ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {t('time.previous', { count: previous.length })}
              </button>
              {showHistory ? (
                <ul className="liteTimeHistory">
                  {previous.map((item) => (
                    <li key={item.id}><span>{formatDate(item.startedAt, language)}</span><b>{formatDuration(item.totalMs, { alwaysHours: true })}</b></li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      ) : timer.status !== 'idle' || timingMode !== 'manual' ? null : (
        <p className="liteTimeHint">{t('time.hint')}</p>
      )}
      </>)}
    </section>
  );
}
