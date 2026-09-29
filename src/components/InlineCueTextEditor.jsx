import { useLayoutEffect, useRef } from 'react';

// Textarea integrata nella riga dell'elenco battute: stessa tipografia del testo
// normale, nessun riquadro proprio. Le modifiche sono applicate subito;
// Invio conferma, Maiusc+Invio va a capo, Esc ripristina il testo iniziale.
export default function InlineCueTextEditor({ value, caret, onChange, onExit, ariaLabel }) {
  const textareaRef = useRef(null);
  const initialValueRef = useRef(value);
  const lineCount = Math.max(1, String(value).split('\n').length);

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const position = Math.min(caret ?? element.value.length, element.value.length);
    element.setSelectionRange(position, position);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (value !== initialValueRef.current) onChange(initialValueRef.current);
      onExit();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onExit();
    }
  }

  return (
    <textarea
      ref={textareaRef}
      className="liteInlineCueText"
      value={value}
      rows={lineCount}
      wrap="off"
      spellCheck={false}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onExit}
      aria-label={ariaLabel}
    />
  );
}
