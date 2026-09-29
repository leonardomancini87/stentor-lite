import { parseInlineFormatting } from '../utils/inlineFormatting.js';
import { segmentTextBySpans } from '../utils/inlineStyleSpans.js';

function legacySegmentClassName(segment) {
  return [
    segment.italic ? 'inlineItalic' : '',
    segment.bold ? 'inlineBold' : '',
    segment.underline ? 'inlineUnderline' : '',
    segment.strike ? 'inlineStrike' : '',
    segment.subscript ? 'inlineSubscript' : '',
    segment.superscript ? 'inlineSuperscript' : '',
  ].filter(Boolean).join(' ') || undefined;
}

function localSegmentStyle(segment) {
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

export default function InlineFormattedText({ text, spans = [] }) {
  if (Array.isArray(spans) && spans.length) {
    return segmentTextBySpans(text, spans).map((segment) => (
      <span key={`${segment.start}-${segment.end}`} style={localSegmentStyle(segment)}>
        {segment.text}
      </span>
    ));
  }

  // Backward compatibility only for old projects that already contain legacy inline tags.
  return parseInlineFormatting(text).map((segment, index) => (
    <span key={`${index}-${segment.text.slice(0, 8)}`} className={legacySegmentClassName(segment)}>
      {segment.text}
    </span>
  ));
}
