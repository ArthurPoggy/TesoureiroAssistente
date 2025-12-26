import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useExpenses(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: '',
    notes: '',
    eventId: ''
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const loadExpenses = useCallback(async () => {
    try {
      const data = await apiFetch('/api/expenses');
      setExpenses(data.expenses || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetExpenseForm = useCallback(() => {
    setExpenseForm({
      title: '',
      amount: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      category: '',
      notes: '',
      eventId: ''
    });
    setEditingExpenseId(null);
  }, []);

  const handleExpenseSubmit = useCallback(async (event, refreshCallbacks = []) => {
    event.preventDefault();
    try {
      const payload = {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        notes: expenseForm.notes,
        eventId: expenseForm.eventId ? Number(expenseForm.eventId) : null
      };
      const endpoint = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = editingExpenseId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await Promise.all([loadExpenses(), ...refreshCallbacks.map(cb => cb())]);
      resetExpenseForm();
      showToast('Despesa registrada');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, editingExpenseId, expenseForm, handleError, loadExpenses, resetExpenseForm, showToast]);

  const handleExpenseDelete = useCallback(async (id, refreshCallbacks = []) => {
    if (!window.confirm('Remover esta despesa?')) return;
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      await Promise.all([loadExpenses(), ...refreshCallbacks.map(cb => cb())]);
      showToast('Despesa removida');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadExpenses, showToast]);

  const startEditExpense = useCallback((expense) => {
    setExpenseForm({
      title: expense.title,
      amount: expense.amount,
      expenseDate: expense.expense_date,
      category: expense.category || '',
      notes: expense.notes || '',
      eventId: expense.event_id || ''
    });
    setEditingExpenseId(expense.id);
  }, []);

  return {
    expenses,
    expenseForm,
    setExpenseForm,
    editingExpenseId,
    loadExpenses,
    resetExpenseForm,
    handleExpenseSubmit,
    handleExpenseDelete,
    startEditExpense
  };
}
