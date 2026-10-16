// Nuovo progetto creato importando un file esterno (tabella, presentazione, sottotitoli, testo,
// copione Word). Il progetto importato è uno spettacolo nuovo: dal progetto aperto prima
// dell'importazione si tengono solo le impostazioni di visualizzazione e proiezione (schermi,
// caratteri, colori…). Titolo, autore, compagnia, copertina, repliche, archiviazione, lingue,
// cartelli e battute non passano mai da un progetto all'altro.

import { normalizeProject } from './projectSchema.js';

// Impostazioni del progetto che descrivono lo spettacolo e non il modo di proiettarlo.
const SHOW_SETTINGS = ['cards'];

function importedSettings(baseSettings, languageCodes) {
  if (!baseSettings || typeof baseSettings !== 'object') return {};
  const settings = { ...baseSettings };
  for (const key of SHOW_SETTINGS) delete settings[key];
  // Uno schermo che mostrava una lingua del progetto precedente torna alla lingua di lavoro.
  if (Array.isArray(settings.screens)) {
    settings.screens = settings.screens.map((screen) => {
      if (!screen || typeof screen !== 'object') return screen;
      const next = { ...screen };
      if (next.publicLanguage && next.publicLanguage !== 'active' && !languageCodes.includes(next.publicLanguage)) {
        next.publicLanguage = 'active';
      }
      if (next.publicSecondLanguage && !languageCodes.includes(next.publicSecondLanguage)) {
        next.publicSecondLanguage = '';
      }
      return next;
    });
  }
  return settings;
}

// languages: [{ code, name? }] nell'ordine del file; la prima è la lingua principale.
// Il nome di una lingua senza nome nel file si prende dal progetto aperto, se la conosce.
export function buildImportedProject(baseProject = {}, { cues, languages, title }) {
  const codes = languages.map((item) => item.code);
  const baseNames = baseProject?.languageNames || {};
  const languageNames = {};
  for (const { code, name } of languages) {
    languageNames[code] = name || baseNames[code] || code.toUpperCase();
  }
  return normalizeProject({
    id: `project-${Date.now()}`,
    title: title || '',
    company: '',
    author: '',
    coverImage: '',
    coverImageName: '',
    languages: codes,
    activeLanguage: codes[0],
    primaryLanguage: codes[0],
    languageNames,
    settings: importedSettings(baseProject?.settings, codes),
    cues,
    performances: [],
    archived: false,
    archivedAt: null,
    savedAt: null,
  });
}
