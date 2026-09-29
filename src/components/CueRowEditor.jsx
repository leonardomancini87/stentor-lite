import { useMemo, useState } from 'react';
import { Bold, Eraser, Italic, Minus, Plus, Underline } from 'lucide-react';
import { getCueText, getCueTextStyle, getCueTypography, patchCueTextStyle } from '../utils/cueTextStyle.js';
import {
  applyStylePatchToRange,
  clearStyleRange,
  getCueTextSpans,
  getRangePropertyState,
  getRangeValue,
} from '../utils/inlineStyleSpans.js';
import CueVoiceField from './CueVoiceField.jsx';
import RichCueTextEditor from './RichCueTextEditor.jsx';
import { MAX_LINES, getLineLimit } from '../utils/textCheck.js';
import { stripInlineFormatting } from '../utils/inlineFormatting.js';
import '../styles/cueRowEditor.css';
import { useI18n } from '../i18n/index.js';

// Contatore discreto dei caratteri per riga (es. "33/42", oppure "33 · 28 /42" su due righe).
function CharCounter({ text, limit }) {
  const MAX_CHARS_PER_LINE = limit;
  const { t } = useI18n();
  const plain = stripInlineFormatting(String(text || ''));
  const lines = plain.split('\n').map((line) => line.trim().length);
  const tooLong = lines.some((count) => count > MAX_CHARS_PER_LINE);
  const tooManyLines = lines.length > MAX_LINES;
  const title = lines.length > 1
    ? t('editor.chars.multi', { counts: lines.join(', '), limit: MAX_CHARS_PER_LINE, maxLines: MAX_LINES })
    : t('editor.chars.single', { count: lines[0], limit: MAX_CHARS_PER_LINE });
  return (
    <span className={`liteCueCharCounter${tooLong || tooManyLines ? ' over' : ''}`} title={title} aria-label={title}>
      {lines.map((count, index) => (
        <span key={index} className={count > MAX_CHARS_PER_LINE ? 'over' : undefined}>
          {index ? ' · ' : ''}{count}
        </span>
      ))}
      /{MAX_CHARS_PER_LINE}
      {tooManyLines ? <b> · {t('editor.chars.tooManyLines', { count: lines.length })}</b> : null}
    </span>
  );
}


const MIN_SCALE = 0.8;
const MAX_SCALE = 1.3;
const SCALE_STEP = 0.1;

function setCueLanguageSpans(cue, language, spans) {
  const textSpans = { ...(cue.textSpans || {}) };
  if (spans.length) textSpans[language] = spans;
  else delete textSpans[language];
  return { ...cue, textSpans };
}

