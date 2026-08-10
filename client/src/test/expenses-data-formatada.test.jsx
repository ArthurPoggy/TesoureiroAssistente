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
    notes: '', tagIds: [], attachmentName: '', attachmentFile: null
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

const expenses = [
  { id: 1, expense_date: '2026-08-09', title: 'Compra de material', amount: 150, category: 'Material', notes: '' }
];

describe('ExpensesPanel — coluna de data formatada em pt-BR', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe a data da despesa no formato dd/mm/aaaa em vez do ISO cru', () => {
    const { getByText, queryByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );
    expect(getByText('09/08/2026')).toBeInTheDocument();
    expect(queryByText('2026-08-09')).not.toBeInTheDocument();
  });
});
