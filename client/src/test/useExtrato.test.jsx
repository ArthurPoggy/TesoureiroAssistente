import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExtrato } from '../hooks/useExtrato';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

// Cobre a subtask "Backend: paginação no GET /api/extrato" no lado do hook:
// useExtrato precisa repassar page/pageSize para a API, expor total/page/
// pageSize para o painel e voltar para a página 1 ao trocar filtro ou
// pageSize — mesmo contrato de usePayments.
describe('useExtrato — paginação', () => {
  let apiFetch;

  beforeEach(() => {
    apiFetch = vi.fn().mockResolvedValue({
      entries: [],
      summary: { totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 },
      total: 0
    });
    useAuth.mockReturnValue({ apiFetch, authToken: 'token' });
  });

  it('inclui page e pageSize na querystring ao carregar o extrato', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      await result.current.loadExtrato();
    });

    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('page=1'));
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('pageSize=25'));
  });

  it('onPageChange atualiza a página e refaz a chamada com a nova página', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      result.current.onPageChange(3);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(3);
    });
    expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('page=3'));
  });

  it('onPageSizeChange volta para a página 1 e usa o novo pageSize', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      result.current.onPageChange(2);
    });
    await waitFor(() => expect(result.current.page).toBe(2));

    await act(async () => {
      result.current.onPageSizeChange('50');
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(50);
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      expect.stringMatching(/page=1.*pageSize=50|pageSize=50.*page=1/)
    );
  });

  it('loadExtrato sem página explícita (ex.: reenvio do formulário de filtros) volta para a página 1', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      result.current.onPageChange(3);
    });
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => {
      result.current.setFilters({ startDate: '', endDate: '', type: 'despesa', memberId: '' });
    });

    await act(async () => {
      await result.current.loadExtrato();
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
    expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('type=despesa'));
    expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'));
  });

  it('expõe total, page e pageSize retornados pela API', async () => {
    apiFetch.mockResolvedValueOnce({
      entries: [{ date: '2024-01-01' }],
      summary: { totalIncome: 10, totalExpense: 0, netBalance: 10, count: 1 },
      total: 42
    });
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      await result.current.loadExtrato();
    });

    expect(result.current.total).toBe(42);
    expect(result.current.entries).toHaveLength(1);
  });

  // Subtask "Hook useExtrato: estado e chamada paginada": o hook precisa
  // expor `setPage` diretamente (mesmo contrato de usePayments, que expõe
  // `setPage` além dos handlers), não só o handler `onPageChange`.
  it('expõe setPage e atualiza a página imediatamente ao chamá-lo', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    expect(typeof result.current.setPage).toBe('function');

    act(() => {
      result.current.setPage(5);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(5);
    });
  });

  // Trocar qualquer filtro deve resetar a página para 1 no mesmo momento em
  // que o filtro muda — igual aos handlers onFilterMonthChange/
  // onFilterYearChange/onFilterMemberChange de usePayments, que chamam
  // setPage(1) junto com a mudança do filtro, sem depender de um recarga
  // subsequente para "corrigir" a página.
  it('resetar a página para 1 ao mudar um filtro via setFilters, antes mesmo de recarregar', async () => {
    const { result } = renderHook(() => useExtrato(noop, true));

    await act(async () => {
      result.current.onPageChange(3);
    });
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => {
      result.current.setFilters({ startDate: '', endDate: '', type: 'despesa', memberId: '' });
    });

    await waitFor(() => {
      expect(result.current.page).toBe(1);
    });
  });
});
