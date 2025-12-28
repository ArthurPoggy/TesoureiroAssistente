import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadDriveFile } from '../services/api';

export function useExpenses(showToast, handleError) {
  const { apiFetch, authToken } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: '',
    notes: '',
    eventId: '',
    attachmentName: '',
    attachmentFile: null,
    attachmentId: null,
    attachmentUrl: null
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

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
      eventId: '',
      attachmentName: '',
      attachmentFile: null,
      attachmentId: null,
      attachmentUrl: null
    });
    setFileInputKey((value) => value + 1);
    setEditingExpenseId(null);
  }, []);

  const handleExpenseSubmit = useCallback(async (event, refreshCallbacks = []) => {
    event.preventDefault();
    if (!editingExpenseId && !expenseForm.attachmentFile) {
      showToast('Anexo é obrigatório', 'error');
      return;
    }
    try {
      let attachmentId = expenseForm.attachmentId;
      let attachmentName = expenseForm.attachmentName || null;
      let attachmentUrl = expenseForm.attachmentUrl;

      if (expenseForm.attachmentFile) {
        const uploadResponse = await uploadDriveFile(
          expenseForm.attachmentFile,
          expenseForm.attachmentName,
          authToken
        );
        const uploadedFile = uploadResponse?.file;
        attachmentId = uploadedFile?.id || null;
        attachmentName = uploadedFile?.name || expenseForm.attachmentName || null;
        attachmentUrl = uploadedFile?.webViewLink || uploadedFile?.webContentLink || null;
      }
      const payload = {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        notes: expenseForm.notes,
        eventId: expenseForm.eventId ? Number(expenseForm.eventId) : null,
        attachmentId,
        attachmentName,
        attachmentUrl
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
  }, [apiFetch, authToken, editingExpenseId, expenseForm, handleError, loadExpenses, resetExpenseForm, showToast]);

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
      eventId: expense.event_id || '',
      attachmentName: expense.attachment_name || '',
      attachmentFile: null,
      attachmentId: expense.attachment_id || null,
      attachmentUrl: expense.attachment_url || null
    });
    setEditingExpenseId(expense.id);
    setFileInputKey((value) => value + 1);
  }, []);

  return {
    expenses,
    expenseForm,
    setExpenseForm,
    editingExpenseId,
    fileInputKey,
    loadExpenses,
    resetExpenseForm,
    handleExpenseSubmit,
    handleExpenseDelete,
    startEditExpense
  };
}
