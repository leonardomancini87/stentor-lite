import { BookmarkPlus, Plus, Scissors, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n/index.js';

function MergeNextIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h3c3 0 5 2 5 5" />
      <path d="M4 17h3c3 0 5-2 5-5" />
      <path d="M12 12h8" />
      <path d="m17 9 3 3-3 3" />
    </svg>
  );
}

export default function CueStructuralToolbar({
  onAddAfter,
  onSplit,
  onMergeNext,
  onDelete,
  onAddMarker,
  canAddAfter = false,
  canAddMarker = false,
  canSplit = false,
  canMergeNext = false,
  canDelete = false,
}) {
  const { t } = useI18n();
  return (
    <div className="liteSequenceStructuralToolbar" role="toolbar" aria-label={t('toolbar.aria')}>
      <button
        type="button"
        title={t('toolbar.addAfter')}
        aria-label={t('toolbar.addAfter.aria')}
        disabled={!canAddAfter}
        onClick={onAddAfter}
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        title={t('toolbar.split')}
        aria-label={t('toolbar.split.aria')}
        disabled={!canSplit}
        onClick={onSplit}
      >
        <Scissors size={17} />
      </button>
      <button
        type="button"
        title={t('toolbar.merge')}
        aria-label={t('toolbar.merge.aria')}
        disabled={!canMergeNext}
        onClick={onMergeNext}
      >
        <MergeNextIcon size={18} />
      </button>
      {onAddMarker ? (
        <button
          type="button"
          title={t('toolbar.marker')}
          aria-label={t('toolbar.marker.aria')}
          disabled={!canAddMarker}
          onClick={onAddMarker}
        >
          <BookmarkPlus size={17} />
        </button>
      ) : null}
      <button
        type="button"
        className="danger"
        title={t('toolbar.delete')}
        aria-label={t('toolbar.delete.aria')}
        disabled={!canDelete}
        onClick={onDelete}
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}
