import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { segmentTextLines } from '../utils/inlineStyleSpans.js';
import { fitStageShiftX, layoutStageText } from '../utils/stageLayout.js';

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

function parseOffset(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(-100, Math.min(100, parsed)) : 0;
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
  offsetX = 0,
  offsetY = 0,
  style,
  spans = [],
  className = '',
  fadeInMs = 120,
  // Durata di ogni fase del passaggio tra battute (vedi StageTransition); senza, vale fadeInMs.
  transitionMs,
  // Seconda lingua: sotto la prima, più piccola, dopo un breve trattino (vedi stageLayout.js).
  secondText = '',
  secondSpans = [],
  secondScale,
}) {
  const clipId = useId().replace(/:/g, '');
  const groupRef = useRef(null);
  // Correzione orizzontale perché una riga lunga, spostata di lato, non esca dallo schermo.
  const [fitX, setFitX] = useState(0);
  const lines = String(text || '').split(/\r?\n/);
  const styledLines = segmentTextLines(String(text || ''), spans);
  const secondLines = secondText ? String(secondText).split(/\r?\n/) : [];
  const secondStyledLines = secondText ? segmentTextLines(String(secondText), secondSpans) : [];
  const fontPx = parsePixels(fontSize, 58);
  const widthPercent = parsePercent(maxWidth || style?.maxWidth, 90);
  const clipWidth = DESIGN_WIDTH * (widthPercent / 100);
  const shiftX = (parseOffset(offsetX) / 100) * DESIGN_WIDTH;
  const clipX = (DESIGN_WIDTH - clipWidth) / 2 + shiftX;
  const centerY = getCenterY(verticalAlign, paddingTop) + (parseOffset(offsetY) / 100) * DESIGN_HEIGHT;
  const layout = layoutStageText({
    lineCount: lines.length,
    secondLineCount: secondLines.length,
    fontPx,
    secondScale,
    centerY,
    verticalAlign,
  });
  const fill = style?.color || '#F3E7B3';
  const fontFamily = style?.fontFamily || 'Helvetica, Arial, sans-serif';
  const fontStyle = style?.fontStyle || 'normal';
  const fontWeight = style?.fontWeight ?? 800;
  const alignment = ['left', 'right'].includes(style?.textAlign) ? style.textAlign : 'center';
  const anchor = alignment === 'left' ? 'start' : alignment === 'right' ? 'end' : 'middle';
  const textX = alignment === 'left' ? clipX : alignment === 'right' ? clipX + clipWidth : DESIGN_WIDTH / 2 + shiftX;

  // Si misura la riga più larga dopo ogni disegno (e quando arrivano i caratteri web).
  useLayoutEffect(() => {
    const measure = () => {
      const group = groupRef.current;
      if (!group) return;
      const widths = [...group.querySelectorAll('text')].map((node) => node.getComputedTextLength());
      const next = Math.round(fitStageShiftX({
        centerX: DESIGN_WIDTH / 2 + shiftX,
        lineWidth: Math.max(0, ...widths),
        clipWidth,
        stageWidth: DESIGN_WIDTH,
      }));
      setFitX((current) => (current === next ? current : next));
    };
    measure();
    document.fonts?.addEventListener?.('loadingdone', measure);
    return () => document.fonts?.removeEventListener?.('loadingdone', measure);
  });

  function renderLine(line, segmentsForLine, y, linePx, key) {
    const segments = segmentsForLine || [{ text: line || '\u00A0' }];
    return (
      <text
        key={key}
        className="stageSubtitleLine"
        x={textX}
        y={y}
        textAnchor={anchor}
        dominantBaseline="middle"
        fill={fill}
        fontFamily={fontFamily}
        fontSize={linePx}
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
            fontSize={Number.isFinite(Number(segment.fontScale)) ? linePx * Number(segment.fontScale) : undefined}
          >
            {segment.text || '\u00A0'}
          </tspan>
        ))}
      </text>
    );
  }

  return (
    <svg
      className={`stageSubtitle stageSubtitleSvg ${className}`.trim()}
      style={{
        '--stentore-fade-in-ms': `${Math.max(0, Number.parseInt(fadeInMs, 10) || 0)}ms`,
        '--stage-fx-ms': `${Math.max(0, Number.parseInt(transitionMs ?? fadeInMs, 10) || 0)}ms`,
        '--stage-fx-shift': `${Math.round(fontPx * 0.45)}px`,
      }}
      viewBox={`0 0 ${DESIGN_WIDTH} ${DESIGN_HEIGHT}`}
      aria-label={[text, secondText].filter(Boolean).join('\n')}
      role="img"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={clipX} y={-DESIGN_HEIGHT} width={clipWidth} height={DESIGN_HEIGHT * 3} />
        </clipPath>
      </defs>

      <g ref={groupRef} clipPath={`url(#${clipId})`} transform={fitX ? `translate(${fitX} 0)` : undefined}>
        {lines.map((line, index) => renderLine(line, styledLines[index], layout.primaryY[index], fontPx, `p${index}`))}
        {layout.separator && (
          <line
            className="stageSubtitleSeparator"
            x1={textX - layout.separator.width / 2}
            x2={textX + layout.separator.width / 2}
            y1={layout.separator.y}
            y2={layout.separator.y}
            stroke={fill}
            strokeOpacity={0.6}
            strokeWidth={layout.separator.thickness}
            strokeLinecap="round"
          />
        )}
        {layout.separator && secondLines.map((line, index) => renderLine(line, secondStyledLines[index], layout.secondY[index], layout.secondFontPx, `s${index}`))}
      </g>
    </svg>
  );
}
