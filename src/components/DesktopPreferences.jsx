import { APP_VERSION } from '../lib/appVersion.js';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, Globe2, Info, MessageSquareHeart, X } from 'lucide-react';
import FeedbackDialog from './FeedbackDialog.jsx';
import { APP_LANGUAGES, getAppLanguageMeta } from '../utils/appLanguage.js';
import { useI18n } from '../i18n/index.js';

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

export default function DesktopPreferences({ appLanguage = 'it', setAppLanguage, appTheme = 'night', setAppTheme }) {
  const { t } = useI18n();
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const selectedLanguage = getAppLanguageMeta(appLanguage);

  return (
    <div className="desktopDashboard darkDesktopDashboard settingsPage refinedSettingsPage operationalSettingsPage">
      <header className="dashboardTopbar darkDashboardTopbar compactPageHeader refinedSettingsHeader">
        <div>
          <div className="dashboardTitleRow">
            <h1>{t('settings.title')}</h1>
          </div>
          <p className="dashboardSubtitle">{t('settings.subtitle')}</p>
        </div>
      </header>

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
