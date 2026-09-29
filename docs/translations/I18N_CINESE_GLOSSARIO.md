# Sténtor Lite — Cinese semplificato e tradizionale: note per la revisione

Prime versioni complete, da far rileggere a madrelingua (una persona per ciascuna variante, se possibile).

## Dove sono i testi
- `src/i18n/locales/zh.js` — cinese semplificato (Cina continentale).
- `src/i18n/locales/zh-Hant.js` — cinese tradizionale con **lessico di Taiwan** (專案, 螢幕, 儲存, 匯入…).
  Per Hong Kong alcune parole andrebbero cambiate (per esempio 螢幕 → 熒幕, 專案 → 項目).
- `src/utils/voiceMessages.zh.js` — voci/personaggi e riepilogo dell'importazione da Word (tutte e due le varianti).
- `I18N_CINESE_REVISIONE.csv` — italiano, inglese, semplificato e tradizionale affiancati.

Stesse regole delle altre lingue: segnaposto (`{count}`, `{title}`…), `<b>…</b>` e `<icon/>` invariati; `npm test` controlla.

## Scelte di terminologia
| Italiano | 简体中文 | 繁體中文 | Nota |
|---|---|---|---|
| sopratitolo / battuta | 字幕 / 字幕条（条） | 字幕 / 則 | Una "battuta" è "una 条/則 di sottotitolo". |
| Avanti / Indietro | 下一条 / 上一条 | 下一則 / 上一則 | |
| buio | 黑场 | 暗場 | Termini di palcoscenico delle due aree. |
| voce (chi parla) | 角色 | 角色 | Prima era 声部 (voce musicale): cambiato in "personaggio". |
| atto / scena / quadro / intervallo | 幕 / 场 / 景 / 幕间休息 | 幕 / 場 / 景 / 中場休息 | |
| marcatore | 标记 | 標記 | |
| Mappa | 结构 | 結構 | |
| Tempi | 计时 | 計時 | |
| Scorciatoie | 快捷键 | 快速鍵 | |
| Progetti / Schermi / Impostazioni | 项目 / 屏幕 / 设置 | 專案 / 螢幕 / 設定 | |
| audiodescrizione | 口述影像 | 口述影像 | |
