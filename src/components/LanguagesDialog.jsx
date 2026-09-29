import { useEffect, useRef, useState } from 'react';
import { Languages, Plus, Star, Trash2, X } from 'lucide-react';

import {
  QUICK_LANGUAGES,
  addProjectLanguage,
  getLanguageCompletion,
  getLanguageName,
  getPrimaryLanguage,
  normalizeLanguageCode,
  removeProjectLanguage,
  renameProjectLanguage,
  setPrimaryProjectLanguage,
} from '../utils/projectLanguages.js';
import { useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function LanguageNameField({ project, code, onRename }) {
  const saved = getLanguageName(project, code);
  const [value, setValue] = useState(saved);
  const { t } = useI18n();
  useEffect(() => setValue(saved), [saved]);
  function commit() {
    if (!value.trim()) { setValue(saved); return; }
    if (value.trim() !== saved) onRename(code, value);
  }
  return (
    <input
      className="languagesDialogName"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); }
        if (event.key === 'Escape') { event.stopPropagation(); setValue(saved); event.currentTarget.blur(); }
      }}
      aria-label={t('langs.name.aria', { code: code.toUpperCase() })}
    />
  );
}

// Finestra "Lingue del progetto": la stessa si apre dal selettore lingua in Sopratitoli
// e da Dettagli progetto. Gestione essenziale delle lingue del progetto.
export default function LanguagesDialog({ project, language, setProject, dialogs, onClose, canUndo = false }) {
  const sectionRef = useRef(null);
  const { t } = useI18n();
  const [customCode, setCustomCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [copyText, setCopyText] = useState(false);
  const languages = project.languages || [];
  const primary = getPrimaryLanguage(project);
  const copySource = language || primary;
  const quickLanguages = QUICK_LANGUAGES.filter((item) => !languages.includes(item.code));

  useEffect(() => {
    sectionRef.current?.querySelector('.languagesDialogClose')?.focus();
  }, []);

  // Se il focus è finito fuori dalla finestra (per esempio dopo una conferma), i tasti
  // non devono arrivare alla regia: Esc chiude, gli altri vengono ignorati.
  useEffect(() => {
    function onKeyDownCapture(event) {
      const section = sectionRef.current;
      const target = event.target;
      if (!section || section.contains(target)) return;
      if (target instanceof Element && target.closest('.stentoreDialog')) return;
      if (document.querySelector('.stentoreDialogOverlay:not(.languagesDialogOverlay)')) return;
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === ' ' || event.key.startsWith('Arrow') || event.key === 'Enter') event.preventDefault();
      section.querySelector('.languagesDialogClose')?.focus();
    }
    window.addEventListener('keydown', onKeyDownCapture, true);
    return () => window.removeEventListener('keydown', onKeyDownCapture, true);
  }, [onClose]);

  function apply(update) {
    setProject((current) => {
      const next = update(current);
      return next || current;
    });
  }

  function add(code, name) {
    const result = addProjectLanguage(project, code, name, { copyFrom: copyText ? copySource : null });
    if (result.error === 'exists') {
      apply((current) => ({ ...current, activeLanguage: result.code }));
      return true;
    }
    if (result.error) return false;
    apply((current) => addProjectLanguage(current, code, name, { copyFrom: copyText ? copySource : null }).project);
    return true;
  }

  function addCustom(event) {
    event.preventDefault();
    if (!normalizeLanguageCode(customCode)) return;
    if (add(customCode, customName)) {
      setCustomCode('');
      setCustomName('');
    }
  }

  async function remove(code) {
    if (languages.length <= 1) return;
    const confirmed = await dialogs.confirm({
      title: t('langs.delete.title'),
      message: `${t('langs.delete.message', { language: getLanguageName(project, code), project: project.title || t('langs.thisProject') })}${canUndo ? ` ${t('common.undoHint')}` : ''}`,
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      variant: 'danger',
      trapFocus: true,
    });
    // Dopo la conferma il focus torna nella finestra, non alla regia.
    window.setTimeout(() => sectionRef.current?.querySelector('.languagesDialogClose')?.focus(), 0);
    if (!confirmed) return;
    apply((current) => removeProjectLanguage(current, code).project);
  }

  function handleKeyDown(event) {
    // La finestra isola la tastiera: lo spazio non fa avanzare le battute.
    event.stopPropagation();
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="stentoreDialogOverlay languagesDialogOverlay"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        ref={sectionRef}
        className="stentoreDialog languagesDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="languages-dialog-title"
       
        onKeyDown={handleKeyDown}
      >
        <header className="languagesDialogHeader">
          <div>
            <h2 id="languages-dialog-title"><Languages size={18} aria-hidden="true" /> {t('langs.title')}</h2>
            <p>{project.title ? <strong className="languagesDialogProject">{project.title} · </strong> : null}{t('langs.intro')}</p>
          </div>
          <button type="button" className="languagesDialogClose" onClick={onClose} aria-label={t('langs.close')} title={t('langs.close.title')}>
            <X size={16} />
          </button>
        </header>

        <ul className="languagesDialogList" data-no-translate="">
          {languages.map((code) => {
            const isPrimary = code === primary;
            const { filled, total } = getLanguageCompletion(project, code);
            return (
              <li key={code} className={classNames('languagesDialogRow', code === language && 'active')}>
                <span className="languagesDialogCode">{code.toUpperCase()}</span>
                <LanguageNameField
                  project={project}
                  code={code}
                  onRename={(target, name) => apply((current) => renameProjectLanguage(current, target, name))}
                />
                <span className={classNames('languagesDialogCount', total && filled === total && 'complete')} title={t('langs.count.title', { filled, total })}>
                  {filled}/{total}
                </span>
                <button
                  type="button"
                  className={classNames('languagesDialogPrimary', isPrimary && 'active')}
                  onClick={() => apply((current) => setPrimaryProjectLanguage(current, code))}
                  aria-pressed={isPrimary}
                  title={t(isPrimary ? 'langs.primary.title' : 'langs.makePrimary.title')}
                >
                  <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
                  <span>{t(isPrimary ? 'langs.primary' : 'langs.makePrimary')}</span>
                </button>
                <button
                  type="button"
                  className="languagesDialogDelete"
                  onClick={() => remove(code)}
                  disabled={languages.length <= 1}
                  aria-label={t('langs.delete.aria', { language: getLanguageName(project, code) })}
                  title={t(languages.length <= 1 ? 'langs.delete.last' : 'langs.delete.title')}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="languagesDialogAdd">
          <strong>{t('langs.add')}</strong>
          {quickLanguages.length ? (
            <div className="languagesDialogQuick" data-no-translate="">
              {quickLanguages.map((item) => (
                <button key={item.code} type="button" onClick={() => add(item.code, item.name)} lang={item.code}>
                  <Plus size={13} aria-hidden="true" /> {item.name}
                </button>
              ))}
            </div>
          ) : null}
          <form className="languagesDialogCustom" onSubmit={addCustom}>
            <input
              value={customCode}
              onChange={(event) => setCustomCode(event.target.value)}
              placeholder={t('langs.code.placeholder')}
              aria-label={t('langs.code.aria')}
              maxLength={12}
            />
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={t('langs.newName.placeholder')}
              aria-label={t('langs.newName.aria')}
            />
            <button type="submit" disabled={!normalizeLanguageCode(customCode)}>{t('langs.add.button')}</button>
          </form>
          <label className="languagesDialogCopy">
            <input type="checkbox" checked={copyText} onChange={(event) => setCopyText(event.target.checked)} />
            <span>{t('langs.copy', { language: getLanguageName(project, copySource) })}</span>
          </label>
        </div>

        <footer className="dialogActions">
          <button type="button" className="dialogPrimary" onClick={onClose}>{t('langs.done')}</button>
        </footer>
      </section>
    </div>
  );
}
