const STYLE_KEYS = ['bold', 'italic', 'underline', 'color', 'fontScale'];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sanitizeStyle(source = {}) {
  const style = {};
  if (typeof source.bold === 'boolean') style.bold = source.bold;
  if (typeof source.italic === 'boolean') style.italic = source.italic;
  if (typeof source.underline === 'boolean') style.underline = source.underline;
  if (typeof source.color === 'string' && /^#[0-9a-f]{6}$/i.test(source.color.trim())) {
    style.color = source.color.trim().toUpperCase();
  }
  if (Number.isFinite(Number(source.fontScale))) {
    style.fontScale = clamp(Number(source.fontScale), 0.8, 1.3);
  }
  return style;
}

function styleSignature(style = {}) {
  return STYLE_KEYS.map((key) => Object.prototype.hasOwnProperty.call(style, key) ? `${key}:${String(style[key])}` : '').join('|');
}

function hasStyle(style = {}) {
  return STYLE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(style, key));
}

function mergeAdjacent(spans) {
  const merged = [];
  spans.forEach((span) => {
    if (span.end <= span.start || !hasStyle(span)) return;
    const previous = merged[merged.length - 1];
    if (previous && previous.end === span.start && styleSignature(previous) === styleSignature(span)) {
      previous.end = span.end;
    } else {
      merged.push({ ...span });
    }
  });
  return merged;
}

export function normalizeTextSpans(spans = [], textLength = Number.MAX_SAFE_INTEGER) {
  const safeLength = Math.max(0, Number.isFinite(Number(textLength)) ? Number(textLength) : Number.MAX_SAFE_INTEGER);
  const cleaned = (Array.isArray(spans) ? spans : [])
    .map((raw, order) => {
      const start = clamp(Math.trunc(Number(raw?.start) || 0), 0, safeLength);
      const end = clamp(Math.trunc(Number(raw?.end) || 0), start, safeLength);
      return { start, end, order, ...sanitizeStyle(raw) };
    })
    .filter((span) => span.end > span.start && hasStyle(span));

  if (!cleaned.length) return [];
  const boundaries = [...new Set(cleaned.flatMap((span) => [span.start, span.end]))].sort((a, b) => a - b);
  const canonical = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const end = boundaries[index + 1];
    if (end <= start) continue;
    const style = {};
    cleaned
      .filter((span) => span.start <= start && span.end >= end)
      .sort((a, b) => a.order - b.order)
      .forEach((span) => {
        STYLE_KEYS.forEach((key) => {
          if (Object.prototype.hasOwnProperty.call(span, key)) style[key] = span[key];
        });
      });
    if (hasStyle(style)) canonical.push({ start, end, ...style });
  }
  return mergeAdjacent(canonical);
}

export function normalizeCueTextSpans(textSpans, translations = {}) {
  const source = textSpans && typeof textSpans === 'object' ? textSpans : {};
  const languages = new Set([...Object.keys(source), ...Object.keys(translations || {})]);
  const result = {};
  languages.forEach((language) => {
    const length = String(translations?.[language] ?? '').length;
    const normalized = normalizeTextSpans(source[language], length);
    if (normalized.length) result[language] = normalized;
  });
  return result;
}

export function getCueTextSpans(cue, language) {
  const text = String(cue?.translations?.[language] ?? cue?.original ?? '');
  return normalizeTextSpans(cue?.textSpans?.[language], text.length);
}

function styleAt(spans, position) {
  const found = spans.find((span) => span.start <= position && span.end > position);
  if (!found) return {};
  const style = {};
  STYLE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(found, key)) style[key] = found[key];
  });
  return style;
}

