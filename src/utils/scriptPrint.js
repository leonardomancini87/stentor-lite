import { getMarkerTitle, isMarkerCue } from './markers.js';
import { getCueText } from './cueTextStyle.js';
import { stripInlineFormatting } from './inlineFormatting.js';
import { formatCueNumber, getCueNumbers } from './showMap.js';

// Copione da stampare: un documento HTML che sta in piedi da solo (nessun file esterno), con
// numero, voce, testo e nota operatore di ogni battuta e i segnalibri come titoli di sezione.
// Aperto nel browser si stampa o si salva in PDF con il pulsante in alto o con Cmd/Ctrl+P.

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function multiline(value) {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur']);

// labels: { voice, text, note, print, cues, language } già tradotte; `languageName` è il nome della
// lingua stampata, `date` la data già formattata.
export function buildScriptHtml(project, { language, languageName = language, labels = {}, date = '' } = {}) {
  const cues = Array.isArray(project?.cues) ? project.cues : [];
  const numbers = getCueNumbers(cues);
  const title = String(project?.title || '').trim();
  const company = String(project?.company || project?.companyName || '').trim();
  const dir = RTL_LANGUAGES.has(String(language || '').split('-')[0]) ? 'rtl' : 'ltr';
  const hasNotes = cues.some((cue) => !isMarkerCue(cue) && String(cue?.note || '').trim());

  const rows = cues.map((cue, index) => {
    if (isMarkerCue(cue)) {
      return `<tr class="section"><td colspan="${hasNotes ? 4 : 3}">${escapeHtml(getMarkerTitle(cue))}</td></tr>`;
    }
    const text = stripInlineFormatting(getCueText(cue, language));
    return [
      '<tr>',
      `<td class="n">${formatCueNumber(numbers[index])}</td>`,
      `<td class="voice">${escapeHtml(cue?.speaker || '')}</td>`,
      `<td class="text" dir="${dir}">${multiline(text)}</td>`,
      hasNotes ? `<td class="note">${multiline(cue?.note || '')}</td>` : '',
      '</tr>',
    ].join('');
  }).join('\n');

  const meta = [company, languageName, labels.cues, date].filter(Boolean).map(escapeHtml).join(' · ');

  return `<!doctype html>
<html lang="${escapeHtml(language || 'it')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 11pt/1.4 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; background: #fff; }
  header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  h1 { margin: 0 0 2px; font-size: 18pt; line-height: 1.2; }
  header p { margin: 0; font-size: 9.5pt; color: #555; }
  button { font: inherit; font-size: 10pt; padding: 7px 14px; border-radius: 8px; border: 1px solid #3d5c7d; background: #3d5c7d; color: #fff; cursor: pointer; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: start; font-size: 8pt; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: #666; padding: 0 8px 5px; border-bottom: 1.5px solid #111; }
  td { vertical-align: top; padding: 6px 8px; border-bottom: 1px solid #ddd; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  td.n { width: 3.2em; font-variant-numeric: tabular-nums; color: #666; white-space: nowrap; }
  td.voice { width: 16%; font-size: 9.5pt; font-weight: 600; text-transform: uppercase; }
  td.text { font-size: 11.5pt; }
  td.note { width: 26%; font-size: 9.5pt; font-style: italic; color: #444; }
  tr.section td { padding-top: 16px; font-size: 10pt; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; border-bottom: 1.5px solid #111; break-after: avoid; page-break-after: avoid; }
  @media print { body { padding: 0; } button { display: none; } }
</style>
</head>
<body>
<header>
  <div><h1>${escapeHtml(title)}</h1><p>${meta}</p></div>
  <button type="button" onclick="window.print()">${escapeHtml(labels.print || 'PDF')}</button>
</header>
<table>
<thead><tr><th>#</th><th>${escapeHtml(labels.voice || '')}</th><th>${escapeHtml(labels.text || '')}</th>${hasNotes ? `<th>${escapeHtml(labels.note || '')}</th>` : ''}</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>
`;
}

export function getScriptDownloadName(project, fallback = 'copione') {
  const base = String(project?.title || fallback).trim().replace(/[^\p{L}\p{N}_.-]+/gu, '-').replace(/^-+|-+$/g, '') || fallback;
  return `${base}-copione.html`;
}
