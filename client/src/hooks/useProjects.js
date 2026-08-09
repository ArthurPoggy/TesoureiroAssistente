import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

const FILTERS_STORAGE_KEY = 'tesoureiro_project_filters';
const DEBOUNCE_MS = 300;

const DEFAULT_FILTERS = {
  filterName: '',
  filterStatus: '',
  filterStartDate: '',
  filterEndDate: '',
  filterMemberId: ''
};

function loadStoredFilters() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function persistFilters(filters) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignora erro de quota
  }
}

export function useProjects(showToast, handleError) {
  const { apiFetch, authToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: '',
    data_inicio: '',
    data_fim_planejada: '',
    tagIds: []
  });
  const [editingProjectId, setEditingProjectId] = useState(null);

  const stored = useMemo(loadStoredFilters, []);
  const [filterName, setFilterName] = useState(stored.filterName);
  const [filterStatus, setFilterStatus] = useState(stored.filterStatus);
  const [filterStartDate, setFilterStartDate] = useState(stored.filterStartDate);
  const [filterEndDate, setFilterEndDate] = useState(stored.filterEndDate);
  const [filterMemberId, setFilterMemberId] = useState(stored.filterMemberId);

  // Debounce no campo de nome para evitar request a cada keystroke
  const [debouncedName, setDebouncedName] = useState(stored.filterName);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(filterName), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterName]);

  // Persistência (debounced 500ms para evitar gravar a cada keystroke)
  useEffect(() => {
    const t = setTimeout(() => {
      persistFilters({
        filterName,
        filterStatus,
        filterStartDate,
        filterEndDate,
        filterMemberId
      });
    }, 500);
    return () => clearTimeout(t);
  }, [filterName, filterStatus, filterStartDate, filterEndDate, filterMemberId]);

  const activeFiltersCount = useMemo(() => {
    return [filterName, filterStatus, filterStartDate, filterEndDate, filterMemberId]
      .filter((v) => v !== '' && v !== null && v !== undefined).length;
  }, [filterName, filterStatus, filterStartDate, filterEndDate, filterMemberId]);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(debouncedName ? { name: debouncedName } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(filterStartDate ? { startDate: filterStartDate } : {}),
        ...(filterEndDate ? { endDate: filterEndDate } : {}),
        ...(filterMemberId ? { memberId: filterMemberId } : {})
      });
      const query = params.toString();
      const data = await apiFetch(query ? `/api/projects?${query}` : '/api/projects');
      setProjects(data.projects || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, handleError, debouncedName, filterStatus, filterStartDate, filterEndDate, filterMemberId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleFilterNameChange = useCallback((val) => setFilterName(val), []);
  const handleFilterStatusChange = useCallback((val) => setFilterStatus(val), []);
  const handleFilterStartDateChange = useCallback((val) => setFilterStartDate(val), []);
  const handleFilterEndDateChange = useCallback((val) => setFilterEndDate(val), []);
  const handleFilterMemberIdChange = useCallback((val) => setFilterMemberId(val), []);

  const clearAllFilters = useCallback(() => {
    setFilterName('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterMemberId('');
  }, []);

  const resetProjectForm = useCallback(() => {
    setProjectForm({
      name: '',
      description: '',
      status: 'active',
      start_date: '',
      end_date: '',
      data_inicio: '',
      data_fim_planejada: '',
      tagIds: []
    });
    setEditingProjectId(null);
  }, []);

  const updateProjectDates = useCallback(async (projectId, { data_inicio, data_fim_planejada }) => {
    await apiFetch(`/api/projects/${projectId}/dates`, {
      method: 'PUT',
      body: JSON.stringify({ data_inicio: data_inicio || null, data_fim_planejada: data_fim_planejada || null })
    });
  }, [apiFetch]);

  const handleProjectSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { data_inicio, data_fim_planejada, ...projectFields } = projectForm;
      const endpoint = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';
      const data = await apiFetch(endpoint, { method, body: JSON.stringify(projectFields) });
      const projectId = editingProjectId || data?.project?.id;
      // Ao editar, sempre sincroniza o cronograma previsto (permite limpar as datas);
      // ao criar, só chama o endpoint se o usuário informou alguma data prevista.
      if (projectId && (editingProjectId || data_inicio || data_fim_planejada)) {
        await updateProjectDates(projectId, { data_inicio, data_fim_planejada });
      }
      await loadProjects();
      resetProjectForm();
      showToast(editingProjectId ? 'Projeto atualizado' : 'Projeto criado');
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
    }
  }, [apiFetch, editingProjectId, projectForm, handleError, loadProjects, resetProjectForm, showToast, updateProjectDates]);

  const handleProjectDelete = useCallback(async (id) => {
    if (!window.confirm('Excluir este projeto?')) return;
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      await loadProjects();
      showToast('Projeto removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const startEditProject = useCallback((project) => {
    setProjectForm({
      name: project.name,
      description: project.description || '',
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      data_inicio: project.data_inicio || '',
      data_fim_planejada: project.data_fim_planejada || '',
      tagIds: (project.tags || []).map((t) => t.id)
    });
    setEditingProjectId(project.id);
  }, []);

  const addMemberToProject = useCallback(async (projectId, memberId) => {
    try {
      await apiFetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberId })
      });
      await loadProjects();
      showToast('Membro adicionado ao projeto');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const removeMemberFromProject = useCallback(async (projectId, memberId) => {
    try {
      await apiFetch(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' });
      await loadProjects();
      showToast('Membro removido do projeto');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const addMilestoneToProject = useCallback(async (projectId, { titulo, data_prevista }) => {
    try {
      await apiFetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ titulo, data_prevista })
      });
      await loadProjects();
      showToast('Marco adicionado ao cronograma');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const removeMilestoneFromProject = useCallback(async (projectId, milestoneId) => {
    try {
      await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, { method: 'DELETE' });
      await loadProjects();
      showToast('Marco removido do cronograma');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const toggleMilestoneCompletion = useCallback(async (projectId, milestoneId, concluido) => {
    try {
      await apiFetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'PUT',
        body: JSON.stringify({ concluido })
      });
      await loadProjects();
      showToast(concluido ? 'Marco concluído' : 'Marco reaberto');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  const uploadProjectFiles = useCallback(async (projectId, files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers,
        body: formData
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Falha ao enviar arquivo');
      }
      await loadProjects();
      showToast('Arquivo(s) enviado(s)');
    } catch (error) {
      handleError(error);
    }
  }, [authToken, handleError, loadProjects, showToast]);

  const removeProjectFile = useCallback(async (projectId, fileId) => {
    try {
      await apiFetch(`/api/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
      await loadProjects();
      showToast('Anexo removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadProjects, showToast]);

  return {
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
    updateProjectDates,
    addMemberToProject,
    removeMemberFromProject,
    addMilestoneToProject,
    removeMilestoneFromProject,
    toggleMilestoneCompletion,
    uploadProjectFiles,
    removeProjectFile,
    filterName,
    filterStatus,
    filterStartDate,
    filterEndDate,
    filterMemberId,
    activeFiltersCount,
    onFilterNameChange: handleFilterNameChange,
    onFilterStatusChange: handleFilterStatusChange,
    onFilterStartDateChange: handleFilterStartDateChange,
    onFilterEndDateChange: handleFilterEndDateChange,
    onFilterMemberIdChange: handleFilterMemberIdChange,
    onClearFilters: clearAllFilters
  };
}
