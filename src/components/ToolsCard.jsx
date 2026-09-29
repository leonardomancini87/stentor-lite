import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Pilcrow, Quote, Space, Wrench } from 'lucide-react';

import { isMarkerCue } from '../utils/markers.js';
import { formatCueNumber, getCueNumbers } from '../utils/showMap.js';
import { getLanguageName } from '../utils/projectLanguages.js';
import { CLEANUP_OPTIONS, DEFAULT_CLEANUP, cleanCues } from '../utils/textCleanup.js';
import {
  LINE_LIMIT_PRESETS,
  MAX_LINE_LIMIT,
  MIN_LINE_LIMIT,
  buildTextCheck,
  describeCue,
  getCueProblems,
  getLineLimit,
  nextIndexAfter,
  normalizeLineLimit,
} from '../utils/textCheck.js';
import { useCardCollapsed } from '../hooks/useCardCollapsed.js';
import CardCollapseButton from './CardCollapseButton.jsx';
import { useI18n } from '../i18n/index.js';

const TAB_STORAGE_KEY = 'stentor.toolsCard.tab.v1';

const CLEANUP_ICONS = { spaces: Space, emptyLines: Pilcrow, typography: Quote };

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function loadTab() {
  try {
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    return saved === 'clean' || saved === 'check' ? saved : 'check';
  } catch {
    return 'check';
  }
}

// Dettaglio di un controllo, con il limite di caratteri del progetto.
function checkDetail(t, id, limit) {
  return t(`check.${id}.detail`, { limit, total: limit * 2 });
}

function CleanupPanel({ project, activeCue, activeNumber, setProject }) {
  const [scope, setScope] = useState('cue');
  const [options, setOptions] = useState(DEFAULT_CLEANUP);
  const [result, setResult] = useState('');
  const { t } = useI18n();
  const canCleanCue = Boolean(activeCue && !isMarkerCue(activeCue));
  const effectiveScope = canCleanCue ? scope : 'all';
  const selected = CLEANUP_OPTIONS.filter((option) => options[option.id]);

  useEffect(() => setResult(''), [scope, options, activeCue?.id]);

  function apply() {
    if (!selected.length) {
      setResult(t('clean.none'));
      return;
    }
    const outcome = cleanCues(project.cues, options, { onlyCueId: effectiveScope === 'cue' ? activeCue.id : null });
    if (outcome.changedCues) setProject((current) => ({ ...current, cues: outcome.cues }));
    setResult(outcome.changedCues ? t('clean.done', { count: outcome.changedCues }) : t('clean.nothing'));
  }

  return (
    <div className="liteToolsPane">
      <div className="liteToolsScope" role="radiogroup" aria-label={t('clean.scope')}>
        <button type="button" role="radio" aria-checked={effectiveScope === 'cue'} className={classNames(effectiveScope === 'cue' && 'active')} onClick={() => setScope('cue')} disabled={!canCleanCue}>
          {canCleanCue ? t('clean.scope.cue', { number: activeNumber }) : t('clean.scope.cue', { number: '' }).trim()}
        </button>
        <button type="button" role="radio" aria-checked={effectiveScope === 'all'} className={classNames(effectiveScope === 'all' && 'active')} onClick={() => setScope('all')}>
          {t('clean.scope.all')}
        </button>
      </div>

      <div className="liteToolsCleanupList">
        {CLEANUP_OPTIONS.map((option) => {
          const Icon = CLEANUP_ICONS[option.id];
          const checked = Boolean(options[option.id]);
          return (
            <label key={option.id} className={classNames('liteToolsCleanupItem', checked && 'on')}>
              <span className="liteToolsCleanupIcon" aria-hidden="true">{Icon ? <Icon size={16} /> : null}</span>
              <span className="liteToolsCleanupText">
                <strong>{t(`clean.${option.id}.label`)}</strong>
                <small>{t(`clean.${option.id}.help`)}</small>
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => setOptions((current) => ({ ...current, [option.id]: event.target.checked }))}
              />
            </label>
          );
        })}
      </div>
      <p className="liteToolsFootnote">{t('clean.footnote')}</p>

      <button type="button" className="liteToolsPrimary" onClick={apply}>
        {effectiveScope === 'cue' ? t('clean.apply.cue', { number: activeNumber }) : t('clean.apply.all')}
      </button>
      {result ? <p className="liteToolsResult" role="status">{result}</p> : null}
    </div>
  );
}

// Limite di caratteri per riga: 37, 42 oppure un valore scelto (salvato nel progetto).
function LineLimitControl({ limit, onChange }) {
  const isPreset = LINE_LIMIT_PRESETS.includes(limit);
  const [custom, setCustom] = useState(!isPreset);
  const [draft, setDraft] = useState(String(limit));
  const { t } = useI18n();
  useEffect(() => { setDraft(String(limit)); if (!LINE_LIMIT_PRESETS.includes(limit)) setCustom(true); }, [limit]);

  function commit() {
    const value = normalizeLineLimit(draft);
    setDraft(String(value));
    if (value !== limit) onChange(value);
  }

  return (
    <div className="liteToolsLimit">
      <span>{t('tools.limit.title')}</span>
      <div className="liteToolsLimitChoices" role="group" aria-label={t('tools.limit.title')}>
        {LINE_LIMIT_PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            className={!custom && limit === value ? 'active' : undefined}
            aria-pressed={!custom && limit === value}
            onClick={() => { setCustom(false); onChange(value); }}
          >
            {value}
          </button>
        ))}
        {custom ? (
          <input
            type="number"
            min={MIN_LINE_LIMIT}
            max={MAX_LINE_LIMIT}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }}
            aria-label={t('tools.limit.custom')}
          />
        ) : (
          <button type="button" onClick={() => setCustom(true)}>{t('common.other')}</button>
        )}
      </div>
    </div>
  );
}

