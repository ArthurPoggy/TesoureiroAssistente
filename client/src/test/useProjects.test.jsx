import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProjects } from '../hooks/useProjects';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

describe('useProjects — cronograma previsto (data_inicio / data_fim_planejada)', () => {
  let apiFetch;

  beforeEach(() => {
    apiFetch = vi.fn().mockResolvedValue({ projects: [] });
    useAuth.mockReturnValue({ apiFetch, authToken: 'token' });
  });

  it('inclui data_inicio e data_fim_planejada no formulário padrão e ao carregar um projeto para edição', () => {
    const { result } = renderHook(() => useProjects(noop, noop));

    expect(result.current.projectForm).toMatchObject({ data_inicio: '', data_fim_planejada: '' });

    act(() => {
      result.current.startEditProject({
        id: 5,
        name: 'Projeto X',
        status: 'active',
        data_inicio: '2026-01-01',
        data_fim_planejada: '2026-02-01',
        tags: []
      });
    });

    expect(result.current.projectForm).toMatchObject({
      data_inicio: '2026-01-01',
      data_fim_planejada: '2026-02-01'
    });
  });

  it('ao salvar edição, chama PUT /api/projects/:id/dates com as datas previstas', async () => {
    const { result } = renderHook(() => useProjects(noop, noop));

    act(() => {
      result.current.startEditProject({
        id: 5,
        name: 'Projeto X',
        status: 'active',
        data_inicio: '',
        data_fim_planejada: '',
        tags: []
      });
    });

    act(() => {
      result.current.setProjectForm({
        ...result.current.projectForm,
        data_inicio: '2026-03-01',
        data_fim_planejada: '2026-04-01'
      });
    });

    await act(async () => {
      await result.current.handleProjectSubmit({ preventDefault: noop });
    });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/projects/5/dates',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ data_inicio: '2026-03-01', data_fim_planejada: '2026-04-01' })
        })
      );
    });
  });

  it('updateProjectDates envia null quando as datas são limpas', async () => {
    const { result } = renderHook(() => useProjects(noop, noop));

    await act(async () => {
      await result.current.updateProjectDates(7, { data_inicio: '', data_fim_planejada: '' });
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/projects/7/dates',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ data_inicio: null, data_fim_planejada: null })
      })
    );
  });
});

describe('useProjects — uploadProjectFiles', () => {
  let apiFetch;
  let handleError;

  beforeEach(() => {
    apiFetch = vi.fn().mockResolvedValue({ projects: [] });
    handleError = vi.fn();
    useAuth.mockReturnValue({ apiFetch, authToken: 'token' });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('extrai a mensagem amigável do JSON de erro em vez de exibir o corpo cru', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ ok: false, message: 'Arquivo excede o tamanho máximo permitido' })
    });

    const { result } = renderHook(() => useProjects(noop, handleError));

    await act(async () => {
      await result.current.uploadProjectFiles(5, [new File(['a'], 'a.txt')]);
    });

    expect(handleError).toHaveBeenCalledTimes(1);
    const error = handleError.mock.calls[0][0];
    expect(error.message).toBe('Arquivo excede o tamanho máximo permitido');
  });

  it('mantém o texto cru quando a resposta de erro não é JSON', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      text: async () => 'Erro inesperado'
    });

    const { result } = renderHook(() => useProjects(noop, handleError));

    await act(async () => {
      await result.current.uploadProjectFiles(5, [new File(['a'], 'a.txt')]);
    });

    const error = handleError.mock.calls[0][0];
    expect(error.message).toBe('Erro inesperado');
  });
});
