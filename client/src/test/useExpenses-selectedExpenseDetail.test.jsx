import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpenses } from '../hooks/useExpenses';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

// Cobre a subtask "Estado de seleção de despesa em useExpenses/ExpensesPage":
// useExpenses deve expor selectedExpenseDetail/setSelectedExpenseDetail
// seguindo o mesmo caminho já usado por selectedMemberDetail em useMembers,
// sem alterar o restante da interface pública do hook nem disparar chamadas
// de API novas (os dados da despesa já vêm completos na listagem existente).
describe('useExpenses — selectedExpenseDetail', () => {
  let apiFetch;

  beforeEach(() => {
    apiFetch = vi.fn().mockResolvedValue({ expenses: [] });
    useAuth.mockReturnValue({ apiFetch, authToken: 'token' });
  });

  it('inicia com selectedExpenseDetail nulo', () => {
    const { result } = renderHook(() => useExpenses(noop, noop, []));

    expect(result.current.selectedExpenseDetail).toBeNull();
    expect(typeof result.current.setSelectedExpenseDetail).toBe('function');
  });

  it('setSelectedExpenseDetail atualiza a despesa selecionada', () => {
    const { result } = renderHook(() => useExpenses(noop, noop, []));

    const expense = {
      id: 42,
      title: 'Material de acampamento',
      amount: 150.5,
      expense_date: '2026-08-01',
      category: 'Material',
      notes: 'Compra para o acampamento de agosto',
      event_id: 7,
      tags: []
    };

    act(() => {
      result.current.setSelectedExpenseDetail(expense);
    });

    expect(result.current.selectedExpenseDetail).toEqual(expense);

    act(() => {
      result.current.setSelectedExpenseDetail(null);
    });

    expect(result.current.selectedExpenseDetail).toBeNull();
  });

  it('não altera as demais chaves expostas pelo hook (sem regressão de interface pública)', () => {
    const { result } = renderHook(() => useExpenses(noop, noop, []));

    const expectedKeys = [
      'expenses',
      'expenseForm',
      'setExpenseForm',
      'editingExpenseId',
      'fileInputKey',
      'selectedExpenseDetail',
      'setSelectedExpenseDetail',
      'loadExpenses',
      'resetExpenseForm',
      'handleExpenseSubmit',
      'handleExpenseDelete',
      'startEditExpense'
    ];

    expect(Object.keys(result.current).sort()).toEqual(expectedKeys.sort());

    act(() => {
      result.current.setSelectedExpenseDetail({ id: 1 });
    });

    // Selecionar uma despesa não deve mexer nos demais dados/funções do hook.
    expect(result.current.expenses).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('limpa selectedExpenseDetail ao excluir a despesa selecionada', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    apiFetch.mockImplementation((url, options = {}) => {
      if (options.method === 'DELETE') return Promise.resolve({});
      return Promise.resolve({ expenses: [] });
    });

    const { result } = renderHook(() => useExpenses(noop, noop, []));

    const expense = {
      id: 42,
      title: 'Material de acampamento',
      amount: 150.5,
      expense_date: '2026-08-01',
      category: 'Material',
      notes: '',
      event_id: null,
      tags: []
    };

    act(() => {
      result.current.setSelectedExpenseDetail(expense);
    });
    expect(result.current.selectedExpenseDetail).toEqual(expense);

    await act(async () => {
      await result.current.handleExpenseDelete(42, []);
    });

    // Ao excluir a despesa que está com o detalhe aberto, o detalhe deve
    // ser limpo — do contrário ExpenseDetailView continua renderizado
    // mostrando dados de uma despesa que não existe mais.
    expect(result.current.selectedExpenseDetail).toBeNull();
  });
});
