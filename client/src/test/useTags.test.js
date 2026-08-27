import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTags } from '../hooks/useTags';

// Cobre a subtask "Conectar TagSelector a useTags.createTag via
// ExpensesPage/ExpensesPanel": useTags.createTag deve usar o util
// compartilhado runRequest (client/src/utils/hookRequests.js) em vez do
// try/catch manual, mantendo a interface pública do hook: ainda retorna a
// tag criada em caso de sucesso e `null` em caso de erro, como antes do
// refactor (runRequest devolve `undefined`, normalizado no hook).

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
    apiFetch.mockResolvedValue({ tag: { id: 3, name: 'Transporte' }, created: true });
    const { result } = renderHook(() => useTags(showToast, handleError));

    let created;
    await act(async () => {
      created = await result.current.createTag('Transporte');
    });

    expect(created).toEqual({ id: 3, name: 'Transporte' });
    expect(result.current.tags).toEqual([{ id: 3, name: 'Transporte' }]);
    expect(handleError).not.toHaveBeenCalled();
  });

  it('retorna null e encaminha o erro para handleError quando a API falha', async () => {
    const error = new Error('falha de rede');
    apiFetch.mockRejectedValue(error);
    const { result } = renderHook(() => useTags(showToast, handleError));

    let created;
    await act(async () => {
      created = await result.current.createTag('Transporte');
    });

    expect(created).toBeNull();
    expect(handleError).toHaveBeenCalledWith(error);
  });

  // Subtask "Feedback de sucesso/duplicidade ao criar tag na despesa": ao
  // criar a tag com sucesso pelo fluxo inline, useTags.createTag deve exibir
  // uma confirmação via showToast, no mesmo padrão já usado por deleteTag.
  it('exibe showToast de confirmação ao criar a tag com sucesso', async () => {
    apiFetch.mockResolvedValue({ tag: { id: 3, name: 'Transporte' }, created: true });
    const { result } = renderHook(() => useTags(showToast, handleError));

    await act(async () => {
      await result.current.createTag('Transporte');
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/tag/i));
  });

  // O backend responde a nomes duplicados (COLLATE NOCASE) devolvendo a tag
  // já existente em vez de erro. O hook deve reaproveitar essa tag — sem
  // duplicá-la na lista local e sem acionar handleError — para que o
  // TagSelector apenas marque a tag existente como selecionada.
  it('submeter nome de tag já existente reutiliza a tag sem duplicar a lista nem mostrar erro', async () => {
    const existingTag = { id: 1, name: 'Acampamento' };
    apiFetch.mockResolvedValueOnce({ tag: existingTag, created: true });
    const { result } = renderHook(() => useTags(showToast, handleError));

    // Estado inicial já contém a tag (ex.: carregada via loadTags).
    await act(async () => {
      await result.current.createTag('Acampamento');
    });
    expect(result.current.tags).toEqual([existingTag]);

    // Submeter o mesmo nome novamente (nome já existente no backend) não
    // deve criar uma segunda entrada na lista. A API sinaliza o reaproveitamento
    // com `created: false`.
    apiFetch.mockResolvedValueOnce({ tag: existingTag, created: false });
    let secondCreated;
    await act(async () => {
      secondCreated = await result.current.createTag('acampamento');
    });

    expect(secondCreated).toEqual(existingTag);
    expect(result.current.tags).toEqual([existingTag]);
    expect(result.current.tags.length).toBe(1);
    expect(handleError).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenLastCalledWith(expect.stringMatching(/já existe/i));
  });
});
