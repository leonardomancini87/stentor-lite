import { useLayoutEffect, useRef, useState } from 'react';
import InlineFormattedText from './InlineFormattedText.jsx';
import { getCueTypography } from '../utils/cueTextStyle.js';
import { FONT_FAMILY_OPTIONS } from '../utils/screenSettings.js';
import { clampSecondScale } from '../utils/stageLayout.js';

// Tela virtuale dello schermo pubblico (vedi StageSubtitle / public-stage.html).
const DESIGN_WIDTH = 2360;
// Dimensione di lettura nelle anteprime della regia.
const PREVIEW_FONT = 'clamp(22px, 2.2vw, 38px)';

function parseNumber(value, fallback) {
  const parsed = parseFloat(String(value ?? '').replace(/px|%/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// Anteprima leggibile ma fedele all'impaginazione dello schermo:
// - si va a capo solo dove l'utente ha messo l'a capo (come in proiezione);
// - carattere, colore, peso, corsivo e formattazioni sono quelli della battuta/schermo;
// - la larghezza massima è quella impostata in Schermi, in proporzione al corpo del testo;
// - se una riga non entra nel riquadro, il testo si rimpicciolisce invece di andare a capo.
export default function ScreenPreview({ cue, text, spans = [], secondText = '', secondSpans = [], settings = {}, empty = false, className = '' }) {
  const hostRef = useRef(null);
  const textRef = useRef(null);
  const [fit, setFit] = useState(1);

  const fontPx = parseNumber(settings.publicFontSize, 58);
  const widthPct = Math.min(100, parseNumber(settings.publicMaxWidth, 90));
  const maxWidthEm = (DESIGN_WIDTH * widthPct) / 100 / fontPx;

  useLayoutEffect(() => {
    const host = hostRef.current;
    const node = textRef.current;
    if (!host || !node) return undefined;
    const measure = () => {
      const available = host.clientWidth * 0.92;
      const availableHeight = host.clientHeight * 0.9;
      // Alcuni margini non scalano col corpo del testo: qualche passaggio di aggiustamento.
      let next = 1;
      for (let step = 0; step < 4; step += 1) {
        node.style.setProperty('--fit', String(next));
        const width = node.offsetWidth;
        const height = node.offsetHeight;
        const ratio = Math.min(width ? available / width : 1, height ? availableHeight / height : 1);
        if (ratio >= 0.995 && (step > 0 || ratio >= 1)) break;
        next = Math.min(1, next * ratio);
      }
      node.style.setProperty('--fit', String(next));
      setFit(next);
    };
    measure();
    // I caratteri web possono arrivare dopo il primo disegno: rimisura quando sono pronti.
    let alive = true;
    document.fonts?.ready?.then(() => { if (alive) measure(); });
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => { alive = false; observer.disconnect(); };
  }, [text, spans, secondText, settings.publicSecondScale, fontPx, widthPct, settings.publicFontFamily, cue?.renderStyle, cue?.textStyle?.bold]);

  const typography = cue ? getCueTypography(cue) : {};
  return (
    <div
      ref={hostRef}
      className={`liteScreenPreview ${className}`.trim()}
      style={{ background: settings.publicBackground || '#000000' }}
    >
      {empty || !cue ? null : (
        <div
          ref={textRef}
          className="liteScreenPreviewText"
          data-no-translate=""
          style={{
            '--fit': fit,
            fontSize: `calc(${PREVIEW_FONT} * var(--fit, 1))`,
            maxWidth: `${maxWidthEm}em`,
            color: settings.publicTextColor || '#F3E7B3',
            fontFamily: settings.publicFontFamily || FONT_FAMILY_OPTIONS[0].value,
            ...typography,
            textAlign: 'center',
          }}
        >
          <InlineFormattedText text={text} spans={spans} />
          {secondText ? (
            // Seconda lingua: breve trattino, poi il testo più piccolo (come in sala, vedi stageLayout.js).
            <>
              <span className="liteScreenPreviewSeparator" aria-hidden="true" />
              <span className="liteScreenPreviewSecond" style={{ fontSize: `${clampSecondScale(settings.publicSecondScale)}%` }}>
                <InlineFormattedText text={secondText} spans={secondSpans} />
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