function CheckPanel({ project, language, activeIndex, screenColors, onRevealCue, onChangeLimit }) {
  const numbers = useMemo(() => getCueNumbers(project.cues), [project.cues]);
  const limit = getLineLimit(project);
  const report = useMemo(() => buildTextCheck(project.cues, language, screenColors, limit), [project.cues, language, screenColors, limit]);
  const activeCue = project.cues[activeIndex];
  const showActive = activeCue && !isMarkerCue(activeCue);
  const activeInfo = showActive ? describeCue(activeCue, language) : null;
  const activeProblems = showActive ? getCueProblems(activeCue, language, limit) : [];
  const languageName = getLanguageName(project, language);
  const { t } = useI18n();

  return (
    <div className="liteToolsPane">
      {showActive ? (
        <div className={classNames('liteToolsCueSummary', activeProblems.length && 'hasProblems')}>
          <strong>{t('tools.cue', { number: formatCueNumber(numbers[activeIndex]) })}</strong>
          <span>
            {activeInfo.lineCount
              ? `${t('tools.cue.info', { lines: t('count.lines', { count: activeInfo.lineCount }), chars: activeInfo.totalChars })}${activeInfo.lineCount > 1 ? ` (${activeInfo.charsPerLine.join(' / ')})` : ''}`
              : t('tools.cue.empty', { language: languageName })}
          </span>
          {activeProblems.filter((id) => id !== 'missing').map((id) => (
            <em key={id}>{t(`check.${id}.single`)}</em>
          ))}
        </div>
      ) : null}

      {report.items.length ? null : (
        <p className="liteToolsIntro">{t('tools.noIssues', { language: languageName })}</p>
      )}

      {report.items.length ? (
        <ul className="liteToolsIssues">
          {report.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={classNames('liteToolsIssue', item.severity)}
                onClick={() => onRevealCue?.(nextIndexAfter(item.indexes, activeIndex))}
                title={t('tools.issue.hint', { detail: checkDetail(t, item.id, limit), cues: t('count.cues', { count: item.indexes.length }) })}
              >
                <span className="liteToolsIssueDot" aria-hidden="true" />
                <span className="liteToolsIssueText">{t(`check.${item.id}.title`)}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Il contrasto compare solo quando i colori dello schermo rendono il testo difficile da leggere. */}
      {report.contrast !== 'ok' ? (
        <div className={classNames('liteToolsContrast', report.contrast)}>
          <span>{t(report.contrast === 'error' ? 'tools.contrast.error' : 'tools.contrast.warning')}</span>
          <strong>{t('tools.contrast.detail')}</strong>
        </div>
      ) : null}

      <LineLimitControl limit={limit} onChange={onChangeLimit} />
    </div>
  );
}

// Card "Strumenti" nella colonna destra di Sopratitoli: Verifica e Pulizia del copione.
export default function ToolsCard({ project, language, activeIndex, setProject, screenColors, onRevealCue }) {
  const [tab, setTab] = useState(loadTab);
  const numbers = useMemo(() => getCueNumbers(project.cues), [project.cues]);
  const activeCue = project.cues[activeIndex] || null;
  const [collapsed, toggleCollapsed] = useCardCollapsed('tools');
  const { t } = useI18n();

  useEffect(() => {
    try { window.localStorage.setItem(TAB_STORAGE_KEY, tab); } catch { /* solo per questa sessione */ }
  }, [tab]);

  return (
    <section className={classNames('liteToolsCard', 'liteSideCard', collapsed && 'collapsed')} aria-label={t('tools.title')}>
      <header className="liteToolsHeader">
        <span className="liteToolsEyebrow"><Wrench size={13} aria-hidden="true" /> {t('tools.title')}</span>
        <span className="liteToolsCollapsedSummary" />
        <CardCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} label={t('tools.title')} />
      </header>

      {collapsed ? null : (
        <div className="liteToolsTabs" role="tablist" aria-label={t('tools.title')}>
          {[
            { id: 'check', label: t('tools.tab.check') },
            { id: 'clean', label: t('tools.tab.clean') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={classNames('liteToolsTab', tab === item.id && 'active')}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {collapsed ? null : tab === 'check' ? (
        <CheckPanel
          project={project}
          language={language}
          activeIndex={activeIndex}
          screenColors={screenColors}
          onRevealCue={onRevealCue}
          onChangeLimit={(value) => setProject((current) => ({
            ...current,
            settings: { ...(current.settings || {}), maxCharsPerLine: value },
          }))}
        />
      ) : (
        <CleanupPanel
          project={project}
          activeCue={activeCue}
          activeNumber={formatCueNumber(numbers[activeIndex])}
          setProject={setProject}
        />
      )}
    </section>
  );
}
