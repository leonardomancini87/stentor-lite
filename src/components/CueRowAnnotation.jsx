import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';

// Presentation only: use the existing cue.note, never a second note field.
// Con onEditNote, un clic sulla nota la modifica direttamente nella riga
// (Invio conferma, Maiusc+Invio va a capo, Esc annulla) senza proiettare la battuta.
export default function CueRowAnnotation({ cue, isProjected = false, isNext = false, onEditNote }) {
  const [editing, setEditing] = useState(false);
  const [caret, setCaret] = useState(null);
  const { t } = useI18n();
  if (isProjected) return <em className="liteCueCurrentBadge">{t('cues.current')}</em>;

  // Whitespace-only or invalid legacy values should not create a visible hint.
  // Keep the full original string (including newlines) in the DOM and title.
  const note = typeof cue?.note === 'string' && cue.note.trim() ? cue.note : '';
  const nextTag = isNext ? <b className="r11NextTag">{t('cues.next')}</b> : null;

  if (editing && onEditNote) {
    return (
      <span className="liteCueOperatorNote editing" data-no-translate="">
        <InlineNoteEditor
          value={typeof cue?.note === 'string' ? cue.note : ''}
          onChange={onEditNote}
          caret={caret}
          onExit={() => setEditing(false)}
          label={t('cues.note.label')}
        />
        {nextTag}
      </span>
    );
  }

  const editProps = onEditNote && note ? {
    'data-editable': 'true',
    title: `${note}\n\n${t('cues.note.edit')}`,
    onClick: (event) => { event.stopPropagation(); setCaret(getNoteCaretOffset(event)); setEditing(true); },
    onDoubleClick: (event) => event.stopPropagation(),
  } : { title: note || undefined };

  return (
    <span className={nextTag ? 'liteCueOperatorNote withNextTag' : 'liteCueOperatorNote'} data-no-translate="" {...editProps}>
      {nextTag ? <span className="liteCueNoteText">{note}</span> : note}
      {nextTag}
    </span>
  );
}

// Posizione del clic nel testo della nota, così il cursore compare esattamente lì.
function getNoteCaretOffset(event) {
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
  // Solo il testo della nota, non l'etichetta "Prossima": nella battuta successiva il testo
  // sta dentro .liteCueNoteText, altrove è il primo nodo.
  const first = event.currentTarget.firstChild;
  const noteText = first?.nodeType === Node.ELEMENT_NODE ? first.firstChild : first;
  if (!node || node !== noteText || node.nodeType !== Node.TEXT_NODE) return null;
  return offset;
}

function InlineNoteEditor({ value, caret, onChange, onExit, label = 'Nota operatore' }) {
  const ref = useRef(null);
  const initialRef = useRef(value);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const position = Math.min(caret ?? element.value.length, element.value.length);
    element.setSelectionRange(position, position);
  }, []);

  function handleKeyDown(event) {
    event.stopPropagation();
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (value !== initialRef.current) onChange(initialRef.current);
      onExit();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onExit();
    }
  }

  return (
    <textarea
      ref={ref}
      className="liteInlineNoteText"
      value={value}
      rows={Math.max(1, String(value).split('\n').length)}
      spellCheck={false}
      placeholder={label}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onExit}
    />
  );
}
