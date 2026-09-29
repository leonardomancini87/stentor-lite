import { BookmarkPlus, Map as MapIcon } from 'lucide-react';

import { formatCueNumber } from '../utils/showMap.js';
import { useCardCollapsed } from '../hooks/useCardCollapsed.js';
import CardCollapseButton from './CardCollapseButton.jsx';
import { renderRich, useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function sectionRange(section, t) {
  if (!section.cueCount) return t('map.range.none');
  if (section.firstNumber === section.lastNumber) return t('map.range.single', { number: formatCueNumber(section.firstNumber) });
  return `${formatCueNumber(section.firstNumber)}–${formatCueNumber(section.lastNumber)}`;
}

// Indice dello spettacolo: un clic su una sezione porta alla sua prima battuta.
export default function ShowMap({ sections = [], currentSectionId = null, onGoToSection, onAddMarker, canAddMarker = true }) {
  const [collapsed, toggleCollapsed] = useCardCollapsed('map');
  const { t } = useI18n();
  const titleOf = (section) => (section.implicit ? t('map.start') : section.title);
  return (
    <section className={classNames('liteShowMap', 'liteSideCard', collapsed && 'collapsed')} aria-label={t('map.aria')}>
      <header className="liteShowMapHeader">
        <div>
          <span className="liteShowMapEyebrow"><MapIcon size={13} aria-hidden="true" /> {t('map.title')}</span>
          {collapsed ? null : <small>{sections.length ? t('map.hint') : t('map.subtitle')}</small>}
        </div>
        {collapsed ? null : <button
          type="button"
          className="liteShowMapAdd"
          onClick={onAddMarker}
          disabled={!canAddMarker}
          title={t('map.add.title')}
          aria-label={t('map.add.aria')}
        >
          <BookmarkPlus size={16} />
        </button>}
        <CardCollapseButton collapsed={collapsed} onToggle={toggleCollapsed} label={t('map.title')} />
      </header>

      {collapsed ? null : sections.length ? (
        <ol className="liteShowMapList">
          {sections.map((section) => {
            const isCurrent = section.id === currentSectionId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={classNames('liteShowMapItem', isCurrent && 'current', section.implicit && 'implicit', `type-${section.markerType}`)}
                  onClick={() => onGoToSection?.(section)}
                  aria-current={isCurrent ? 'true' : undefined}
                  title={section.cueCount ? t('map.goTo', { title: titleOf(section) }) : t('map.emptySection', { title: titleOf(section) })}
                >
                  <span className="liteShowMapMark" aria-hidden="true" />
                  <span className="liteShowMapTitle">{titleOf(section)}</span>
                  <span className="liteShowMapRange">
                    {sectionRange(section, t)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="liteShowMapEmpty">
          {renderRich(t('map.empty'), { icon: <BookmarkPlus size={13} aria-hidden="true" /> })}
        </p>
      )}
    </section>
  );
}
