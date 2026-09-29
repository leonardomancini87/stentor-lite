import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

// Freccetta per ridurre o riaprire in verticale una card della colonna destra.
// `label` è il nome della card già tradotto (es. "Mappa").
export default function CardCollapseButton({ collapsed, onToggle, label }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="liteCardCollapse"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={t(collapsed ? 'card.expand' : 'card.collapse', { name: label })}
      title={t(collapsed ? 'card.expandShort' : 'card.collapseShort')}
    >
      {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
    </button>
  );
}
