import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

import { MARKER_TYPES, getMarkerTypeLabel } from '../utils/markers.js';
import { useI18n } from '../i18n/index.js';

function getDefaultValues(dialog, typeLabel = getMarkerTypeLabel) {
  if (!dialog) return {};

  if (dialog.kind === 'marker') {
    const markerType = dialog.defaultMarkerType || 'act';
    const suggested = dialog.suggestTitle?.(markerType) || typeLabel(markerType);
    const title = dialog.defaultTitle || suggested;
    return {
      markerType,
      title,
      // Finché il titolo è quello proposto, cambiando tipo si aggiorna da solo.
      titleIsSuggested: title === suggested,
    };
  }

  if (dialog.kind === 'language') {
    return {
      code: dialog.defaultCode || 'FR',
      name: dialog.defaultName || 'Français',
      copyFromActive: true,
    };
  }

  if (dialog.kind === 'projectDetails') {
    return {
      title: dialog.defaultTitle || '',
      company: dialog.defaultCompany || '',
      author: dialog.defaultAuthor || '',
    };
  }

  return {
    value: dialog.defaultValue || '',
  };
}

export default function StentoreDialog({ dialog, onCancel, onConfirm }) {
  const sectionRef = useRef(null);
  const { t } = useI18n();
  const markerLabel = (type) => t(`marker.type.${type}`);
  const initialValues = useMemo(() => getDefaultValues(dialog, markerLabel), [dialog]); // eslint-disable-line react-hooks/exhaustive-deps
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    setValues(getDefaultValues(dialog, markerLabel));
  }, [dialog]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dialog || dialog.trapFocus) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }

      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        submit();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog, values]);

  useEffect(() => {
    if (!dialog?.trapFocus) return undefined;
    const section = sectionRef.current;
    if (!section?.contains(document.activeElement)) section?.querySelector('button:not([disabled])')?.focus();
    return () => {
      const target = dialog.restoreFocusTo;
      // The field becomes enabled again when its async confirmation completes.
      if (target?.isConnected) window.setTimeout(() => target.focus?.(), 0);
    };
  }, [dialog]);

  function handleIsolatedKeyDown(event) {
    // This opt-in is used by voice confirmation only. It cannot conduct the show.
    event.stopPropagation();
    if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      onCancel();
    } else if (event.key === 'Tab') {
      const buttons = [...(sectionRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])') || [])];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    } else if ((event.metaKey || event.ctrlKey) && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault();
    }
  }

  if (!dialog) return null;

  const isDanger = dialog.variant === 'danger';
  const confirmLabel = dialog.confirmLabel || (isDanger ? t('common.delete') : t('dialog.confirm'));

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    if (dialog.kind === 'marker') {
      const markerType = values.markerType || 'act';
      const fallbackTitle = markerLabel(markerType);
      onConfirm({
        markerType,
        title: String(values.title || fallbackTitle).trim() || fallbackTitle,
      });
      return;
    }

    if (dialog.kind === 'language') {
      const code = String(values.code || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '');

      if (!code) return;

      onConfirm({
        code,
        name: String(values.name || code.toUpperCase()).trim() || code.toUpperCase(),
        copyFromActive: Boolean(values.copyFromActive),
      });
      return;
    }

    if (dialog.kind === 'choice') {
      return;
    }

    if (dialog.kind === 'projectDetails') {
      const title = String(values.title || '').trim();
      if (dialog.requiredTitle !== false && !title) return;
      onConfirm({
        title,
        company: String(values.company || '').trim(),
        author: String(values.author || '').trim(),
      });
      return;
    }

    if (dialog.kind === 'input') {
      const value = String(values.value || '').trim();
      if (dialog.required && !value) return;
      onConfirm(value);
      return;
    }

    onConfirm(true);
  }

  function renderBody() {
    if (dialog.kind === 'marker') {
      return (
        <div className="dialogFields twoColumns">
          <label className="dialogField">
            <span>{t('dialog.marker.type')}</span>
            <select
              value={values.markerType || 'act'}
              onChange={(event) => {
                const markerType = event.target.value;
                updateValue('markerType', markerType);

                if (!values.title || values.titleIsSuggested || MARKER_TYPES.some((type) => type.label === values.title || markerLabel(type.value) === values.title)) {
                  updateValue('title', dialog.suggestTitle?.(markerType) || markerLabel(markerType));
                  updateValue('titleIsSuggested', true);
                }
              }}
              autoFocus
            >
              {MARKER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {markerLabel(type.value)}
                </option>
              ))}
            </select>
          </label>

          <label className="dialogField">
            <span>{t('dialog.marker.title')}</span>
            <input
              value={values.title || ''}
              onChange={(event) => {
                updateValue('title', event.target.value);
                updateValue('titleIsSuggested', false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={t('dialog.marker.placeholder')}
            />
          </label>
        </div>
      );
    }

    if (dialog.kind === 'language') {
      return (
        <div className="dialogFields">
          <label className="dialogField">
            <span>{t('dialog.language.code')}</span>
            <input
              value={values.code || ''}
              onChange={(event) => updateValue('code', event.target.value)}
              placeholder="FR, DE, ES…"
              autoFocus
            />
          </label>

          <label className="dialogField">
            <span>{t('dialog.language.name')}</span>
            <input
              value={values.name || ''}
              onChange={(event) => updateValue('name', event.target.value)}
              placeholder="Français, Deutsch, Español…"
            />
          </label>

          {dialog.showCopyOption !== false && (
            <label className="dialogCheckbox">
              <input
                type="checkbox"
                checked={Boolean(values.copyFromActive)}
                onChange={(event) => updateValue('copyFromActive', event.target.checked)}
              />
              {t('dialog.language.copy')}
            </label>
          )}
        </div>
      );
    }



    if (dialog.kind === 'projectDetails') {
      return (
        <div className="dialogFields">
          <label className="dialogField">
            <span>{t('projects.dialog.details.titleField')}</span>
            <input
              value={values.title || ''}
              onChange={(event) => updateValue('title', event.target.value)}
              autoFocus
            />
          </label>

          <label className="dialogField">
            <span>{t('projects.dialog.details.company')}</span>
            <input
              value={values.company || ''}
              onChange={(event) => updateValue('company', event.target.value)}
            />
          </label>

          <label className="dialogField">
            <span>{t('projects.dialog.details.author')}</span>
            <input
              value={values.author || ''}
              onChange={(event) => updateValue('author', event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (dialog.kind === 'choice') {
      const options = Array.isArray(dialog.options) ? dialog.options : [];
      return (
        <div className="dialogChoiceList">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`dialogChoiceItem ${option.selected ? 'selectedChoiceItem' : ''} ${option.danger ? 'dangerChoiceItem' : ''}`}
              disabled={option.disabled}
              onClick={() => onConfirm(option.value)}
              autoFocus={option.selected}
            >
              <span className="dialogChoiceMark" aria-hidden="true">{option.selected ? '✓' : ''}</span>
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
            </button>
          ))}
        </div>
      );
    }

    if (dialog.kind === 'input') {
      return (
        <label className="dialogField">
          <span>{dialog.inputLabel || t('screens.field.name')}</span>
          <input
            value={values.value || ''}
            onChange={(event) => updateValue('value', event.target.value)}
            placeholder={dialog.placeholder || ''}
            autoFocus
          />
        </label>
      );
    }

    return null;
  }

  return (
    <div className="stentoreDialogOverlay" role="presentation">
      <section
        ref={sectionRef}
        onKeyDown={dialog.trapFocus ? handleIsolatedKeyDown : undefined}
        className={`stentoreDialog ${isDanger ? 'dangerDialog' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stentore-dialog-title"
      >
        <div className="dialogHeader">
          <div>
            <h2 id="stentore-dialog-title">{dialog.title}</h2>
            {dialog.message ? <p>{dialog.message}</p> : null}
          </div>
          {isDanger ? <AlertTriangle size={22} /> : null}
        </div>

        {renderBody()}

        <div className="dialogActions">
          {dialog.kind !== 'alert' && (
            <button type="button" className="dialogSecondary" onClick={onCancel}>
              <X size={16} /> {dialog.cancelLabel || t('common.cancel')}
            </button>
          )}

          {dialog.kind !== 'alert' && dialog.kind !== 'choice' && (
            <button
              type="button"
              className={isDanger ? 'dialogDanger' : 'dialogPrimary'}
              onClick={submit}
            >
              <Check size={16} /> {confirmLabel}
            </button>
          )}

          {dialog.kind === 'alert' && (
            <button type="button" className="dialogPrimary" onClick={submit}>
              <Check size={16} /> {t('dialog.ok')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
