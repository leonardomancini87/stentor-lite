import { APP_VERSION } from '../lib/appVersion.js';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, Globe2, Info, MessageSquareHeart, RefreshCw, X } from 'lucide-react';
import FeedbackDialog from './FeedbackDialog.jsx';
import { APP_LANGUAGES, getAppLanguageMeta } from '../utils/appLanguage.js';
import { useI18n } from '../i18n/index.js';
import PageHeader from './PageHeader.jsx';

// Le risorse di public/ stanno sotto il percorso base dell'app (es. /stentore-browser/).
const STENTOR_BASE_PATH = ((BASE) => (BASE.endsWith('/') ? BASE : `${BASE}/`))((typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/');

function InterfaceLanguageModal({ appLanguage, onChoose, onClose }) {
  const { t } = useI18n();
  const [pendingLanguageCode, setPendingLanguageCode] = useState(appLanguage);

  useEffect(() => {
    setPendingLanguageCode(appLanguage);
  }, [appLanguage]);

  const currentLanguage = getAppLanguageMeta(appLanguage);
  const pendingLanguage = APP_LANGUAGES.find((language) => language.code === pendingLanguageCode) || currentLanguage;
  const hasChanged = pendingLanguage.code !== currentLanguage.code;

  const confirmLanguage = () => {
    onChoose?.(pendingLanguage.code);
    onClose?.();
  };

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        confirmLanguage();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmLanguage, onClose]);

  return (
    <div className="projectActionsOverlay interfaceLanguageOverlay" role="presentation" onMouseDown={onClose}>
      <section
        className="projectActionsDialog interfaceLanguageDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interface-language-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="projectActionsClose" aria-label={t('settings.language.close')} onClick={onClose}>
          <X size={17} />
        </button>

        <header className="projectActionsHeader interfaceLanguageHeader">
          <div className="interfaceLanguageIcon" aria-hidden="true">
            <img src={`${STENTOR_BASE_PATH}stentor-icon.png`} alt="" className="interfaceLanguageIconImage" />
          </div>
          <div>
            <p className="projectActionsEyebrow">{t('settings.language.eyebrow')}</p>
            <h2 id="interface-language-title">{t('settings.language.title')}</h2>
            <p>{t('settings.language.help')}</p>
            <div className="projectActionsMeta">
              <span>{t('settings.language.current', { name: currentLanguage.label })}</span>
              <strong>{currentLanguage.shortLabel}</strong>
              {hasChanged && <span>{t('settings.language.chosen', { name: pendingLanguage.label })}</span>}
            </div>
          </div>
        </header>

        <div className="interfaceLanguageGrid" role="listbox" aria-label={t('settings.language.eyebrow')} data-no-translate="">
          {APP_LANGUAGES.map((language) => {
            const active = language.code === appLanguage;
            const selected = language.code === pendingLanguage.code;
            return (
              <button
                key={language.code}
                type="button"
                className={`interfaceLanguageChoice ${selected ? 'selected' : ''} ${active ? 'active' : ''}`}
                role="option"
                aria-selected={selected}
                onClick={() => setPendingLanguageCode(language.code)}
                onDoubleClick={() => {
                  onChoose?.(language.code);
                  onClose?.();
                }}
              >
                <span className="interfaceLanguageShort">{language.shortLabel}</span>
                <span className="interfaceLanguageName">{language.label}</span>
                {selected && <Check size={17} />}
              </button>
            );
          })}
        </div>

        <footer className="interfaceLanguageFooter">
          <button type="button" className="interfaceLanguageCancel" onClick={onClose}>{t('settings.language.cancel')}</button>
          <button type="button" className="interfaceLanguageConfirm" onClick={confirmLanguage}>
            {t('settings.language.confirm')}
          </button>
        </footer>
      </section>
    </div>
  );
}

