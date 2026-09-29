import { Plus } from 'lucide-react';

import { getLanguageCompletion, getLanguageName } from '../utils/projectLanguages.js';
import { useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

const MAX_BUTTONS = 4;

// Selettore della lingua di lavoro (elenco, Attuale, Prossima e modifica).
// Il "+" apre la finestra Lingue del progetto.
export default function LanguageSwitcher({ project, language, onChange, onManage }) {
  const languages = project.languages || [];
  const useSelect = languages.length > MAX_BUTTONS;
  const { t } = useI18n();

  function tooltip(code) {
    const { filled, total } = getLanguageCompletion(project, code);
    return t('languages.progress', { language: getLanguageName(project, code), filled, total });
  }

  return (
    <div className="liteLanguageSwitcher" role="group" aria-label={t('languages.aria')} data-no-translate="">
      {useSelect ? (
        <select
          value={language}
          onChange={(event) => onChange(event.target.value)}
          aria-label={t('languages.aria')}
          title={tooltip(language)}
        >
          {languages.map((code) => (
            <option key={code} value={code}>{code.toUpperCase()} · {getLanguageName(project, code)}</option>
          ))}
        </select>
      ) : (
        languages.map((code) => (
          <button
            key={code}
            type="button"
            className={classNames('liteLanguageOption', code === language && 'active')}
            aria-pressed={code === language}
            onClick={() => onChange(code)}
            title={tooltip(code)}
          >
            {code.toUpperCase()}
          </button>
        ))
      )}
      <button
        type="button"
        className="liteLanguageManage"
        onClick={onManage}
        title={t('languages.manage.title')}
        aria-label={t('languages.manage.aria')}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
