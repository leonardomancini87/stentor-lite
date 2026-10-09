import common from './common.js';
import map from './map.js';
import time from './time.js';
import tools from './tools.js';
import shortcuts from './shortcuts.js';
import cues from './cues.js';
import languages from './languages.js';
import sidebar from './sidebar.js';
import projects from './projects.js';
import screens from './screens.js';
import settings from './settings.js';
import feedback from './feedback.js';
import menu from './menu.js';
// Lingue aggiunte dopo italiano e inglese: un file unico per lingua, più comodo da far rivedere.
import ml from './ml.js';
import hi from './hi.js';
import fr from './fr.js';
import de from './de.js';
import es from './es.js';
import pt from './pt.js';
import zh from './zh.js';
import zhHant from './zh-Hant.js';
import ar from './ar.js';
import sv from './sv.js';
import da from './da.js';
import no from './no.js';
import fi from './fi.js';
import pl from './pl.js';
import cs from './cs.js';
import ru from './ru.js';
import uk from './uk.js';
import sk from './sk.js';
import hr from './hr.js';
import sr from './sr.js';
import bg from './bg.js';
import el from './el.js';
import tr from './tr.js';

// Ogni file raccoglie un'area dell'interfaccia con le lingue affiancate.
export const AREAS = { common, map, time, tools, shortcuts, cues, languages, sidebar, projects, screens, settings, feedback, menu };

export const LANGUAGE_FILES = { fr, de, es, pt, zh, 'zh-Hant': zhHant, ar, hi, ml, sv, da, no, fi, pl, cs, ru, uk, sk, hr, sr, bg, el, tr };

export function collect(language) {
  if (LANGUAGE_FILES[language]) return { ...LANGUAGE_FILES[language] };
  return Object.assign({}, ...Object.values(AREAS).map((area) => area[language] || {}));
}