// Riquadro Aggiornamenti: stato della verifica a sinistra, un solo pulsante a destra.
function UpdatesPanel({ updates }) {
  const { t } = useI18n();
  const { status, version, progress } = updates;
  const busy = status === 'checking' || status === 'downloading' || status === 'installing';

  const message = {
    idle: t('settings.updates.current', { version: APP_VERSION }),
    checking: t('settings.updates.checking'),
    upToDate: t('settings.updates.upToDate', { version: APP_VERSION }),
    available: t('settings.updates.available', { version }),
    downloading: progress === null ? t('settings.updates.downloading') : t('settings.updates.downloadingPercent', { percent: progress }),
    installing: t('settings.updates.installing'),
    ready: t('settings.updates.ready', { version }),
    checkError: t('settings.updates.checkError'),
    installError: t('settings.updates.installError'),
  }[status];

  let action = { label: t('settings.updates.check'), onClick: () => updates.check() };
  if (status === 'available' || status === 'installError') action = { label: t('settings.updates.install'), onClick: updates.install };
  if (status === 'ready') action = { label: t('settings.updates.restart'), onClick: updates.restart };

  return (
    <article className="darkPanel projectStatePanel settingsUnifiedPanel settingsFeedbackPanel settingsUpdatesPanel">
      <div className="settingsPanelTitleWithIcon">
        <RefreshCw size={18} />
        <h2>{t('settings.updates.title')}</h2>
      </div>
      <div className="settingsFeedbackRow">
        <p role="status" aria-live="polite"><strong>{message}</strong></p>
        <button type="button" className="interfaceLanguageConfirm settingsFeedbackButton" onClick={action.onClick} disabled={busy}>
          {action.label}
        </button>
      </div>
      <p>{t('settings.updates.help')}</p>
    </article>
  );
}

export default function DesktopPreferences({ appLanguage = 'it', setAppLanguage, appTheme = 'night', setAppTheme, updates }) {
  const { t } = useI18n();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const selectedLanguage = getAppLanguageMeta(appLanguage);

  return (
    <div className="desktopDashboard darkDesktopDashboard settingsPage refinedSettingsPage operationalSettingsPage">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <section className="settingsOverviewGrid settingsOverviewGridCompact">
        <article className="darkPanel projectStatePanel appLanguagePanel settingsUnifiedPanel">
          <div className="settingsPanelTitleWithIcon">
            <Globe2 size={18} />
            <h2>{t('settings.interface')}</h2>
          </div>
          <div className="settingsControlStack settingsControlGrid">
            <label className="appLanguageControl">
              <span>{t('settings.appLanguage')}</span>
              <button
                type="button"
                className="appLanguagePickerButton"
                onClick={() => setLanguageModalOpen(true)}
                aria-haspopup="dialog"
              >
                <strong data-no-translate="">{selectedLanguage.label}</strong>
                <small>{selectedLanguage.shortLabel}</small>
                <ChevronDown size={16} />
              </button>
            </label>
          </div>
          <p>{t('settings.appLanguageHelp')}</p>
        </article>

        <article className="darkPanel projectStatePanel settingsUnifiedPanel settingsVersionPanel">
          <div className="settingsPanelTitleWithIcon">
            <Info size={18} />
            <h2>{t('settings.about')}</h2>
          </div>
          <div className="stateLine"><span>{t('settings.version')}</span><strong>Sténtor Lite {APP_VERSION}</strong></div>
        </article>

        {updates?.supported && <UpdatesPanel updates={updates} />}

        <article className="darkPanel projectStatePanel settingsUnifiedPanel settingsFeedbackPanel">
          <div className="settingsPanelTitleWithIcon">
            <MessageSquareHeart size={18} />
            <h2>{t('feedback.card.title')}</h2>
          </div>
          <div className="settingsFeedbackRow">
            <p>{t('feedback.card.text')}</p>
            <button type="button" className="interfaceLanguageConfirm settingsFeedbackButton" onClick={() => setFeedbackOpen(true)}>
              {t('feedback.card.button')}
            </button>
          </div>
        </article>
      </section>
      {feedbackOpen && <FeedbackDialog onClose={() => setFeedbackOpen(false)} />}
      {languageModalOpen && (
        <InterfaceLanguageModal
          appLanguage={appLanguage}
          onChoose={setAppLanguage}
          onClose={() => setLanguageModalOpen(false)}
        />
      )}
    </div>
  );
}
