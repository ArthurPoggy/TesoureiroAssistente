import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { runRequest } from '../utils/hookRequests';

export function useTags(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [tags, setTags] = useState([]);

  const loadTags = useCallback(async () => {
    await runRequest(handleError, async () => {
      const data = await apiFetch('/api/tags');
      setTags(data.tags || []);
    });
  }, [apiFetch, handleError]);

  const createTag = useCallback(async (name) => {
    const created = await runRequest(handleError, async () => {
      const data = await apiFetch('/api/tags', {
        method: 'POST',
        body: { name }
      });
      setTags((prev) => {
        if (prev.some((t) => t.id === data.tag.id)) return prev;
        return [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name));
      });
      // Quem sabe se a tag foi criada ou reaproveitada é a API: a lista local
      // pode não conter uma tag que já existe no banco.
      showToast(data.created === false ? 'Tag já existe, selecionada' : 'Tag criada');
      return data.tag;
    });
    return created ?? null;
  }, [apiFetch, handleError, showToast]);

  const deleteTag = useCallback(async (id) => {
    await runRequest(handleError, async () => {
      await apiFetch(`/api/tags/${id}`, { method: 'DELETE' });
      setTags((prev) => prev.filter((t) => t.id !== id));
      showToast('Tag removida');
    });
  }, [apiFetch, handleError, showToast]);

  return { tags, loadTags, createTag, deleteTag };
}
