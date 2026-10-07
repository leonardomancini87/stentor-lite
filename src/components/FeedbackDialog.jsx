import { useEffect, useState } from 'react';
import { Copy, Mail, Star, X } from 'lucide-react';

import { useI18n } from '../i18n/index.js';
import { APP_VERSION } from '../lib/appVersion.js';
import {
  FEEDBACK_CONTEXTS,
  FEEDBACK_EMAIL,
  FEEDBACK_FEATURES,
  FEEDBACK_RECOMMEND,
  buildFeedbackEmail,
  createEmptyFeedback,
  describePlatform,
  hasFeedbackAnswers,
} from '../utils/feedbackMail.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function RatingField({ label, value, onChange, t }) {
  return (
    <fieldset className="feedbackField">
      <legend>{label}</legend>
      <div className="feedbackRating" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t('feedback.rating.aria', { value: n })}
            className={classNames('feedbackStar', n <= value && 'on')}
            onClick={() => onChange(value === n ? 0 : n)}
          >
            <Star size={20} strokeWidth={1.5} />
          </button>
        ))}
        <small>{value ? t('feedback.rating.aria', { value }) : `${t('feedback.scale.low')} – ${t('feedback.scale.high')}`}</small>
      </div>
    </fieldset>
  );
}

function ChoiceField({ label, options, value, onChange, multiple = false, t, prefix }) {
  const selected = multiple ? value : [value];
  return (
    <fieldset className="feedbackField">
      <legend>{label}{multiple ? <small> · {t('feedback.multiple')}</small> : null}</legend>
      <div className="feedbackChoices" role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              role={multiple ? 'checkbox' : 'radio'}
              aria-checked={active}
              className={classNames('feedbackChoice', active && 'on')}
              onClick={() => {
                if (multiple) onChange(active ? value.filter((item) => item !== option) : [...value, option]);
                else onChange(active ? '' : option);
              }}
            >
              {t(`${prefix}.${option}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function OpenField({ label, value, onChange, rows = 2 }) {
  return (
    <label className="feedbackField feedbackOpen">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

// Modulo di feedback: domande chiuse e aperte, poi un'email già pronta nell'app di posta.
export default function FeedbackDialog({ onClose }) {
  const { t, language } = useI18n();
  const [answers, setAnswers] = useState(createEmptyFeedback);
  const [status, setStatus] = useState('');
  const set = (key) => (value) => { setStatus(''); setAnswers((current) => ({ ...current, [key]: value })); };

  // I tasti di conduzione non devono agire mentre si compila il modulo.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose?.(); }
      event.stopPropagation();
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  function prepare() {
    return buildFeedbackEmail(answers, { version: APP_VERSION, language, platform: describePlatform() });
  }

  function send() {
    if (!hasFeedbackAnswers(answers)) { setStatus(t('feedback.empty')); return; }
    window.location.href = prepare().mailto;
    setStatus(t('feedback.sent'));
  }

  async function copy() {
    if (!hasFeedbackAnswers(answers)) { setStatus(t('feedback.empty')); return; }
    try {
      await navigator.clipboard.writeText(prepare().body);
      setStatus(t('feedback.copied', { email: FEEDBACK_EMAIL }));
    } catch {
      setStatus(t('feedback.copyFailed', { email: FEEDBACK_EMAIL }));
    }
  }

  return (
    <div className="projectActionsOverlay feedbackOverlay" role="presentation" onMouseDown={onClose}>
      <section className="projectActionsDialog feedbackDialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="projectActionsClose" aria-label={t('feedback.close')} onClick={onClose}><X size={16} /></button>
        <header className="feedbackHeader">
          <h2 id="feedback-title">{t('feedback.title')}</h2>
          <p>{t('feedback.intro')}</p>
        </header>

        <div className="feedbackBody">
          <RatingField label={t('feedback.q.overall')} value={answers.overall} onChange={set('overall')} t={t} />
          <RatingField label={t('feedback.q.ease')} value={answers.ease} onChange={set('ease')} t={t} />
          <ChoiceField label={t('feedback.q.recommend')} options={FEEDBACK_RECOMMEND} value={answers.recommend} onChange={set('recommend')} t={t} prefix="feedback.recommend" />
          <ChoiceField label={t('feedback.q.context')} options={FEEDBACK_CONTEXTS} value={answers.contexts} onChange={set('contexts')} multiple t={t} prefix="feedback.context" />
          <ChoiceField label={t('feedback.q.feature')} options={FEEDBACK_FEATURES} value={answers.feature} onChange={set('feature')} t={t} prefix="feedback.feature" />
          <OpenField label={t('feedback.q.usage')} value={answers.usage} onChange={set('usage')} />
          <OpenField label={t('feedback.q.improve')} value={answers.improve} onChange={set('improve')} />
          <OpenField label={t('feedback.q.problems')} value={answers.problems} onChange={set('problems')} />
          <label className="feedbackField feedbackOpen">
            <span>{t('feedback.q.contact')}</span>
            <input value={answers.contact} onChange={(event) => set('contact')(event.target.value)} />
          </label>
        </div>

        <footer className="feedbackFooter">
          <p className="feedbackStatus" role="status">{status || t('feedback.optional')}</p>
          <div className="feedbackActions">
            <button type="button" className="interfaceLanguageCancel" onClick={copy}><Copy size={14} /> {t('feedback.copy')}</button>
            <button type="button" className="interfaceLanguageConfirm feedbackSend" onClick={send}><Mail size={14} /> {t('feedback.send')}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
