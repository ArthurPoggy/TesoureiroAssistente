import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');

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

describe('ExpensesPanel — coluna forma de pagamento na listagem', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe o rótulo legível da forma de pagamento na linha da despesa', () => {
    const expenses = [
      {
        id: 1,
        expense_date: '2026-01-10',
        title: 'Combustível',
        amount: 100,
        category: 'Transporte',
        tags: [],
        payment_method: 'pix'
      }
    ];
    const { getByRole } = render(<ExpensesPanel {...baseProps} expenses={expenses} />);
    const row = getByRole('row', { name: /Combustível/ });
    expect(row).toHaveTextContent('PIX');
  });

  it('renderiza sem erro e com fallback quando a despesa não tem payment_method (registro legado)', () => {
    const expenses = [
      {
        id: 2,
        expense_date: '2026-01-05',
        title: 'Despesa antiga',
        amount: 50,
        category: 'Material',
        tags: []
      }
    ];
    const { getByRole } = render(<ExpensesPanel {...baseProps} expenses={expenses} />);
    const row = getByRole('row', { name: /Despesa antiga/ });
    expect(row).toHaveTextContent('—');
  });
});
