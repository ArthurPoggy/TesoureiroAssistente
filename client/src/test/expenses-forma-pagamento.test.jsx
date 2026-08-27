import { render, fireEvent } from '@testing-library/react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');
const { useExpenses } = await import('../hooks/useExpenses');

const baseProps = {
  expenseForm: {
    title: '', amount: '', expenseDate: '', category: '', eventId: '',
    notes: '', tagIds: [], attachmentName: '', attachmentFile: null,
    paymentMethod: ''
  },
  setExpenseForm: vi.fn(),
  editingExpenseId: null,
  fileInputKey: 'key',
  events: [],
  tags: [],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

describe('ExpensesPanel — campo forma de pagamento', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('renderiza o select "Forma de pagamento" com as opções fixas do backend', () => {
    const { getByLabelText } = render(<ExpensesPanel {...baseProps} expenses={[]} />);
    const select = getByLabelText('Forma de pagamento');
    expect(select).toBeInTheDocument();
    const optionValues = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toEqual(expect.arrayContaining(['dinheiro', 'pix', 'cartao', 'transferencia', 'outro']));
  });

  it('atualiza expenseForm.paymentMethod ao selecionar uma opção', () => {
    const setExpenseForm = vi.fn();
    const { getByLabelText } = render(
      <ExpensesPanel {...baseProps} expenses={[]} setExpenseForm={setExpenseForm} />
    );
    fireEvent.change(getByLabelText('Forma de pagamento'), { target: { value: 'pix' } });
    expect(setExpenseForm).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'pix' })
    );
  });
});

describe('useExpenses — envio de payment_method no payload', () => {
  let apiFetch;
  const noop = () => {};

  beforeEach(() => {
    apiFetch = vi.fn().mockResolvedValue({ expenses: [] });
    mockUseAuth.mockReturnValue({ apiFetch, authToken: 'token' });
  });

  it('inclui paymentMethod vazio por padrão no formulário', () => {
    const { result } = renderHook(() => useExpenses(noop, noop));
    expect(result.current.expenseForm).toMatchObject({ paymentMethod: '' });
  });

  it('envia paymentMethod selecionado no payload ao editar uma despesa existente', async () => {
    const { result } = renderHook(() => useExpenses(noop, noop));

    act(() => {
      result.current.startEditExpense({
        id: 10,
        title: 'Combustível',
        amount: 100,
        expense_date: '2026-01-10',
        category: 'Transporte',
        notes: '',
        tags: [],
        attachment_name: 'nota.pdf',
        attachment_id: 'abc',
        attachment_url: 'http://drive/abc',
        payment_method: 'cartao'
      });
    });

    expect(result.current.expenseForm).toMatchObject({ paymentMethod: 'cartao' });

    act(() => {
      result.current.setExpenseForm({ ...result.current.expenseForm, paymentMethod: 'pix' });
    });

    await act(async () => {
      await result.current.handleExpenseSubmit({ preventDefault: noop });
    });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/expenses/10',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    const call = apiFetch.mock.calls.find(([url]) => url === '/api/expenses/10');
    const sentBody = JSON.parse(call[1].body);
    expect(sentBody.paymentMethod).toBe('pix');
  });

  it('não bloqueia o submit quando paymentMethod está vazio (campo opcional)', async () => {
    const { result } = renderHook(() => useExpenses(noop, noop));

    act(() => {
      result.current.startEditExpense({
        id: 11,
        title: 'Material',
        amount: 50,
        expense_date: '2026-01-11',
        category: 'Material',
        notes: '',
        tags: [],
        attachment_name: 'nota2.pdf',
        attachment_id: 'def',
        attachment_url: 'http://drive/def',
        payment_method: null
      });
    });

    expect(result.current.expenseForm.paymentMethod).toBe('');

    await act(async () => {
      await result.current.handleExpenseSubmit({ preventDefault: noop });
    });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/expenses/11',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
