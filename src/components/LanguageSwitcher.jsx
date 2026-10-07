import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Languages, Plus, Star, Trash2 } from 'lucide-react';

import { getLanguageCompletion, getLanguageName, getPrimaryLanguage } from '../utils/projectLanguages.js';
import { useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

const MAX_BUTTONS = 4;

// Menu del tasto destro su una lingua: rendi principale, gestisci, elimina.
function LanguageMenu({ project, code, x, y, onClose, onMakePrimary, onManage, onDelete }) {
  const { t } = useI18n();
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ left: x, top: y });
  const isPrimary = getPrimaryLanguage(project) === code;
  const isLast = (project.languages || []).length <= 1;
  const name = getLanguageName(project, code);

  // Resta dentro la finestra anche vicino ai bordi.
  useLayoutEffect(() => {
    const rect = menuRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    menuRef.current?.querySelector('button:not(:disabled)')?.focus();
    function closeOutside(event) {
      if (!menuRef.current?.contains(event.target)) onClose();
    }
    window.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  function handleKeyDown(event) {
    // I tasti della regia (spazio, frecce) non devono agire mentre il menu è aperto.
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items = [...menuRef.current.querySelectorAll('button:not(:disabled)')];
      const index = items.indexOf(document.activeElement);
      const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  function run(action) {
    onClose();
    action();
  }

  // Fuori dalla barra delle lingue, così non eredita i suoi stili e non viene tagliato.
  return createPortal((
    <div
      ref={menuRef}
      className="liteLanguageMenu"
      role="menu"
      aria-label={name}
      style={{ left: position.left, top: position.top }}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="liteLanguageMenuTitle">{code.toUpperCase()} · {name}</div>
      <button type="button" role="menuitem" disabled={isPrimary} onClick={() => run(() => onMakePrimary(code))}>
        <Star size={14} fill={isPrimary ? 'currentColor' : 'none'} />
        <span>{t(isPrimary ? 'langs.primary.title' : 'langs.makePrimary.title')}</span>
      </button>
      <button type="button" role="menuitem" onClick={() => run(onManage)}>
        <Languages size={14} />
        <span>{t('languages.manage.aria')}…</span>
      </button>
      <div className="liteLanguageMenuSeparator" role="separator" />
      <button
        type="button"
        role="menuitem"
        className="danger"
        disabled={isLast}
        title={isLast ? t('langs.delete.last') : undefined}
        onClick={() => run(() => onDelete(code))}
      >
        <Trash2 size={14} />
        <span>{t('langs.delete.aria', { language: name })}…</span>
      </button>
    </div>
  ), document.querySelector('.appShell') || document.body);
}

// Selettore della lingua di lavoro. Il "+" apre la finestra Lingue del progetto;
// il tasto destro su una lingua apre un menu rapido (principale, gestisci, elimina).
export default function LanguageSwitcher({ project, language, onChange, onManage, onMakePrimary, onDelete }) {
  const languages = project.languages || [];
  const useSelect = languages.length > MAX_BUTTONS;
  const { t } = useI18n();
  const [menu, setMenu] = useState(null);

  function tooltip(code) {
    const { filled, total } = getLanguageCompletion(project, code);
    return t('languages.progress', { language: getLanguageName(project, code), filled, total });
  }

  function openMenu(event, code) {
    if (!onDelete && !onMakePrimary) return;
    event.preventDefault();
    // Da tastiera (tasto Menu o Maiusc+F10) il punto è 0,0: si apre sotto il pulsante.
    let { clientX: x, clientY: y } = event;
    if (!x && !y) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 4;
    }
    setMenu({ code, x, y });
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
            className={classNames('liteLanguageOption', code === language && 'active', menu?.code === code && 'menuOpen')}
            aria-pressed={code === language}
            aria-haspopup="menu"
            onClick={() => onChange(code)}
            onContextMenu={(event) => openMenu(event, code)}
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
        disabled={!onManage}
        title={t('languages.manage.title')}
        aria-label={t('languages.manage.aria')}
      >
        <Plus size={14} />
      </button>
      {menu && (
        <LanguageMenu
          project={project}
          code={menu.code}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onMakePrimary={onMakePrimary || (() => {})}
          onManage={onManage}
          onDelete={onDelete || (() => {})}
        />
      )}
    </div>
  );
}
