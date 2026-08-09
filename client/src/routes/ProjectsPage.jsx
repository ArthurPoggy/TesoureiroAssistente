import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProjects, useTags, useToast } from '../hooks';
import { useSharedData } from '../contexts/SharedDataContext';
import { Toast } from '../components';

// Painel de projetos carregado sob demanda (rota dedicada /projetos).
const ProjectsPanel = lazy(() =>
  import('../components/projects/ProjectsPanel').then((mod) => ({ default: mod.ProjectsPanel }))
);

// Rota /projetos: cadastro, filtros e vínculo de membros a projetos,
// isolados em sua própria rota. O hook useProjects segue funcionando como
// antes; membros vêm de SharedDataContext (já carregados ao entrar na área
// autenticada, ver AppLayout) e tags são carregadas aqui apenas para
// alimentar os seletores do formulário.
export function ProjectsPage() {
  const { authToken, authChecked } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const { members } = useSharedData();
  const { tags, loadTags } = useTags(showToast, handleError);

  const {
    projects,
    loading,
    projectForm,
    setProjectForm,
    editingProjectId,
    saving,
    loadProjects,
    resetProjectForm,
    handleProjectSubmit,
    handleProjectDelete,
    startEditProject,
    addMemberToProject,
    removeMemberFromProject,
    filterName,
    filterStatus,
    filterStartDate,
    filterEndDate,
    filterMemberId,
    activeFiltersCount,
    onFilterNameChange,
    onFilterStatusChange,
    onFilterStartDateChange,
    onFilterEndDateChange,
    onFilterMemberIdChange,
    onClearFilters
  } = useProjects(showToast, handleError);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadTags();
    loadProjects();
  }, [authToken, authChecked, loadTags, loadProjects]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <ProjectsPanel
          projects={projects}
          loading={loading}
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          editingProjectId={editingProjectId}
          members={members}
          saving={saving}
          onSubmit={handleProjectSubmit}
          onDelete={handleProjectDelete}
          onEdit={startEditProject}
          onReset={resetProjectForm}
          onAddMember={addMemberToProject}
          onRemoveMember={removeMemberFromProject}
          filterName={filterName}
          filterStatus={filterStatus}
          filterStartDate={filterStartDate}
          filterEndDate={filterEndDate}
          filterMemberId={filterMemberId}
          activeFiltersCount={activeFiltersCount}
          onFilterNameChange={onFilterNameChange}
          onFilterStatusChange={onFilterStatusChange}
          onFilterStartDateChange={onFilterStartDateChange}
          onFilterEndDateChange={onFilterEndDateChange}
          onFilterMemberIdChange={onFilterMemberIdChange}
          onClearFilters={onClearFilters}
          tags={tags}
        />
      </Suspense>
    </div>
  );
}
