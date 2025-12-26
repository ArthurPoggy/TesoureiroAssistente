import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useFiles(showToast, handleError) {
  const { apiFetch, authToken } = useAuth();
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [fileForm, setFileForm] = useState({ name: '', file: null });
  const [fileUploading, setFileUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadFiles = useCallback(async () => {
    try {
      setFilesLoading(true);
      const data = await apiFetch('/api/files');
      setFiles(data.files || []);
    } catch (error) {
      handleError(error);
    } finally {
      setFilesLoading(false);
    }
  }, [apiFetch, handleError]);

  const handleFileUpload = useCallback(async (event) => {
    event.preventDefault();
    if (!fileForm.file) {
      showToast('Selecione um arquivo', 'error');
      return;
    }
    try {
      setFileUploading(true);
      const formData = new FormData();
      formData.append('file', fileForm.file);
      if (fileForm.name) {
        formData.append('name', fileForm.name);
      }
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      if (!response.ok) {
        const message = await response.text();
        let errorMessage = message;
        try {
          const parsed = JSON.parse(message);
          errorMessage = parsed.message || message;
        } catch {
          // keep raw message
        }
        throw new Error(errorMessage || 'Falha ao enviar arquivo');
      }
      const data = await response.json();
      setFiles((prev) => (data.file ? [data.file, ...prev] : prev));
      setFileForm({ name: '', file: null });
      setFileInputKey((value) => value + 1);
      showToast('Arquivo enviado');
    } catch (error) {
      handleError(error);
    } finally {
      setFileUploading(false);
    }
  }, [authToken, fileForm, handleError, showToast]);

  return {
    files,
    filesLoading,
    fileForm,
    setFileForm,
    fileUploading,
    fileInputKey,
    loadFiles,
    handleFileUpload
  };
}
