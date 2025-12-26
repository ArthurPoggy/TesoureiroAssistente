import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useGoals(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [goals, setGoals] = useState([]);
  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    description: ''
  });
  const [editingGoalId, setEditingGoalId] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      const data = await apiFetch('/api/goals');
      setGoals(data.goals || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetGoalForm = useCallback(() => {
    setGoalForm({ title: '', targetAmount: '', deadline: '', description: '' });
    setEditingGoalId(null);
  }, []);

  const handleGoalSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: goalForm.title,
        targetAmount: Number(goalForm.targetAmount),
        deadline: goalForm.deadline,
        description: goalForm.description
      };
      const endpoint = editingGoalId ? `/api/goals/${editingGoalId}` : '/api/goals';
      const method = editingGoalId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await loadGoals();
      resetGoalForm();
      showToast('Meta salva');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, editingGoalId, goalForm, handleError, loadGoals, resetGoalForm, showToast]);

  const handleGoalDelete = useCallback(async (id) => {
    if (!window.confirm('Excluir esta meta?')) return;
    try {
      await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
      await loadGoals();
      showToast('Meta removida');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadGoals, showToast]);

  const startEditGoal = useCallback((goal) => {
    setGoalForm({
      title: goal.title,
      targetAmount: goal.target_amount,
      deadline: goal.deadline || '',
      description: goal.description || ''
    });
    setEditingGoalId(goal.id);
  }, []);

  return {
    goals,
    goalForm,
    setGoalForm,
    editingGoalId,
    loadGoals,
    resetGoalForm,
    handleGoalSubmit,
    handleGoalDelete,
    startEditGoal
  };
}
