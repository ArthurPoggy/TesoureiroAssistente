import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useProjects(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    status: 'active',
    start_date: '',
    end_date: ''
  });
  const [editingProjectId, setEditingProjectId] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await apiFetch('/api/projects');
      setProjects(data.projects || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetProjectForm = useCallback(() => {
    setProjectForm({ name: '', description: '', status: 'active', start_date: '', end_date: '' });
    setEditingProjectId(null);
  }, []);

  const handleProjectSubmit = useCallback(async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const endpoint = editingProjectId ? `/api/projects/${editingProjectId}` : '/api/projects';
      const method = editingProjectId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(projectForm) });
      await loadProjects();
      resetProjectForm();
      showToast(editingProjectId ? 'Projeto atualizado' : 'Projeto criado');
    } catch (error) {
      handleError(error);
    } finally {
      setSaving(false);
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
      status: project.status,
      start_date: project.start_date || '',
      end_date: project.end_date || ''
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
    removeMemberFromProject
  };
}
