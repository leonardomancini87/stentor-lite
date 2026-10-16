import { useLayoutEffect, useRef } from 'react';
import { segmentTextBySpans } from '../utils/inlineStyleSpans.js';

function containsNode(root, node) {
  return Boolean(root && node && (root === node || root.contains(node)));
}

function getSelectionOffsets(root) {
  const selection = window.getSelection?.();
  if (!root || !selection || selection.rangeCount < 1) return null;
  const range = selection.getRangeAt(0);
  if (!containsNode(root, range.startContainer) || !containsNode(root, range.endContainer)) return null;
  const beforeStart = document.createRange();
  beforeStart.selectNodeContents(root);
  beforeStart.setEnd(range.startContainer, range.startOffset);
  const beforeEnd = document.createRange();
  beforeEnd.selectNodeContents(root);
  beforeEnd.setEnd(range.endContainer, range.endOffset);
  return { start: beforeStart.toString().length, end: beforeEnd.toString().length };
}

function locateTextOffset(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();
  let last = null;
  while (node) {
    last = node;
    const length = node.nodeValue?.length || 0;
    if (remaining <= length) return { node, offset: remaining };
    remaining -= length;
    node = walker.nextNode();
  }
  return last ? { node: last, offset: last.nodeValue?.length || 0 } : { node: root, offset: 0 };
}

function restoreSelection(root, offsets) {
  if (!root || !offsets) return;
  const start = locateTextOffset(root, offsets.start);
  const end = locateTextOffset(root, offsets.end);
  const range = document.createRange();
  try {
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    const selection = window.getSelection?.();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch {
    // A browser may briefly rebuild the editable tree; a later selection event will resync.
  }
}

function readPlainText(root) {
  // Un campo svuotato può restare con un solo <br>: innerText darebbe «\n».
  if (!root?.textContent) return '';
  return String(root?.innerText ?? root?.textContent ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ');
}

function insertTextAtSelection(root, text) {
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount < 1) return false;
  const range = selection.getRangeAt(0);
  if (!containsNode(root, range.startContainer) || !containsNode(root, range.endContainer)) return false;
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function segmentStyle(segment) {
  const style = {};
  if (segment.bold === true) style.fontWeight = 800;
  if (segment.bold === false) style.fontWeight = 400;
  if (segment.italic === true) style.fontStyle = 'italic';
  if (segment.italic === false) style.fontStyle = 'normal';
  if (segment.underline === true) style.textDecoration = 'underline';
  if (segment.underline === false) style.textDecoration = 'none';
  if (segment.color) style.color = segment.color;
  if (Number.isFinite(Number(segment.fontScale))) style.fontSize = `${Number(segment.fontScale) * 100}%`;
  return style;
}

// Il contenuto del campo è scritto direttamente nel DOM e non lasciato a React. Mentre si scrive è il
// browser a modificare il campo, a volte con nodi di testo fuori dai <span>: se React ricostruisse i
// figli dopo ogni tasto, quei nodi resterebbero accanto ai nuovi <span> e il testo verrebbe duplicato
// (succedeva soprattutto scrivendo in un campo vuoto, per esempio dopo «Dividi»).
function renderContent(root, value, spans) {
  const nodes = segmentTextBySpans(value, spans)
    .filter((segment) => segment.text)
    .map((segment) => {
      const span = document.createElement('span');
      Object.assign(span.style, segmentStyle(segment));
      span.textContent = segment.text;
      return span;
    });
  root.replaceChildren(...nodes);
}

export default function RichCueTextEditor({
  value,
  spans = [],
  cueId,
  language,
  ariaLabel,
  style,
  onChange,
  onSelectionChange,
  activeEditorRef,
}) {
  const editorRef = useRef(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const focusedRef = useRef(false);
  const composingRef = useRef(false);
  const renderedRef = useRef(null);

  function publishSelection() {
    const element = editorRef.current;
    const offsets = getSelectionOffsets(element);
    if (!offsets) return;
    selectionRef.current = offsets;
    element.dataset.stentorSelectionStart = String(offsets.start);
    element.dataset.stentorSelectionEnd = String(offsets.end);
    if (activeEditorRef && typeof activeEditorRef === 'object') activeEditorRef.current = element;
    onSelectionChange?.({
      cueId,
      language,
      start: offsets.start,
      end: offsets.end,
      cursor: offsets.start,
      fullText: String(value ?? ''),
    });
  }

  useLayoutEffect(() => {
    const element = editorRef.current;
    if (!element) return;
    const text = String(value ?? '');
    const spansKey = JSON.stringify(spans || []);
    const domMatches = readPlainText(element) === text;
    const rendered = renderedRef.current;
    // Testo appena scritto dall'utente: il DOM è già giusto, non va toccato (cursore, IME).
    if (domMatches && (composingRef.current || (rendered && rendered.spansKey === spansKey))) {
      renderedRef.current = { text, spansKey };
      return;
    }
    renderContent(element, text, spans);
    renderedRef.current = { text, spansKey };
    if (focusedRef.current) restoreSelection(element, selectionRef.current);
  }, [value, spans]);

  function commitDomText(element) {
    const offsets = getSelectionOffsets(element) || selectionRef.current;
    selectionRef.current = offsets;
    const next = readPlainText(element);
    onChange?.(next);
    onSelectionChange?.({ cueId, language, ...offsets, cursor: offsets.start, fullText: next });
  }

  function handleKeyDown(event) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (insertTextAtSelection(editorRef.current, '\n')) commitDomText(editorRef.current);
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      editorRef.current?.blur();
    }
  }

  function handlePaste(event) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    if (insertTextAtSelection(editorRef.current, text)) commitDomText(editorRef.current);
  }

  return (
    <div
      ref={editorRef}
      className="liteRichCueTextEditor"
      role="textbox"
      aria-multiline="true"
      aria-label={ariaLabel}
      lang={language}
      dir="auto"
      data-cue-id={cueId}
      data-cue-language={language}
      contentEditable
      spellCheck={false}
      style={style}
      onFocus={() => { focusedRef.current = true; publishSelection(); }}
      onBlur={() => { focusedRef.current = false; publishSelection(); }}
      onMouseUp={publishSelection}
      onKeyUp={publishSelection}
      onSelect={publishSelection}
      onInput={(event) => commitDomText(event.currentTarget)}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={(event) => { composingRef.current = false; commitDomText(event.currentTarget); }}
    />
  );
}
