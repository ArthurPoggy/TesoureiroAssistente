import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpensesPanel } from '../components/expenses/ExpensesPanel';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

const defaultProps = {
  expenses: [],
  expenseForm: {
    title: '',
    amount: '',
    expenseDate: '',
    category: '',
    eventId: '',
    notes: '',
    tagIds: [],
    attachmentName: '',
    attachmentFile: null
  },
  setExpenseForm: noop,
  editingExpenseId: null,
  fileInputKey: 0,
  events: [{ id: 1, name: 'Acampamento' }],
  tags: [{ id: 1, name: 'Alimentação' }],
  onSubmit: noop,
  onDelete: noop,
  onEdit: noop,
  onReset: noop
};

describe('ExpensesPanel — hierarquia visual do formulário (labels)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ canEdit: true });
  });

  it('associa um label visível a cada campo do formulário de despesas', () => {
    render(<ExpensesPanel {...defaultProps} />);

    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/valor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data da despesa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoria/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evento associado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome do anexo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/anexo \(arquivo\)/i)).toBeInTheDocument();
  });
});
