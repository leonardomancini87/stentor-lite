const TAG_STYLES = {
  i: 'italic',
  em: 'italic',
  b: 'bold',
  strong: 'bold',
  u: 'underline',
  s: 'strike',
  strike: 'strike',
  sub: 'subscript',
  sup: 'superscript',
};

const ACTION_TAGS = {
  italic: 'i',
  bold: 'b',
  underline: 'u',
  strike: 's',
  subscript: 'sub',
  superscript: 'sup',
};

const SUPPORTED_TAG_PATTERN = /<\/?(?:i|em|b|strong|u|s|strike|sub|sup)>/gi;

function cloneState(state) {
  return {
    italic: state.italic,
    bold: state.bold,
    underline: state.underline,
    strike: state.strike,
    subscript: state.subscript,
    superscript: state.superscript,
  };
}

function hasAnyStyle(state) {
  return Boolean(
    state.italic || state.bold || state.underline || state.strike || state.subscript || state.superscript
  );
}

export function parseInlineFormatting(text = '') {
  const value = String(text || '');
  const segments = [];
  const state = {
    italic: false,
    bold: false,
    underline: false,
    strike: false,
    subscript: false,
    superscript: false,
  };
  let index = 0;
  let buffer = '';

  function pushBuffer() {
    if (!buffer) return;
    segments.push({ text: buffer, ...cloneState(state) });
    buffer = '';
  }

  while (index < value.length) {
    const tagMatch = value.slice(index).match(/^<\/?(?:i|em|b|strong|u|s|strike|sub|sup)>/i);
    if (tagMatch) {
      const rawTag = tagMatch[0];
      const isClosing = rawTag.startsWith('</');
      const tagName = rawTag.replace(/[</>]/g, '').toLowerCase();
      const styleName = TAG_STYLES[tagName];
      if (styleName) {
        pushBuffer();
        state[styleName] = !isClosing;
        if (styleName === 'subscript' && !isClosing) state.superscript = false;
        if (styleName === 'superscript' && !isClosing) state.subscript = false;
        index += rawTag.length;
        continue;
      }
    }

    buffer += value[index];
    index += 1;
  }

  pushBuffer();
  return segments.length ? segments : [{ text: '', ...cloneState(state) }];
}

export function stripInlineFormatting(text = '') {
  return String(text || '').replace(SUPPORTED_TAG_PATTERN, '');
}

export function hasInlineFormatting(text = '') {
  return SUPPORTED_TAG_PATTERN.test(String(text || ''));
}

function normalizeRange(text, selectionStart = 0, selectionEnd = 0) {
  const start = Math.max(0, Math.min(selectionStart, text.length));
  const end = Math.max(start, Math.min(selectionEnd, text.length));
  return { start, end };
}

export function applyInlineMarkup(value = '', selectionStart = 0, selectionEnd = 0, action = 'italic') {
  const tag = ACTION_TAGS[action] || 'i';
  const text = String(value || '');
  const { start, end } = normalizeRange(text, selectionStart, selectionEnd);

  if (start === end) {
    const next = `${text.slice(0, start)}<${tag}></${tag}>${text.slice(end)}`;
    return {
      value: next,
      selectionStart: start + tag.length + 2,
      selectionEnd: start + tag.length + 2,
    };
  }

  const selected = text.slice(start, end);
  const trimmedStartOffset = selected.search(/\S/);
  if (trimmedStartOffset === -1) {
    const next = `${text.slice(0, start)}<${tag}>${selected}</${tag}>${text.slice(end)}`;
    return {
      value: next,
      selectionStart: start,
      selectionEnd: end + tag.length * 2 + 5,
    };
  }

  const trailingWhitespaceLength = selected.match(/\s*$/)?.[0]?.length || 0;
  const markupStart = start + trimmedStartOffset;
  const markupEnd = end - trailingWhitespaceLength;
  const next = `${text.slice(0, markupStart)}<${tag}>${text.slice(markupStart, markupEnd)}</${tag}>${text.slice(markupEnd)}`;

  return {
    value: next,
    selectionStart: markupStart,
    selectionEnd: markupEnd + tag.length * 2 + 5,
  };
}

export function removeInlineMarkup(value = '', selectionStart = 0, selectionEnd = 0, action = 'italic') {
  const text = String(value || '');
  const { start, end } = normalizeRange(text, selectionStart, selectionEnd);

  if (start === end) {
    return { value: text, selectionStart: start, selectionEnd: end };
  }

  const selected = text.slice(start, end);
  const cleaned = selected.replace(SUPPORTED_TAG_PATTERN, '');
  if (cleaned !== selected) {
    const next = `${text.slice(0, start)}${cleaned}${text.slice(end)}`;
    return {
      value: next,
      selectionStart: start,
      selectionEnd: start + cleaned.length,
    };
  }

  return { value: text, selectionStart: start, selectionEnd: end };
}

export function applyItalicMarkup(value = '', selectionStart = 0, selectionEnd = 0) {
  return applyInlineMarkup(value, selectionStart, selectionEnd, 'italic');
}

export function removeItalicMarkup(value = '', selectionStart = 0, selectionEnd = 0) {
  return removeInlineMarkup(value, selectionStart, selectionEnd, 'italic');
}
