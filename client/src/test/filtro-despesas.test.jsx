import { render, fireEvent } from '@testing-library/react';
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
  { id: 2, expense_date: '2024-02-10', title: 'Aluguel de van', amount: 300, category: 'Transporte', notes: 'acampamento' },
  { id: 3, expense_date: '2024-03-05', title: 'Lanche da reunião', amount: 80, category: 'Alimentação', notes: '' }
];

describe('ExpensesPanel — filtro de busca', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('renderiza o campo de busca e o seletor de categoria', () => {
    const { getByLabelText } = render(<ExpensesPanel {...baseProps} expenses={expenses} />);
    expect(getByLabelText('Buscar despesas')).toBeInTheDocument();
    expect(getByLabelText('Filtrar despesas por tipo')).toBeInTheDocument();
  });

  it('filtra por texto no título (case-insensitive)', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );
    fireEvent.change(getByLabelText('Buscar despesas'), { target: { value: 'aluguel' } });
    expect(getByText('Aluguel de van')).toBeInTheDocument();
    expect(queryByText('Compra de material')).not.toBeInTheDocument();
    expect(queryByText('Lanche da reunião')).not.toBeInTheDocument();
  });

  it('filtra por texto nas observações', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );
    fireEvent.change(getByLabelText('Buscar despesas'), { target: { value: 'acampamento' } });
    expect(getByText('Aluguel de van')).toBeInTheDocument();
    expect(queryByText('Compra de material')).not.toBeInTheDocument();
  });

  it('filtra por categoria selecionada', () => {
    const { getByLabelText, getByText, queryByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );
    fireEvent.change(getByLabelText('Filtrar despesas por tipo'), { target: { value: 'Transporte' } });
    expect(getByText('Aluguel de van')).toBeInTheDocument();
    expect(queryByText('Compra de material')).not.toBeInTheDocument();
  });

  it('exibe estado vazio quando nada corresponde ao filtro', () => {
    const { getByLabelText, getByText } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );
    fireEvent.change(getByLabelText('Buscar despesas'), { target: { value: 'inexistente xyz' } });
    expect(getByText('Nenhuma despesa encontrada.')).toBeInTheDocument();
  });

  it('não quebra quando a prop tags é omitida', () => {
    const { tags, ...propsSemTags } = baseProps;
    expect(() =>
      render(<ExpensesPanel {...propsSemTags} expenses={expenses} />)
    ).not.toThrow();
  });
});
