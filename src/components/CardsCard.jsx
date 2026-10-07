import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, RectangleHorizontal, Trash2 } from 'lucide-react';

import { MAX_CARDS } from '../utils/showCards.js';
import { useCardCollapsed } from '../hooks/useCardCollapsed.js';
import CardCollapseButton from './CardCollapseButton.jsx';
import { useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

// Campo di testo di un cartello: Invio salva, Maiusc+Invio va a capo, Esc annulla.
function CardEditor({ initial = '', onSave, onCancel, t }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <form className="liteCardsEditor" onSubmit={(event) => { event.preventDefault(); onSave(value); }}>
      <textarea
        ref={ref}
        rows={2}
        value={value}
        placeholder={t('cards.placeholder')}
        aria-label={t('cards.placeholder')}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
          else if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); onSave(value); }
        }}
      />
      <div className="liteCardsEditorActions">
        <button type="button" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="submit" className="primary" disabled={!value.trim()}>{t('common.save')}</button>
      </div>
    </form>
  );
}

// Card «Cartelli» nella colonna destra di Sopratitoli: un clic manda il cartello su tutti gli
// schermi al posto della battuta; un altro clic, «Avanti» o il buio lo tolgono.
export default function CardsCard({ cards = [], activeCardId = null, onToggle, onAdd, onUpdate, onRemove, locked = false }) {
  const [collapsed, toggleCollapsed] = useCardCollapsed('cards');
  const [editing, setEditing] = useState(null); // 'new' oppure l'id del cartello
  const { t } = useI18n();
  const canAdd = !locked && cards.length < MAX_CARDS;

  useEffect(() => { if (locked) setEditing(null); }, [locked]);

  return (
    <section className={classNames('liteCardsCard', 'liteToolsCard', 'liteSideCard', collapsed && 'collapsed')} aria-label={t('cards.title')}>
      <header className="liteToolsHeader">
        <span className="liteToolsEyebrow"><RectangleHorizontal size={13} aria-hidden="true" /> {t('cards.title')}</span>
        <span className="liteToolsCollapsedSummary">{collapsed && activeCardId ? t('cards.onAir') : ''}</span>
        {collapsed ? null : (
          <button type="button" className="liteShowMapAdd" onClick={() => setEditing('new')} disabled={!canAdd || editing === 'new'} title={t('cards.add')} aria-label={t('cards.add')}>
            <Plus size={16} />
          </button>
        )}
        <CardCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} label={t('cards.title')} />
      </header>

      {collapsed ? null : (
        <div className="liteCardsBody">
          {cards.length || editing === 'new' ? null : <p className="liteShowMapEmpty">{t('cards.hint')}</p>}
          <ul className="liteCardsList">
            {cards.map((card) => {
              const active = card.id === activeCardId;
              if (editing === card.id) {
                return (
                  <li key={card.id}>
                    <CardEditor initial={card.text} t={t} onCancel={() => setEditing(null)} onSave={(text) => { onUpdate?.(card.id, text); setEditing(null); }} />
                  </li>
                );
              }
              return (
                <li key={card.id} className={classNames('liteCardsRow', active && 'active')}>
                  <button
                    type="button"
                    className="liteCardsSend"
                    aria-pressed={active}
                    onClick={() => onToggle?.(card.id)}
                    title={t(active ? 'cards.remove' : 'cards.send')}
                  >
                    <span className="liteCardsText" data-no-translate="">{card.text}</span>
                    {active ? <em>{t('cards.onAir')}</em> : null}
                  </button>
                  {locked ? null : (
                    <span className="liteCardsActions">
                      <button type="button" onClick={() => setEditing(card.id)} title={t('common.edit')} aria-label={`${t('common.edit')}: ${card.text}`}><Pencil size={13} /></button>
                      <button type="button" className="danger" onClick={() => onRemove?.(card.id)} title={t('common.delete')} aria-label={`${t('common.delete')}: ${card.text}`}><Trash2 size={13} /></button>
                    </span>
                  )}
                </li>
              );
            })}
            {editing === 'new' ? (
              <li><CardEditor t={t} onCancel={() => setEditing(null)} onSave={(text) => { onAdd?.(text); setEditing(null); }} /></li>
            ) : null}
          </ul>
        </div>
      )}
    </section>
  );
}
