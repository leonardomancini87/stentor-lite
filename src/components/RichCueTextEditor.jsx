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
    if (!focusedRef.current) return;
    const element = editorRef.current;
    restoreSelection(element, selectionRef.current);
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
      suppressContentEditableWarning
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
    >
      {segmentTextBySpans(value, spans).map((segment) => (
        <span key={`${segment.start}-${segment.end}`} style={segmentStyle(segment)}>{segment.text}</span>
      ))}
    </div>
  );
}
