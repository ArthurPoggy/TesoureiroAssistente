import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTags } from '../hooks/useTags';

// Cobre a subtask "Conectar TagSelector a useTags.createTag via
// ExpensesPage/ExpensesPanel": useTags.createTag deve usar o util
// compartilhado runRequest (client/src/utils/hookRequests.js) em vez do
// try/catch manual, mantendo a interface pública do hook — ainda retorna a
// tag criada em caso de sucesso e `undefined` (não `null`) em caso de erro,
// que é o contrato de runRequest.

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

describe('useTags.createTag', () => {
  let apiFetch;
  let handleError;
  let showToast;

  beforeEach(() => {
    apiFetch = vi.fn();
    handleError = vi.fn();
    showToast = vi.fn();
    useAuth.mockReturnValue({ apiFetch });
  });

  it('retorna a tag criada e a adiciona à lista quando a API tem sucesso', async () => {
    apiFetch.mockResolvedValue({ tag: { id: 3, name: 'Transporte' } });
    const { result } = renderHook(() => useTags(showToast, handleError));

    let created;
    await act(async () => {
      created = await result.current.createTag('Transporte');
    });

    expect(created).toEqual({ id: 3, name: 'Transporte' });
    expect(result.current.tags).toEqual([{ id: 3, name: 'Transporte' }]);
    expect(handleError).not.toHaveBeenCalled();
  });

  it('retorna undefined (não null) e encaminha o erro para handleError quando a API falha', async () => {
    const error = new Error('falha de rede');
    apiFetch.mockRejectedValue(error);
    const { result } = renderHook(() => useTags(showToast, handleError));

    let created;
    await act(async () => {
      created = await result.current.createTag('Transporte');
    });

    expect(created).toBeUndefined();
    expect(handleError).toHaveBeenCalledWith(error);
  });
});
