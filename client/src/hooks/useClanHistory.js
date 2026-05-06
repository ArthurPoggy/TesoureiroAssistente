import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadDriveFile } from '../services/api';

const emptyForm = () => ({
  title: '',
  description: '',
  eventDate: new Date().toISOString().slice(0, 10),
  attachmentName: '',
  attachmentFile: null,
  attachmentId: null,
  attachmentUrl: null
});

export function useClanHistory(showToast, handleError) {
  const { apiFetch, authToken } = useAuth();
  const [records, setRecords] = useState([]);
  const [historyForm, setHistoryForm] = useState(emptyForm());
  const [editingHistoryId, setEditingHistoryId] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadRecords = useCallback(async () => {
    try {
      const data = await apiFetch('/api/clan-history');
      setRecords(data.records || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetHistoryForm = useCallback(() => {
    setHistoryForm(emptyForm());
    setFileInputKey((k) => k + 1);
    setEditingHistoryId(null);
  }, []);

  const handleHistorySubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      let attachmentId = historyForm.attachmentId;
      let attachmentName = historyForm.attachmentName || null;
      let attachmentUrl = historyForm.attachmentUrl;

      if (historyForm.attachmentFile) {
        const [yearPart] = (historyForm.eventDate || new Date().toISOString().slice(0, 10)).split('-');
        const uploadResponse = await uploadDriveFile(
          historyForm.attachmentFile,
          historyForm.attachmentName,
          authToken,
          {
            module: 'Historia',
            year: yearPart,
            label: historyForm.title || 'registro'
          }
        );
        const uploaded = uploadResponse?.file;
        attachmentId = uploaded?.id || null;
        attachmentName = uploaded?.name || historyForm.attachmentName || null;
        attachmentUrl = uploaded?.webViewLink || uploaded?.webContentLink || null;
      }

      const payload = {
        title: historyForm.title,
        description: historyForm.description,
        eventDate: historyForm.eventDate,
        attachmentId,
        attachmentName,
        attachmentUrl
      };

      const endpoint = editingHistoryId ? `/api/clan-history/${editingHistoryId}` : '/api/clan-history';
      const method = editingHistoryId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await loadRecords();
      resetHistoryForm();
      showToast(editingHistoryId ? 'Registro atualizado' : 'Registro adicionado');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, authToken, editingHistoryId, historyForm, handleError, loadRecords, resetHistoryForm, showToast]);

  const handleHistoryDelete = useCallback(async (id) => {
    if (!window.confirm('Remover este registro?')) return;
    try {
      await apiFetch(`/api/clan-history/${id}`, { method: 'DELETE' });
      await loadRecords();
      showToast('Registro removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadRecords, showToast]);

  const startEditHistory = useCallback((record) => {
    setHistoryForm({
      title: record.title,
      description: record.description || '',
      eventDate: record.event_date,
      attachmentName: record.attachment_name || '',
      attachmentFile: null,
      attachmentId: record.attachment_id || null,
      attachmentUrl: record.attachment_url || null
    });
    setEditingHistoryId(record.id);
    setFileInputKey((k) => k + 1);
  }, []);

  return {
    records,
    historyForm,
    setHistoryForm,
    editingHistoryId,
    fileInputKey,
    loadRecords,
    resetHistoryForm,
    handleHistorySubmit,
    handleHistoryDelete,
    startEditHistory
  };
}
