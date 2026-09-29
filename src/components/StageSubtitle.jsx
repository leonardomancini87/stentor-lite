import React, { useId } from 'react';
import { segmentTextLines } from '../utils/inlineStyleSpans.js';

const DESIGN_WIDTH = 2360;
const DESIGN_HEIGHT = 800;

function parsePixels(value, fallback = 58) {
  const parsed = parseFloat(String(value || '').replace('px', ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePercent(value, fallback = 90) {
  const parsed = parseFloat(String(value || '').replace('%', ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.max(1, Math.min(100, parsed)) : fallback;
}

function parseVh(value, fallback = 0) {
  const parsed = parseFloat(String(value || '').replace('vh', ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCenterY(verticalAlign, paddingTop) {
  const offset = (parseVh(paddingTop, 0) / 100) * DESIGN_HEIGHT;
  if (verticalAlign === 'top') return DESIGN_HEIGHT * 0.26 + offset;
  if (verticalAlign === 'bottom') return DESIGN_HEIGHT * 0.74 + offset;
  return DESIGN_HEIGHT * 0.5 + offset;
}

export default function StageSubtitle({
  text,
  fontSize,
  maxWidth,
  verticalAlign = 'center',
  paddingTop = '0vh',
  style,
  spans = [],
  className = '',
  fadeInMs = 120,
}) {
  const clipId = useId().replace(/:/g, '');
  const lines = String(text || '').split(/\r?\n/);
  const styledLines = segmentTextLines(String(text || ''), spans);
  const fontPx = parsePixels(fontSize, 58);
  const widthPercent = parsePercent(maxWidth || style?.maxWidth, 90);
  const clipWidth = DESIGN_WIDTH * (widthPercent / 100);
  const clipX = (DESIGN_WIDTH - clipWidth) / 2;
  const lineHeight = fontPx * 1.12;
  const centerY = getCenterY(verticalAlign, paddingTop);
  const fill = style?.color || '#F3E7B3';
  const fontFamily = style?.fontFamily || 'Helvetica, Arial, sans-serif';
  const fontStyle = style?.fontStyle || 'normal';
  const fontWeight = style?.fontWeight ?? 800;
  const alignment = ['left', 'right'].includes(style?.textAlign) ? style.textAlign : 'center';
  const anchor = alignment === 'left' ? 'start' : alignment === 'right' ? 'end' : 'middle';
  const textX = alignment === 'left' ? clipX : alignment === 'right' ? clipX + clipWidth : DESIGN_WIDTH / 2;

  return (
    <svg
      className={`stageSubtitle stageSubtitleSvg ${className}`.trim()}
      style={{ '--stentore-fade-in-ms': `${Math.max(0, Number.parseInt(fadeInMs, 10) || 0)}ms` }}
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      aria-label={String(text || '')}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={clipX} y="0" width={clipWidth} height={DESIGN_HEIGHT} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {lines.map((line, index) => {
          const y = centerY + (index - (lines.length - 1) / 2) * lineHeight;
          const segments = styledLines[index] || [{ text: line || '\u00A0' }];

          return (
            <text
              key={index}
              className="stageSubtitleLine"
              x={textX}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill={fill}
              fontFamily={fontFamily}
              fontSize={fontPx}
              fontStyle={fontStyle}
              fontWeight={fontWeight}
              letterSpacing="0.005em"
            >
              {segments.map((segment, segmentIndex) => (
                <tspan
                  key={`${segmentIndex}-${segment.text.slice(0, 8)}`}
                  fontStyle={segment.italic === true ? 'italic' : segment.italic === false ? 'normal' : fontStyle}
                  fontWeight={segment.bold === true ? 800 : segment.bold === false ? 400 : fontWeight}
                  textDecoration={segment.underline === true ? 'underline' : segment.underline === false ? 'none' : undefined}
                  fill={segment.color || undefined}
                  fontSize={Number.isFinite(Number(segment.fontScale)) ? fontPx * Number(segment.fontScale) : undefined}
                >
                  {segment.text || '\u00A0'}
                </tspan>
              ))}
            </text>
          );
        })}
      </g>
    </svg>
  );
}
