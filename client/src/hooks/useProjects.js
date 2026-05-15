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
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'active' });
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
    setProjectForm({ name: '', description: '', status: 'active' });
    setEditingProjectId(null);
  }, []);

  const handleProjectSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      const endpoint = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(projectForm) });
      await loadProjects();
      resetProjectForm();
      showToast(editingProjectId ? 'Projeto atualizado' : 'Projeto criado');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, editingProjectId, projectForm, handleError, loadProjects, resetProjectForm, showToast]);

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
      status: project.status
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

  return {
    projects,
    loading,
    projectForm,
    setProjectForm,
    editingProjectId,
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
    onFilterNameChange: handleFilterNameChange,
    onFilterStatusChange: handleFilterStatusChange,
    onFilterStartDateChange: handleFilterStartDateChange,
    onFilterEndDateChange: handleFilterEndDateChange,
    onFilterMemberIdChange: handleFilterMemberIdChange,
    onClearFilters: clearAllFilters
  };
}