export default function CueRowEditor({
  cue,
  index,
  project,
  panelId,
  updateCue,
  updateTranslation,
  changeCueVoice,
  onSplitSelectionChange,
  activeTextareaRef,
  appLanguage = 'it',
}) {
  const { bold } = getCueTextStyle(cue);
  const { t } = useI18n();
  const italic = cue.renderStyle === 'italic';
  const languages = [...new Set(project.languages?.length ? project.languages : [project.activeLanguage || 'it'])];
  const [selection, setSelection] = useState(null);

  const activeSelection = useMemo(() => {
    if (!selection || selection.cueId !== cue.id || selection.end <= selection.start) return null;
    const text = getCueText(cue, selection.language);
    if (selection.end > text.length) return null;
    return { ...selection, text };
  }, [cue, selection]);

  function changeStyle(patch) {
    updateCue(cue.id, (current) => patchCueTextStyle(current, patch));
  }

  function rememberSelection(nextSelection) {
    if (!nextSelection || nextSelection.cueId !== cue.id) return;
    setSelection(nextSelection);
    onSplitSelectionChange?.({
      cueId: cue.id,
      language: nextSelection.language,
      cursor: nextSelection.start,
      fullText: nextSelection.fullText,
    });
  }

  function applyLocalPatch(patch) {
    if (!activeSelection) return;
    updateCue(cue.id, (current) => {
      const text = getCueText(current, activeSelection.language);
      const spans = getCueTextSpans(current, activeSelection.language);
      const next = applyStylePatchToRange(
        spans,
        activeSelection.start,
        activeSelection.end,
        patch,
        text.length,
      );
      return setCueLanguageSpans(current, activeSelection.language, next);
    });
  }

  function toggleLocal(property, baseValue) {
    if (!activeSelection) return;
    const spans = getCueTextSpans(cue, activeSelection.language);
    const state = getRangePropertyState(
      spans,
      activeSelection.start,
      activeSelection.end,
      property,
      baseValue,
      activeSelection.text.length,
    );
    applyLocalPatch({ [property]: state === 'on' ? false : true });
  }

  function clearLocalFormatting() {
    if (!activeSelection) return;
    updateCue(cue.id, (current) => {
      const text = getCueText(current, activeSelection.language);
      const spans = getCueTextSpans(current, activeSelection.language);
      return setCueLanguageSpans(
        current,
        activeSelection.language,
        clearStyleRange(spans, activeSelection.start, activeSelection.end, text.length),
      );
    });
  }

  const selectedSpans = activeSelection ? getCueTextSpans(cue, activeSelection.language) : [];
  const selectedBoldState = activeSelection
    ? getRangePropertyState(selectedSpans, activeSelection.start, activeSelection.end, 'bold', bold, activeSelection.text.length)
    : (bold ? 'on' : 'off');
  const selectedItalicState = activeSelection
    ? getRangePropertyState(selectedSpans, activeSelection.start, activeSelection.end, 'italic', italic, activeSelection.text.length)
    : (italic ? 'on' : 'off');
  const selectedUnderlineState = activeSelection
    ? getRangePropertyState(selectedSpans, activeSelection.start, activeSelection.end, 'underline', false, activeSelection.text.length)
    : 'off';
  const selectedColor = activeSelection
    ? getRangeValue(selectedSpans, activeSelection.start, activeSelection.end, 'color', null, activeSelection.text.length)
    : null;
  const selectedScale = activeSelection
    ? getRangeValue(selectedSpans, activeSelection.start, activeSelection.end, 'fontScale', 1, activeSelection.text.length)
    : 1;
  const displayScale = Math.round((selectedScale || 1) * 100);

  function handleKeyDown(event) {
    if (event.target.closest('button') && (event.code === 'Space' || event.key === 'Enter')) {
      event.stopPropagation();
    }
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.stopPropagation();
      event.target.blur?.();
    }
  }

  const preventSelectionLoss = (event) => event.preventDefault();

  return (
    <section
      id={panelId}
      className="liteCueExpandedEditor"
      role="region"
      aria-label={t('editor.aria', { number: index + 1 })}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <CueVoiceField cue={cue} project={project} onCommit={changeCueVoice} appLanguage={appLanguage} />
      <div className="liteCueLanguageFields">
        {languages.map((lang) => (
          <label key={lang} className="liteCueLanguageField">
            <span className="liteCueFieldLabel">
              <strong>{String(lang).toUpperCase()}</strong>
              <span>{project.languageNames?.[lang] || String(lang).toUpperCase()}</span>
              <CharCounter text={getCueText(cue, lang)} limit={getLineLimit(project)} />
            </span>
            <RichCueTextEditor
              value={getCueText(cue, lang)}
              spans={getCueTextSpans(cue, lang)}
              cueId={cue.id}
              language={lang}
              ariaLabel={t('editor.text.aria', { language: String(lang).toUpperCase(), number: index + 1 })}
              style={{ ...getCueTypography(cue, 500), textAlign: 'left' }}
              activeEditorRef={activeTextareaRef}
              onSelectionChange={rememberSelection}
              onChange={(value) => updateTranslation(cue.id, lang, value)}
            />
          </label>
        ))}
      </div>

      <div className="liteCueStyleRow">
        <div className="liteCueStyleButtons" role="group" aria-label={t('editor.style.aria')}>
          <button
            type="button"
            title={t('editor.bold')}
            aria-label={t('editor.bold')}
            aria-pressed={selectedBoldState === 'on'}
            data-mixed={selectedBoldState === 'mixed' || undefined}
            onMouseDown={preventSelectionLoss}
            onClick={() => activeSelection ? toggleLocal('bold', bold) : changeStyle({ bold: !bold })}
          ><Bold size={17} /></button>
          <button
            type="button"
            title={t('editor.italic')}
            aria-label={t('editor.italic')}
            aria-pressed={selectedItalicState === 'on'}
            data-mixed={selectedItalicState === 'mixed' || undefined}
            onMouseDown={preventSelectionLoss}
            onClick={() => activeSelection
              ? toggleLocal('italic', italic)
              : updateCue(cue.id, (current) => ({ ...current, renderStyle: current.renderStyle === 'italic' ? 'normal' : 'italic' }))}
          ><Italic size={17} /></button>
          <button
            type="button"
            title={t('editor.underline')}
            aria-label={t('editor.underline')}
            aria-pressed={selectedUnderlineState === 'on'}
            data-mixed={selectedUnderlineState === 'mixed' || undefined}
            disabled={!activeSelection}
            onMouseDown={preventSelectionLoss}
            onClick={() => toggleLocal('underline', false)}
          ><Underline size={17} /></button>

          <span className="liteCueStyleDivider" aria-hidden="true" />

          <label
            className={`liteCueColorControl${activeSelection ? '' : ' disabled'}`}
            title={t('editor.color')}
            aria-label={t('editor.color')}
          >
            <span className="liteCueColorGlyph" style={{ '--selected-text-color': selectedColor || '#F3E7B3' }}>A</span>
            <input
              type="color"
              aria-label={t('editor.color')}
              value={selectedColor || '#F3E7B3'}
              disabled={!activeSelection}
              onChange={(event) => applyLocalPatch({ color: event.target.value })}
            />
          </label>

          <button
            type="button"
            title={t('editor.smaller')}
            aria-label={t('editor.smaller')}
            disabled={!activeSelection || displayScale <= MIN_SCALE * 100}
            onMouseDown={preventSelectionLoss}
            onClick={() => applyLocalPatch({ fontScale: Math.max(MIN_SCALE, Number((displayScale / 100 - SCALE_STEP).toFixed(1))) })}
          ><Minus size={15} /></button>
          <span className={`liteCueScaleValue${activeSelection ? '' : ' disabled'}`} aria-label={t('editor.scaleValue', { value: displayScale })}>{displayScale}%</span>
          <button
            type="button"
            title={t('editor.larger')}
            aria-label={t('editor.larger')}
            disabled={!activeSelection || displayScale >= MAX_SCALE * 100}
            onMouseDown={preventSelectionLoss}
            onClick={() => applyLocalPatch({ fontScale: Math.min(MAX_SCALE, Number((displayScale / 100 + SCALE_STEP).toFixed(1))) })}
          ><Plus size={15} /></button>

          <button
            type="button"
            title={t('editor.clear')}
            aria-label={t('editor.clear')}
            disabled={!activeSelection}
            onMouseDown={preventSelectionLoss}
            onClick={clearLocalFormatting}
          ><Eraser size={16} /></button>

        </div>
      </div>

      <label className="liteCueNoteField">
        <span className="liteCueFieldLabel liteCueNoteLabel">{t('editor.notes')}</span>
        <textarea
          aria-label={t('editor.notes.aria', { number: index + 1 })}
          rows={2}
          value={cue.note || ''}
          onChange={(event) => updateCue(cue.id, (current) => ({ ...current, note: event.target.value }))}
          placeholder={t('editor.notes.placeholder')}
        />
      </label>
    </section>
  );
}
