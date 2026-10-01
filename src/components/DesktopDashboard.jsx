import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.js';
import { IMPORT_ACCEPT } from '../utils/fileImport.js';
import { Copy, Download, Edit3, FolderOpen, Grid2X2, ImagePlus, Languages, List, MoreHorizontal, Play, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import PageHeader from './PageHeader.jsx';

function getLanguageLabel(project, code) {
  return project.languageNames?.[code] || String(code || '').toUpperCase();
}

function getProjectAuthor(project) {
  return String(
    project?.author
    || project?.projectAuthor
    || project?.creator
    || project?.writer
    || project?.metadata?.author
    || project?.metadata?.projectAuthor
    || ''
  ).trim();
}

function formatUpdatedAt(value, language = 'it') {
  const date = new Date(value || Date.now());
  const locale = { en: 'en-GB', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-PT', zh: 'zh-CN', 'zh-Hant': 'zh-TW', ar: 'ar-u-nu-latn', ml: 'ml-IN', hi: 'hi-IN' }[language] || 'it-IT';
  return date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

function projectInitials(title = 'Sténtor') {
  return String(title)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'S';
}

function ProjectCard({ project, isCurrent, selected, onSelect, onOpen, onOpenActions }) {
  const { t, language } = useI18n();
  const title = project.title || t('projects.untitled');
  const cueCount = Array.isArray(project.cues) ? project.cues.filter((cue) => cue?.type !== 'marker').length : 0;
  const languageCount = Array.isArray(project.languages) ? project.languages.length : 1;
  const companyName = String(project.company || project.companyName || project.collective || project.troupe || '').trim();
  const authorName = getProjectAuthor(project);
  const updatedAt = project.updatedAt || project.savedAt || Date.now();

  return (
    <article
      className={`desktopProjectCard ${selected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <div className="desktopProjectPoster" aria-hidden="true">
        {project.coverImage ? <img src={project.coverImage} alt="" /> : <span>{projectInitials(title)}</span>}
      </div>
      <div className="desktopProjectCardBody">
        <div className="desktopProjectCardHead">
          <h3>{title}</h3>
          <button
            type="button"
            className="projectCardMenuTrigger"
            aria-label={t('projects.actions.aria', { title })}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.();
              onOpenActions?.();
            }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
        <p>{companyName || t('projects.liveShow')}</p>
        {authorName && <small className="desktopProjectAuthor">{authorName}</small>}
        <small>{t('projects.modified', { date: formatUpdatedAt(updatedAt, language) })}</small>
        <div className="desktopProjectMetaLine">
          <span>{t('count.cues', { count: cueCount })}</span>
          <span>{t('projects.languageCount', { count: languageCount })}</span>
        </div>
      </div>
    </article>
  );
}

function ProjectActionsModal({ project, currentProjectId, onClose, onDetails, editProjectDetails, onManageLanguages, exportProject, duplicateProject, deleteProject, updateProjectCover }) {
  const { t } = useI18n();
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose?.();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  const title = project.title || t('projects.untitled');
  const companyName = String(project.company || project.companyName || project.collective || project.troupe || t('projects.liveShow')).trim();
  const authorName = getProjectAuthor(project);
  const cueCount = Array.isArray(project.cues) ? project.cues.filter((cue) => cue?.type !== 'marker').length : 0;
  const languageCount = Array.isArray(project.languages) ? project.languages.length : 1;
  const isCurrent = project.id === currentProjectId;

  function run(action) {
    onClose?.();
    action?.();
  }

  return (
    <div className="projectActionsOverlay" role="presentation" onMouseDown={onClose}>
      <section
        className="projectActionsDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-actions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="projectActionsClose" aria-label={t('projects.actions.close')} onClick={onClose}>
          <X size={17} />
        </button>

        <header className="projectActionsHeader">
          <div className="projectActionsPoster" aria-hidden="true">
            {project.coverImage ? <img src={project.coverImage} alt="" /> : <span>{projectInitials(title)}</span>}
          </div>
          <div>
            <p className="projectActionsEyebrow">{t('projects.actions.eyebrow')}</p>
            <h2 id="project-actions-title">{title}</h2>
            <p>{companyName}</p>
            {authorName && <p className="projectActionsAuthor">{authorName}</p>}
            <div className="projectActionsMeta">
              <span>{t('count.cues', { count: cueCount })}</span>
              <span>{t('projects.languageCount', { count: languageCount })}</span>
              {isCurrent && <strong>{t('projects.current')}</strong>}
            </div>
          </div>
        </header>

        <div className="projectActionsGrid">
          <button type="button" onClick={() => run(() => editProjectDetails?.(project.id))}>
            <FolderOpen size={18} />
            <span><strong>{t('projects.actions.details')}</strong><small>{t('projects.actions.detailsHelp')}</small></span>
          </button>

          <label className="projectActionsUpload">
            <ImagePlus size={18} />
            <span><strong>{t('projects.actions.image')}</strong><small>{t('projects.actions.imageHelp')}</small></span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onClose?.();
                if (file) updateProjectCover?.(project.id, file);
              }}
            />
          </label>

          <button type="button" onClick={() => run(() => exportProject?.(project.id))}>
            <Download size={18} />
            <span><strong>{t('projects.actions.export')}</strong><small>{t('projects.actions.exportHelp')}</small></span>
          </button>

          <button type="button" onClick={() => run(() => duplicateProject?.(project.id))}>
            <Copy size={18} />
            <span><strong>{t('projects.actions.duplicate')}</strong><small>{t('projects.actions.duplicateHelp')}</small></span>
          </button>

          {/* "Rinomina" faceva la stessa cosa di "Dettagli": al suo posto la gestione delle lingue. */}
          <button type="button" onClick={() => run(() => onManageLanguages?.(project.id))}>
            <Languages size={18} />
            <span><strong>{t('projects.details.languages')}</strong><small>{t('projects.actions.languagesHelp')}</small></span>
          </button>

          <button type="button" className="dangerProjectAction" onClick={() => run(() => deleteProject?.(project.id))}>
            <Trash2 size={18} />
            <span><strong>{t('projects.actions.delete')}</strong><small>{t('projects.actions.deleteHelp')}</small></span>
          </button>
        </div>
      </section>
    </div>
  );
}

export default function DesktopDashboard({
  project,
  projects = [],
  setViewMode,
  createNewProject,
  openProjectFile,
  saveProjectFile,
  switchProject,
  editProjectDetails,
  exportProject,
  duplicateProject,
  deleteProject,
  updateProjectCover,
  onManageLanguages,
}) {
  const { t, language } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectViewMode, setProjectViewMode] = useState('grid');
  const [selectedProjectId, setSelectedProjectId] = useState(project?.id);
  const [actionsProjectId, setActionsProjectId] = useState(null);
  const importInputRef = useRef(null);
  const currentProjectId = project?.id;
  const projectList = projects.length > 0 ? projects : [project].filter(Boolean);

  const filteredProjects = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    const visibleProjects = needle
      ? projectList.filter((item) => {
          const title = String(item.title || '').toLowerCase();
          const languages = Array.isArray(item.languages) ? item.languages.join(' ').toLowerCase() : '';
          const company = String(item.company || item.companyName || '').toLowerCase();
          const author = getProjectAuthor(item).toLowerCase();
          return title.includes(needle) || languages.includes(needle) || company.includes(needle) || author.includes(needle);
        })
      : projectList;

    return [...visibleProjects].sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.savedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.savedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [projectList, searchTerm]);

  const selectedProject = filteredProjects.find((item) => item.id === selectedProjectId)
    || filteredProjects.find((item) => item.id === currentProjectId)
    || filteredProjects[0]
    || project;

  const actionsProject = projectList.find((item) => item.id === actionsProjectId) || null;

  async function openSelectedProject() {
    if (!selectedProject) return;
    if (selectedProject.id !== currentProjectId) {
      await switchProject?.(selectedProject.id);
    }
    setViewMode('editor');
  }

  const languages = Array.isArray(selectedProject?.languages) && selectedProject.languages.length > 0
    ? selectedProject.languages.map((code) => getLanguageLabel(selectedProject, code)).join(', ')
    : '—';

  return (
    <div className="stentorWorkspace projectsWorkspace">
      <section className="projectsMainPanel">
        <PageHeader
          className="projectsPageHeader"
          title={t('projects.title')}
          subtitle={t('projects.subtitle')}
          actionsClassName="workspaceToolbar projectsToolbar"
          actions={(
            <>
            <button type="button" className="primaryDesktopAction" onClick={createNewProject}>
              <Plus size={17} /> {t('projects.new')}
            </button>
            <button
              type="button"
              className="secondaryImportAction"
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={16} /> {t('projects.import')}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept={IMPORT_ACCEPT}
              onChange={openProjectFile}
              hidden
            />
            <button type="button" className="secondaryImportAction" onClick={() => saveProjectFile?.()}>
              {t('projects.save')}
            </button>
            <button type="button" className="secondaryImportAction" onClick={() => saveProjectFile?.({ saveAs: true })}>
              {t('projects.saveAs')}
            </button>
            </>
          )}
        />

        <div className="projectsControlRow">
          <label className="dashboardSearch proSearch">
            <Search size={17} />
            <input
              placeholder={t('projects.search')}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <div className="viewToggle" role="group" aria-label={t('projects.view.aria')}>
            <button
              type="button"
              className={projectViewMode === 'grid' ? 'active' : ''}
              aria-pressed={projectViewMode === 'grid'}
              aria-label={t('projects.view.grid')}
              title={t('projects.view.grid')}
              onClick={() => setProjectViewMode('grid')}
            >
              <Grid2X2 size={18} />
            </button>
            <button
              type="button"
              className={projectViewMode === 'list' ? 'active' : ''}
              aria-pressed={projectViewMode === 'list'}
              aria-label={t('projects.view.list')}
              title={t('projects.view.list')}
              onClick={() => setProjectViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className={`desktopProjectsGrid ${projectViewMode === 'list' ? 'desktopProjectsList' : ''}`}>
          {filteredProjects.map((item) => (
            <ProjectCard
              key={item.id}
              project={item}
              isCurrent={item.id === currentProjectId}
              selected={item.id === selectedProject?.id}
              onSelect={() => setSelectedProjectId(item.id)}
              onOpen={async () => {
                if (item.id !== currentProjectId) await switchProject?.(item.id);
                setViewMode('editor');
              }}
              onOpenActions={() => setActionsProjectId(item.id)}
            />
          ))}
          {filteredProjects.length === 0 && <div className="emptyProjectsState">{t('projects.empty')}</div>}
        </div>
        <footer className="projectsCount">{t('projects.count', { count: filteredProjects.length })}</footer>
      </section>

      <aside className="projectDetailsPanel projectDetailsPanelMinimal">
        <h2>{t('projects.details.title')}</h2>
        <h3>{selectedProject?.title || t('projects.untitled')}</h3>
        <p>{String(selectedProject?.company || selectedProject?.companyName || t('projects.liveShow'))}</p>
        <dl>
          <div><dt>{t('projects.details.lastModified')}</dt><dd>{formatUpdatedAt(selectedProject?.updatedAt || selectedProject?.savedAt, language)}</dd></div>
          <div><dt>{t('projects.details.cues')}</dt><dd>{Array.isArray(selectedProject?.cues) ? selectedProject.cues.filter((cue) => cue?.type !== 'marker').length : 0}</dd></div>
          <div className="projectDetailsLanguages">
            <dt>{t('projects.details.languages')}</dt>
            <dd>
              <span>{languages}</span>
              {onManageLanguages && selectedProject?.id ? (
                <button type="button" className="projectDetailsInlineAction" onClick={() => onManageLanguages(selectedProject.id)}>
                  {t('projects.details.manageLanguages')}
                </button>
              ) : null}
            </dd>
          </div>
          <div><dt>{t('projects.details.author')}</dt><dd>{getProjectAuthor(selectedProject) || '—'}</dd></div>
          <div><dt>{t('projects.details.version')}</dt><dd>{selectedProject?.version || '0.4.17'}</dd></div>
        </dl>
        <button type="button" className="primaryDesktopAction fullWidthAction" onClick={openSelectedProject}>
          <Play size={16} /> {t('projects.open')}
        </button>
        <button type="button" className="secondaryImportAction fullWidthAction" onClick={() => editProjectDetails?.(selectedProject?.id)}>
          <Edit3 size={16} /> {t('projects.editDetails')}
        </button>
      </aside>

      <ProjectActionsModal
        project={actionsProject}
        currentProjectId={currentProjectId}
        onClose={() => setActionsProjectId(null)}
        onDetails={() => { if (actionsProject?.id) setSelectedProjectId(actionsProject.id); }}
        editProjectDetails={editProjectDetails}
        onManageLanguages={onManageLanguages}
        exportProject={exportProject}
        duplicateProject={duplicateProject}
        deleteProject={deleteProject}
        updateProjectCover={updateProjectCover}
      />
    </div>
  );
}
