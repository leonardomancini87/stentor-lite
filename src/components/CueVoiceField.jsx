import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getUniqueVoices, normalizeVoice } from '../utils/cueVoices.js';
import { voiceMessage } from '../utils/voiceMessages.js';

export default function CueVoiceField({ cue, project, onCommit, appLanguage = 'it' }) {
  const inputId = useId();
  const listId = `${inputId}-voices`;
  // Only the unconfirmed input is local. Confirmed voices live in cue.speaker.
  const [draft, setDraft] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [pending, setPending] = useState(false);
  const committing = useRef(false);
  const skipBlur = useRef(false);
  const composing = useRef(false);
  const mounted = useRef(true);
  const listRef = useRef(null);
  const value = draft ?? normalizeVoice(cue.speaker);
  const t = (key) => voiceMessage(appLanguage, key);
  const voices = useMemo(() => getUniqueVoices(project.cues, appLanguage), [project.cues, appLanguage]);
  const query = normalizeVoice(value).toLocaleLowerCase(appLanguage);
  const suggestions = voices.filter((voice) => voice.toLocaleLowerCase(appLanguage).includes(query));
  const expanded = open && !pending && suggestions.length > 0;
  const selected = highlighted >= 0 && highlighted < suggestions.length ? highlighted : -1;

  useEffect(() => {
    setDraft(null);
    setHighlighted(-1);
  }, [cue.id, cue.speaker, project.id]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const option = list?.children[selected];
    if (!list || !option) return;
    // Scroll only the suggestions, never the cue list or the page.
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [selected, expanded]);

  async function commit(nextValue) {
    if (committing.current || composing.current) return;
    setOpen(false);
    setHighlighted(-1);
    if (normalizeVoice(nextValue) === normalizeVoice(cue.speaker)) {
      setDraft(null);
      return;
    }
    committing.current = true;
    setPending(true);
    try {
      await onCommit(cue.id, normalizeVoice(nextValue));
    } finally {
      committing.current = false;
      if (mounted.current) {
        setPending(false);
        // Cancel and confirm both return to the canonical project value.
        setDraft(null);
      }
    }
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) {
      event.stopPropagation();
      return;
    }
    const undoKey = (event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase());
    if (undoKey) {
      // Native undo while typing a draft; project undo after confirmation.
      if (draft !== null) event.stopPropagation();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
      if (suggestions.length) {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setHighlighted(selected < 0 ? (delta > 0 ? 0 : suggestions.length - 1)
          : (selected + delta + suggestions.length) % suggestions.length);
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void commit(expanded && selected >= 0 ? suggestions[selected] : value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      skipBlur.current = true;
      setDraft(null);
      setOpen(false);
      setHighlighted(-1);
      event.currentTarget.blur();
    } else if (event.code === 'Space' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.stopPropagation();
    }
  }

  return (
    <div className="liteCueVoiceField" data-no-translate="">
      <label className="liteCueFieldLabel" htmlFor={inputId}><strong>{t('voice')}</strong></label>
      <div className="liteCueVoiceCombobox">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listId : undefined}
          aria-activedescendant={expanded && selected >= 0 ? `${listId}-${selected}` : undefined}
          aria-busy={pending}
          placeholder={t('noVoice')}
          value={value}
          disabled={pending}
          autoComplete="off"
          spellCheck={false}
          dir="auto"
          onChange={(event) => {
            setDraft(event.target.value);
            setOpen(true);
            setHighlighted(-1);
          }}
          onFocus={() => { setOpen(true); setHighlighted(-1); }}
          onBlur={() => {
            setOpen(false);
            if (skipBlur.current) { skipBlur.current = false; return; }
            void commit(value);
          }}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { composing.current = true; }}
          onCompositionEnd={() => { composing.current = false; }}
        />
        {expanded && (
          <ul id={listId} ref={listRef} className="liteCueVoiceSuggestions" role="listbox" aria-label={t('suggestions')}>
            {suggestions.map((voice, index) => (
              <li
                key={voice}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={selected === index}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => { setDraft(voice); void commit(voice); }}
              >{voice}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
