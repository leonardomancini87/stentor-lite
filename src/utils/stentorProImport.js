// Apertura dei file .stn di Sténtor Pro in Sténtor Lite.
// Si leggono solo battute, lingue, personaggi, note, marcatori (atti/scene) e "neri";
// tutto il resto viene ignorato e contato nel riepilogo dell'importazione.

const LEGACY_LANGUAGE_FIELDS = { it: 'italian', en: 'english', fr: 'french' };

export function isStentorProProject(value) {
  return Boolean(
    value && typeof value === 'object' && !Array.isArray(value.cues)
      && Array.isArray(value.lines)
      && (Array.isArray(value.projectLanguages) || typeof value.primaryLanguageCode === 'string' || Array.isArray(value.languages))
  );
}

function localized(value) {
  if (!value || typeof value !== 'object') return {};
  const source = value.values && typeof value.values === 'object' ? value.values : value;
  return Object.fromEntries(
    Object.entries(source).filter(([, text]) => typeof text === 'string')
  );
}

function languageList(pro) {
  const fromProject = Array.isArray(pro.projectLanguages)
    ? pro.projectLanguages.filter((lang) => lang && lang.code && lang.isEnabled !== false)
    : [];
  if (fromProject.length) {
    return fromProject.map((lang) => ({ code: String(lang.code), name: String(lang.name || lang.code).trim() || String(lang.code).toUpperCase() }));
  }
  // Progetti Pro più vecchi: solo i campi italian / english / french.
  return Object.entries(LEGACY_LANGUAGE_FIELDS)
    .filter(([, field]) => (pro.lines || []).some((line) => String(line?.[field] || '').trim()))
    .map(([code]) => ({ code, name: { it: 'Italiano', en: 'Inglese', fr: 'Francese' }[code] }));
}

function lineTexts(line, codes) {
  const texts = localized(line.texts);
  for (const [code, field] of Object.entries(LEGACY_LANGUAGE_FIELDS)) {
    if (codes.includes(code) && !String(texts[code] || '').trim() && typeof line[field] === 'string') {
      texts[code] = line[field];
    }
  }
  return Object.fromEntries(codes.map((code) => [code, String(texts[code] || '')]));
}

function markerTypeFromText(text) {
  const lower = String(text || '').trim().toLowerCase();
  if (/^(atto|act)\b/.test(lower)) return 'act';
  if (/^(scena|scene)\b/.test(lower)) return 'scene';
  if (/^quadro\b/.test(lower)) return 'picture';
  if (/^(intervallo|interval|pausa)\b/.test(lower)) return 'interval';
  return 'other';
}

function speakerName(line, characters, primary) {
  const byId = line.characterID ? characters.get(String(line.characterID)) : null;
  const names = localized(line.characterNames);
  return String(names[primary] || byId?.[primary] || byId?.base || line.character || '').trim();
}

export function convertStentorProProject(pro, fileName = '') {
  const languages = languageList(pro);
  const codes = languages.length ? languages.map((lang) => lang.code) : ['it'];
  const primary = codes.includes(pro.primaryLanguageCode) ? pro.primaryLanguageCode : codes[0];

  const characters = new Map(
    (Array.isArray(pro.characters) ? pro.characters : []).map((character) => {
      const names = localized(character.localizedNames);
      return [String(character.id), { ...names, base: character.baseName || '' }];
    })
  );

  const skipped = { audioDescriptions: 0, otherLines: 0 };
  const cues = [];
  const lines = [...pro.lines].sort((a, b) => (Number(a?.number) || 0) - (Number(b?.number) || 0));

  for (const line of lines) {
    if (!line || typeof line !== 'object') continue;
    const type = line.lineType || 'cue';
    const note = String(line.operatorNote || '').trim();
    const id = cues.length + 1;

    if (type === 'marker') {
      const title = String(localized(line.texts)[primary] || line.italian || line.character || 'Marcatore').trim();
      cues.push({
        id, type: 'marker', markerType: markerTypeFromText(title), title,
        speaker: 'MARCATORE', original: '', translations: {}, note,
      });
      continue;
    }

    if (type === 'blackout') {
      cues.push({
        id, speaker: '', original: '',
        translations: Object.fromEntries(codes.map((code) => [code, ''])),
        note: note || 'Nero (da Sténtor Pro)',
      });
      continue;
    }

    if (type === 'ad') { skipped.audioDescriptions += 1; continue; }
    if (type !== 'cue') { skipped.otherLines += 1; continue; }

    const translations = lineTexts(line, codes);
    cues.push({
      id,
      speaker: speakerName(line, characters, primary),
      original: translations[primary] || '',
      translations,
      note,
    });
  }

  const fallbackTitle = String(fileName || '').replace(/\.stn$/i, '').trim();
  return {
    project: {
      id: `stn-${Date.now()}`,
      title: String(pro.title || fallbackTitle || 'Progetto da Sténtor Pro').trim(),
      company: String(pro.subtitle || '').trim(),
      languages: codes,
      activeLanguage: primary,
      primaryLanguage: primary,
      languageNames: Object.fromEntries(languages.map((lang) => [lang.code, lang.name])),
      cues,
      importedFrom: 'stentor-pro',
    },
    summary: { cues: cues.filter((cue) => cue.type !== 'marker').length, markers: cues.filter((cue) => cue.type === 'marker').length, languages: codes, skipped },
  };
}
