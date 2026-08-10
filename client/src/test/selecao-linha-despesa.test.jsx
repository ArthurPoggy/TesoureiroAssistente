import { render, fireEvent, within } from '@testing-library/react';
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
  { id: 1, expense_date: '2024-01-15', title: 'Compra de material', amount: 150, category: 'Material', notes: '' },
  { id: 2, expense_date: '2024-02-10', title: 'Aluguel de van', amount: 300, category: 'Transporte', notes: 'acampamento' }
];

// Cobre a subtask "Clique na linha da tabela seleciona/deseleciona a
// despesa": ExpensesPanel/ExpensesTable deve replicar o padrão já usado em
// MembersPanel — clique na linha chama setSelectedExpenseDetail (toggle),
// aplica a classe 'selected' na linha da despesa selecionada, e os botões
// de ação (Editar/Remover) não disparam a seleção por causa do
// stopPropagation.
describe('ExpensesPanel — seleção de linha da tabela', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('clique numa linha marca a despesa como selecionada', () => {
    const setSelectedExpenseDetail = vi.fn();
    const { getByText } = render(
      <ExpensesPanel
        {...baseProps}
        expenses={expenses}
        selectedExpenseDetail={null}
        setSelectedExpenseDetail={setSelectedExpenseDetail}
      />
    );

    fireEvent.click(getByText('Compra de material').closest('tr'));

    expect(setSelectedExpenseDetail).toHaveBeenCalledWith(expenses[0]);
  });

  it('linha da despesa selecionada recebe a classe "selected"', () => {
    const { getByText } = render(
      <ExpensesPanel
        {...baseProps}
        expenses={expenses}
        selectedExpenseDetail={expenses[0]}
        setSelectedExpenseDetail={vi.fn()}
      />
    );

    const selectedRow = getByText('Compra de material').closest('tr');
    const unselectedRow = getByText('Aluguel de van').closest('tr');

    expect(selectedRow.className).toContain('selected');
    expect(unselectedRow.className).not.toContain('selected');
  });

  it('clicar de novo na linha já selecionada desmarca (toggle)', () => {
    const setSelectedExpenseDetail = vi.fn();
    const { getByText } = render(
      <ExpensesPanel
        {...baseProps}
        expenses={expenses}
        selectedExpenseDetail={expenses[0]}
        setSelectedExpenseDetail={setSelectedExpenseDetail}
      />
    );

    fireEvent.click(getByText('Compra de material').closest('tr'));

    expect(setSelectedExpenseDetail).toHaveBeenCalledWith(null);
  });

  it('clique nos botões de ação não altera a seleção da linha', () => {
    const setSelectedExpenseDetail = vi.fn();
    const { getByText } = render(
      <ExpensesPanel
        {...baseProps}
        expenses={expenses}
        selectedExpenseDetail={null}
        setSelectedExpenseDetail={setSelectedExpenseDetail}
      />
    );

    const row = getByText('Compra de material').closest('tr');
    fireEvent.click(within(row).getByText('Editar'));
    fireEvent.click(within(row).getByText('Remover'));

    expect(setSelectedExpenseDetail).not.toHaveBeenCalled();
    expect(baseProps.onEdit).toHaveBeenCalledWith(expenses[0]);
    expect(baseProps.onDelete).toHaveBeenCalledWith(expenses[0].id);
  });
});
