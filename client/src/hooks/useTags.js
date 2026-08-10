import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { runRequest } from '../utils/hookRequests';

export function useTags(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [tags, setTags] = useState([]);
  const tagsRef = useRef(tags);

  const updateTags = useCallback((nextTags) => {
    tagsRef.current = nextTags;
    setTags(nextTags);
  }, []);

  const loadTags = useCallback(async () => {
    await runRequest(handleError, async () => {
      const data = await apiFetch('/api/tags');
      updateTags(data.tags || []);
    });
  }, [apiFetch, handleError, updateTags]);

  const createTag = useCallback(async (name) => {
    return runRequest(handleError, async () => {
      const data = await apiFetch('/api/tags', {
        method: 'POST',
        body: { name }
      });
      const alreadyExisted = tagsRef.current.some((t) => t.id === data.tag.id);
      if (!alreadyExisted) {
        updateTags([...tagsRef.current, data.tag].sort((a, b) => a.name.localeCompare(b.name)));
      }
      showToast(alreadyExisted ? 'Tag já existe, selecionada' : 'Tag criada');
      return data.tag;
    });
  }, [apiFetch, handleError, showToast, updateTags]);

  const deleteTag = useCallback(async (id) => {
    await runRequest(handleError, async () => {
      await apiFetch(`/api/tags/${id}`, { method: 'DELETE' });
      updateTags(tagsRef.current.filter((t) => t.id !== id));
      showToast('Tag removida');
    });
  }, [apiFetch, handleError, showToast, updateTags]);

  return { tags, loadTags, createTag, deleteTag };
}
