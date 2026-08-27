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
  selectedExpenseDetail: null,
  setSelectedExpenseDetail: vi.fn(),
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

const expenses = [
  { id: 1, expense_date: '2024-01-15', title: 'Compra de material', amount: 150, category: 'Material', notes: '' }
];

// Cobre a subtask "Ajuste de texto de orientação": o cabeçalho do
// ExpensesPanel deve exibir uma linha equivalente à de MembersPanel
// ('Clique em um membro para ver os detalhes.'), condicionada a existir ao
// menos uma despesa na lista.
describe('ExpensesPanel — instrução de clique no cabeçalho', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe a instrução de clique quando há ao menos uma despesa', () => {
    const { getByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );

    expect(getByText(/Clique em uma despesa para ver os detalhes\.?/i)).toBeTruthy();
  });

  it('não exibe a instrução de clique quando não há despesas', () => {
    const { queryByText } = render(
      <ExpensesPanel {...baseProps} expenses={[]} />
    );

    expect(queryByText(/Clique em uma despesa para ver os detalhes\.?/i)).toBeNull();
  });
});