function rangeSegments(spans, start, end, textLength) {
  const safeStart = clamp(Math.trunc(Number(start) || 0), 0, textLength);
  const safeEnd = clamp(Math.trunc(Number(end) || 0), safeStart, textLength);
  if (safeEnd <= safeStart) return [];
  const canonical = normalizeTextSpans(spans, textLength);
  const boundaries = [...new Set([
    safeStart,
    safeEnd,
    ...canonical.flatMap((span) => [span.start, span.end]).filter((value) => value > safeStart && value < safeEnd),
  ])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((segmentStart, index) => ({
    start: segmentStart,
    end: boundaries[index + 1],
    style: styleAt(canonical, segmentStart),
  }));
}

export function getRangePropertyState(spans, start, end, property, baseValue, textLength) {
  const segments = rangeSegments(spans, start, end, textLength);
  if (!segments.length) return 'off';
  const values = segments.map(({ style }) => Object.prototype.hasOwnProperty.call(style, property) ? style[property] : baseValue);
  if (values.every((value) => value === true)) return 'on';
  if (values.every((value) => value === false)) return 'off';
  return 'mixed';
}

export function getRangeValue(spans, start, end, property, baseValue, textLength) {
  const segments = rangeSegments(spans, start, end, textLength);
  if (!segments.length) return baseValue;
  const values = segments.map(({ style }) => Object.prototype.hasOwnProperty.call(style, property) ? style[property] : baseValue);
  return values.every((value) => value === values[0]) ? values[0] : null;
}

export function applyStylePatchToRange(spans, start, end, patch = {}, textLength = 0) {
  const safeStart = clamp(Math.trunc(Number(start) || 0), 0, textLength);
  const safeEnd = clamp(Math.trunc(Number(end) || 0), safeStart, textLength);
  if (safeEnd <= safeStart) return normalizeTextSpans(spans, textLength);
  const canonical = normalizeTextSpans(spans, textLength);
  const boundaries = [...new Set([0, textLength, safeStart, safeEnd, ...canonical.flatMap((span) => [span.start, span.end])])]
    .filter((value) => value >= 0 && value <= textLength)
    .sort((a, b) => a - b);
  const result = [];
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const segmentStart = boundaries[index];
    const segmentEnd = boundaries[index + 1];
    if (segmentEnd <= segmentStart) continue;
    const style = styleAt(canonical, segmentStart);
    if (segmentStart >= safeStart && segmentEnd <= safeEnd) {
      STYLE_KEYS.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
        const value = patch[key];
        if (value === null || typeof value === 'undefined') delete style[key];
        else Object.assign(style, sanitizeStyle({ [key]: value }));
      });
    }
    if (hasStyle(style)) result.push({ start: segmentStart, end: segmentEnd, ...style });
  }
  return mergeAdjacent(result);
}

export function clearStyleRange(spans, start, end, textLength) {
  return applyStylePatchToRange(spans, start, end, Object.fromEntries(STYLE_KEYS.map((key) => [key, null])), textLength);
}

function commonPrefixLength(first, second) {
  const max = Math.min(first.length, second.length);
  let index = 0;
  while (index < max && first[index] === second[index]) index += 1;
  return index;
}

function commonSuffixLength(first, second, prefixLength) {
  const max = Math.min(first.length, second.length) - prefixLength;
  let count = 0;
  while (count < max && first[first.length - 1 - count] === second[second.length - 1 - count]) count += 1;
  return count;
}

export function transformSpansForTextEdit(spans, oldText = '', newText = '') {
  const before = String(oldText ?? '');
  const after = String(newText ?? '');
  if (before === after) return normalizeTextSpans(spans, after.length);
  const canonical = normalizeTextSpans(spans, before.length);
  const start = commonPrefixLength(before, after);
  const suffix = commonSuffixLength(before, after, start);
  const oldEnd = before.length - suffix;
  const newEnd = after.length - suffix;
  const delta = newEnd - oldEnd;
  const inherited = styleAt(canonical, start < before.length ? start : Math.max(0, start - 1));
  const result = [];

  canonical.forEach((span) => {
    if (span.end <= start) {
      result.push({ ...span });
      return;
    }
    if (span.start >= oldEnd) {
      result.push({ ...span, start: span.start + delta, end: span.end + delta });
      return;
    }
    if (span.start < start) result.push({ ...span, end: start });
    if (span.end > oldEnd) result.push({ ...span, start: newEnd, end: span.end + delta });
  });

  if (newEnd > start && hasStyle(inherited)) result.push({ start, end: newEnd, ...inherited });
  return normalizeTextSpans(result, after.length);
}

