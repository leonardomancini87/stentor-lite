import { useEffect, useState } from 'react';
import { Keyboard, Plus, RotateCcw, X } from 'lucide-react';

import { useCardCollapsed } from '../hooks/useCardCollapsed.js';
import CardCollapseButton from './CardCollapseButton.jsx';
import { useI18n } from '../i18n/index.js';
import {
  FIXED_SHORTCUTS,
  MAX_BINDINGS,
  SHORTCUT_ACTIONS,
  assignBinding,
  bindingFromEvent,
  formatBinding,
  isCustomized,
  removeBinding,
} from '../utils/keyboardShortcuts.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

// Card "Scorciatoie": mostra i tasti di ogni comando e permette di cambiarli.
// Clic su un tasto → premi il nuovo tasto (Esc annulla). Ogni comando ha fino a due tasti.
export default function ShortcutsCard({ shortcuts, onChange, onReset }) {
  const [collapsed, toggleCollapsed] = useCardCollapsed('shortcuts');
  const [recording, setRecording] = useState(null); // { actionId, slot }
  const [message, setMessage] = useState('');
  const { t } = useI18n();
  const keyLabel = (binding) => formatBinding(binding, t);
  const actionLabel = (id) => t(`shortcuts.action.${id}`);

  // Durante la registrazione il tasto premuto non deve comandare la proiezione.
  useEffect(() => {
    if (!recording) return undefined;
    function onKeyDown(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === 'Escape') { setRecording(null); return; }
      if (['Shift', 'Meta', 'Control', 'Alt'].includes(event.key)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) {
        setMessage(t('shortcuts.hint.modifiers'));
        return;
      }
      const binding = bindingFromEvent(event);
      if (!binding) { setMessage(t('shortcuts.hint.invalid')); return; }
      const { shortcuts: next, movedFrom } = assignBinding(shortcuts, recording.actionId, recording.slot, binding);
      onChange(next);
      setMessage(movedFrom ? t('shortcuts.hint.moved', { key: keyLabel(binding), action: actionLabel(movedFrom.id) }) : '');
      setRecording(null);
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recording, shortcuts, onChange, t]);

  useEffect(() => { if (collapsed) setRecording(null); }, [collapsed]);

  function startRecording(actionId, slot) {
    setMessage('');
    setRecording((current) => (current?.actionId === actionId && current.slot === slot ? null : { actionId, slot }));
  }

  return (
    <section className={classNames('liteShortcutsCard', 'liteSideCard', collapsed && 'collapsed')} aria-label={t('shortcuts.aria')}>
      <header className="liteToolsHeader">
        <span className="liteToolsEyebrow"><Keyboard size={13} aria-hidden="true" /> {t('shortcuts.title')}</span>
        <span className="liteToolsCollapsedSummary" />
        <CardCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} label={t('shortcuts.title')} />
      </header>

      {collapsed ? null : (
        <div className="liteShortcutsBody">
          <ul className="liteShortcutsList">
            {SHORTCUT_ACTIONS.map((action) => {
              const bindings = shortcuts[action.id] || [];
              const canAdd = bindings.length < MAX_BINDINGS;
              return (
                <li key={action.id} className="liteShortcutsRow">
                  <span className="liteShortcutsLabel" title={t(`shortcuts.action.${action.id}.detail`)}>{actionLabel(action.id)}</span>
                  <span className="liteShortcutsKeys">
                    {bindings.map((binding, slot) => {
                      const isRecording = recording?.actionId === action.id && recording.slot === slot;
                      return (
                        <span key={`${binding.code}-${slot}`} className={classNames('liteShortcutsKey', isRecording && 'recording')}>
                          <button
                            type="button"
                            onClick={() => startRecording(action.id, slot)}
                            title={t(isRecording ? 'shortcuts.recording.title' : 'shortcuts.change.title')}
                            aria-label={t('shortcuts.change.aria', { action: actionLabel(action.id), key: keyLabel(binding) })}
                          >
                            <kbd>{isRecording ? t('shortcuts.press') : keyLabel(binding)}</kbd>
                          </button>
                          {!isRecording && bindings.length > 1 ? (
                            <button
                              type="button"
                              className="liteShortcutsRemove"
                              onClick={() => { setMessage(''); onChange(removeBinding(shortcuts, action.id, slot)); }}
                              aria-label={t('shortcuts.remove.aria', { key: keyLabel(binding), action: actionLabel(action.id) })}
                              title={t('shortcuts.remove.title')}
                            ><X size={11} /></button>
                          ) : null}
                        </span>
                      );
                    })}
                    {canAdd ? (
                      recording?.actionId === action.id && recording.slot === bindings.length ? (
                        <span className="liteShortcutsKey recording"><button type="button" onClick={() => setRecording(null)}><kbd>{t('shortcuts.press')}</kbd></button></span>
                      ) : (
                        <button
                          type="button"
                          className="liteShortcutsAdd"
                          onClick={() => startRecording(action.id, bindings.length)}
                          aria-label={t('shortcuts.add.aria', { action: actionLabel(action.id) })}
                          title={t('shortcuts.add.title')}
                        ><Plus size={12} /></button>
                      )
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>

          {recording ? <p className="liteShortcutsHint" role="status">{t('shortcuts.hint.recording')}</p> : null}
          {!recording && message ? <p className="liteShortcutsHint" role="status">{message}</p> : null}

          <ul className="liteShortcutsList fixed" aria-label={t('shortcuts.fixed.aria')}>
            {FIXED_SHORTCUTS.map((item) => (
              <li key={item.id} className="liteShortcutsRow">
                <span className="liteShortcutsLabel">{t(`shortcuts.fixed.${item.id}`)}</span>
                <span className="liteShortcutsKeys"><kbd className="fixed">{item.keys}</kbd></span>
              </li>
            ))}
          </ul>

          {isCustomized(shortcuts) ? (
            <button type="button" className="liteShortcutsReset" onClick={() => { setRecording(null); setMessage(''); onReset(); }}>
              <RotateCcw size={13} /> {t('shortcuts.reset')}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
