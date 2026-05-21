import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');
const { EventsPanel } = await import('../components/events/EventsPanel');

const expenseProps = {
  expenses: [],
  expenseForm: {
    title: '',
    amount: '',
    expenseDate: '',
    category: '',
    eventId: '',
    notes: '',
    attachmentName: '',
    attachmentFile: null
  },
  setExpenseForm: vi.fn(),
  editingExpenseId: null,
  fileInputKey: 'key',
  events: [],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

const eventProps = {
  events: [],
  eventForm: { name: '', eventDate: '', raisedAmount: '', spentAmount: '', description: '' },
  setEventForm: vi.fn(),
  editingEventId: null,
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

describe('ExpensesPanel — estrutura visual', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('renderiza como <section> com classe panel', () => {
    const { container } = render(<ExpensesPanel {...expenseProps} />);
    const root = container.firstChild;
    expect(root.tagName).toBe('SECTION');
    expect(root).toHaveClass('panel');
  });

  it('exibe cabeçalho "Despesas"', () => {
    const { getByText } = render(<ExpensesPanel {...expenseProps} />);
    expect(getByText('Despesas')).toBeInTheDocument();
  });

  it('exibe tabela de despesas', () => {
    const { getByRole } = render(<ExpensesPanel {...expenseProps} />);
    expect(getByRole('table')).toBeInTheDocument();
  });

  it('exibe linha de despesa quando há dados', () => {
    const expenses = [
      { id: 1, expense_date: '2024-01-15', title: 'Compra de material', amount: 150, category: 'Material' }
    ];
    const { getByText } = render(<ExpensesPanel {...expenseProps} expenses={expenses} />);
    expect(getByText('Compra de material')).toBeInTheDocument();
    expect(getByText('Material')).toBeInTheDocument();
  });

  it('exibe formulário de cadastro quando canEdit é true', () => {
    const { getByPlaceholderText } = render(<ExpensesPanel {...expenseProps} />);
    expect(getByPlaceholderText('Descrição')).toBeInTheDocument();
  });

  it('exibe coluna Ações quando canEdit é true', () => {
    const { getByText } = render(<ExpensesPanel {...expenseProps} />);
    expect(getByText('Ações')).toBeInTheDocument();
  });

  it('oculta coluna Ações e formulário quando canEdit é false', () => {
    mockUseAuth.mockReturnValue({ canEdit: false });
    const { queryByText } = render(<ExpensesPanel {...expenseProps} />);
    expect(queryByText('Ações')).not.toBeInTheDocument();
    expect(queryByText('Somente o tesoureiro pode registrar despesas.')).toBeInTheDocument();
  });
});

describe('EventsPanel — estrutura visual', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('renderiza como <section> com classe panel', () => {
    const { container } = render(<EventsPanel {...eventProps} />);
    const root = container.firstChild;
    expect(root.tagName).toBe('SECTION');
    expect(root).toHaveClass('panel');
  });

  it('exibe cabeçalho "Eventos"', () => {
    const { getByText } = render(<EventsPanel {...eventProps} />);
    expect(getByText('Eventos')).toBeInTheDocument();
  });

  it('exibe evento quando há dados', () => {
    const events = [
      {
        id: 1,
        name: 'Acampamento de Junho',
        event_date: '2024-06-10',
        description: 'Acampamento anual',
        raised_amount: 500,
        spent_amount: 300
      }
    ];
    const { getByText } = render(<EventsPanel {...eventProps} events={events} />);
    expect(getByText('Acampamento de Junho')).toBeInTheDocument();
  });

  it('exibe formulário de cadastro quando canEdit é true', () => {
    const { getByPlaceholderText } = render(<EventsPanel {...eventProps} />);
    expect(getByPlaceholderText('Nome do evento')).toBeInTheDocument();
  });

  it('oculta formulário e exibe restrição quando canEdit é false', () => {
    mockUseAuth.mockReturnValue({ canEdit: false });
    const { queryByPlaceholderText, getByText } = render(<EventsPanel {...eventProps} />);
    expect(queryByPlaceholderText('Nome do evento')).not.toBeInTheDocument();
    expect(getByText('Somente o tesoureiro pode registrar eventos.')).toBeInTheDocument();
  });
});