function trimRange(text, absoluteStart = 0) {
  const value = String(text ?? '');
  const leading = value.length - value.trimStart().length;
  const trailing = value.length - value.trimEnd().length;
  const start = absoluteStart + leading;
  const end = absoluteStart + value.length - trailing;
  return { text: value.trim(), start, end: Math.max(start, end) };
}

export function clipAndShiftSpans(spans, keepStart, keepEnd, shift, sourceLength) {
  return normalizeTextSpans(spans, sourceLength)
    .map((span) => {
      const start = Math.max(span.start, keepStart);
      const end = Math.min(span.end, keepEnd);
      if (end <= start) return null;
      return { ...span, start: start + shift, end: end + shift };
    })
    .filter(Boolean);
}

export function splitTextAndSpans(text = '', spans = [], cursor = 0) {
  const value = String(text ?? '');
  const safeCursor = clamp(Math.trunc(Number(cursor) || 0), 0, value.length);
  const firstRange = trimRange(value.slice(0, safeCursor), 0);
  const secondRange = trimRange(value.slice(safeCursor), safeCursor);
  return {
    firstText: firstRange.text,
    secondText: secondRange.text,
    firstSpans: normalizeTextSpans(clipAndShiftSpans(spans, firstRange.start, firstRange.end, -firstRange.start, value.length), firstRange.text.length),
    secondSpans: normalizeTextSpans(clipAndShiftSpans(spans, secondRange.start, secondRange.end, -secondRange.start, value.length), secondRange.text.length),
  };
}

export function mergeTextAndSpans(firstText = '', firstSpans = [], secondText = '', secondSpans = [], separator = ' ') {
  const leftRaw = String(firstText ?? '');
  const rightRaw = String(secondText ?? '');
  const left = trimRange(leftRaw, 0);
  const right = trimRange(rightRaw, 0);
  if (!left.text) {
    return {
      text: right.text,
      spans: normalizeTextSpans(clipAndShiftSpans(secondSpans, right.start, right.end, -right.start, rightRaw.length), right.text.length),
    };
  }
  if (!right.text) {
    return {
      text: left.text,
      spans: normalizeTextSpans(clipAndShiftSpans(firstSpans, left.start, left.end, -left.start, leftRaw.length), left.text.length),
    };
  }
  const joiner = String(separator ?? ' ');
  const text = `${left.text}${joiner}${right.text}`;
  const leftNormalized = clipAndShiftSpans(firstSpans, left.start, left.end, -left.start, leftRaw.length);
  const rightShift = left.text.length + joiner.length - right.start;
  const rightNormalized = clipAndShiftSpans(secondSpans, right.start, right.end, rightShift, rightRaw.length);
  return { text, spans: normalizeTextSpans([...leftNormalized, ...rightNormalized], text.length) };
}

export function segmentTextBySpans(text = '', spans = []) {
  const value = String(text ?? '');
  if (!value.length) return [{ text: '', start: 0, end: 0 }];
  const canonical = normalizeTextSpans(spans, value.length);
  const boundaries = [...new Set([0, value.length, ...canonical.flatMap((span) => [span.start, span.end])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    return { text: value.slice(start, end), start, end, ...styleAt(canonical, start) };
  }).filter((segment) => segment.end > segment.start);
}

export function segmentTextLines(text = '', spans = []) {
  const value = String(text ?? '');
  const lines = [];
  let lineStart = 0;
  value.split(/\r?\n/).forEach((line) => {
    const lineEnd = lineStart + line.length;
    const lineSpans = clipAndShiftSpans(spans, lineStart, lineEnd, -lineStart, value.length);
    lines.push(segmentTextBySpans(line || '\u00A0', lineSpans));
    lineStart = lineEnd + 1;
  });
  return lines.length ? lines : [[{ text: '\u00A0', start: 0, end: 1 }]];
}
