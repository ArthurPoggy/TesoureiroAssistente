import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useTags(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [tags, setTags] = useState([]);

  const loadTags = useCallback(async () => {
    try {
      const data = await apiFetch('/api/tags');
      setTags(data.tags || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const createTag = useCallback(async (name) => {
    try {
      const data = await apiFetch('/api/tags', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      setTags((prev) => {
        const exists = prev.some((t) => t.id === data.tag.id);
        if (exists) return prev;
        return [...prev, data.tag].sort((a, b) => a.name.localeCompare(b.name));
      });
      return data.tag;
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [apiFetch, handleError]);

  const deleteTag = useCallback(async (id) => {
    try {
      await apiFetch(`/api/tags/${id}`, { method: 'DELETE' });
      setTags((prev) => prev.filter((t) => t.id !== id));
      showToast('Tag removida');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, showToast]);

  return { tags, loadTags, createTag, deleteTag };
}
