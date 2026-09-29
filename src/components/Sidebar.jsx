import { APP_VERSION } from '../lib/appVersion.js';
import {
  FileText,
  Folder,
  Monitor,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useI18n } from '../i18n/index.js';

function classNames(...items) {
  return items.filter(Boolean).join(' ');
}

function normalizeNavLabel(label) {
  return label === 'TESTO' ? 'Testo' : label;
}

function NavItem({ icon, label, active, onClick, collapsed = false }) {
  const displayLabel = normalizeNavLabel(label);
  return (
    <button
      type="button"
      className={classNames('stentorNavItem', active && 'active')}
      onClick={onClick}
      title={collapsed ? displayLabel : undefined}
      aria-label={displayLabel}
    >
      {icon}
      <span>{displayLabel}</span>
    </button>
  );
}

export default function Sidebar({
  viewMode,
  setViewMode,
  project,
  isDirty = false,
  appLanguage = 'it',
  collapsed = false,
  onToggleCollapsed,
}) {
  const normalizedBasePath = import.meta.env.BASE_URL || '/';
  const isEditorMode = true;
  const { t } = useI18n();
  const projectTitle = String(project?.title || '').trim() || t('nav.untitled');
  const companyName = String(project?.company || project?.companyName || '').trim();
  // I marcatori (atti, scene…) non sono sopratitoli: non vengono contati.
  const cueCount = (project?.cues || []).filter((cue) => cue?.type !== 'marker').length;
  const savedLabel = t(isDirty ? 'nav.unsaved' : 'nav.saved');

  function openDashboard() {
    setViewMode('dashboard');
  }

  function openEditor() {
    setViewMode('editor');
  }

  function openPreferences() {
    setViewMode('preferences');
  }

  function openScreens() {
    setViewMode('screens');
  }

  return (
    <aside
      className={classNames(
        'sidebar',
        'stentorSidebar',
        collapsed && 'collapsed',
        isEditorMode && 'editorSidebarMode'
      )}
      aria-label={t('nav.aria')}
     
    >
      <>
        <div className="stentorSidebarProjectHeader" aria-label={t('nav.project.aria')}>
          {collapsed ? (
            <img src={`${normalizedBasePath}stentor-icon.png`} alt="" className="stentorSidebarProjectIcon" />
          ) : (
            <>
              <strong className="stentorSidebarProjectTitle">{projectTitle}</strong>
              {companyName ? <span className="stentorSidebarProjectMeta">{companyName}</span> : null}
              <span className="stentorSidebarProjectMeta">{savedLabel} •</span>
              <span className="stentorSidebarProjectMeta">{t('nav.cueCount', { count: cueCount })}</span>
            </>
          )}
        </div>
        <div className="stentorSidebarSectionRule" aria-hidden="true" />
      </>

      <nav className="stentorSidebarNav">
        <NavItem
          icon={<Folder />}
          label={t('nav.projects')}
          active={viewMode === 'dashboard'}
          onClick={openDashboard}
          collapsed={collapsed}
        />
        <NavItem
          icon={<FileText />}
          label={t('nav.cues')}
          active={viewMode === 'editor'}
          onClick={openEditor}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Monitor />}
          label={t('nav.screens')}
          active={viewMode === 'screens'}
          onClick={openScreens}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Settings />}
          label={t('nav.settings')}
          active={viewMode === 'preferences'}
          onClick={openPreferences}
          collapsed={collapsed}
        />
      </nav>


      {/* Firma in basso con la freccia per ridurre/espandere la barra sulla stessa riga. */}
      <div className={classNames('stentorSidebarFooter', 'withToggle', isEditorMode && 'minimal')}>
        <img src={`${normalizedBasePath}stentor-icon.png`} alt="" title={t('nav.version', { version: APP_VERSION })} />
        <span className="stentorWordmark" title={t('nav.version', { version: APP_VERSION })} aria-label={t('nav.version.aria')}>Sténtor Lite</span>
        <button
          type="button"
          className="stentorSidebarToggle inFooter"
          onClick={onToggleCollapsed}
          title={t(collapsed ? 'nav.expand' : 'nav.collapse')}
          aria-label={t(collapsed ? 'nav.expand' : 'nav.collapse')}
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
    </aside>
  );
}
