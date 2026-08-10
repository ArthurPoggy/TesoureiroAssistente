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

describe('ExpensesPanel — agrupamento visual dos campos de anexo', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ canEdit: true });
  });

  it('mantém os campos de anexo dentro de um container com a classe attachments-block', () => {
    render(<ExpensesPanel {...defaultProps} />);

    const attachmentNameInput = screen.getByLabelText(/nome do anexo/i);
    const attachmentFileInput = screen.getByLabelText(/anexo \(arquivo\)/i);

    const attachmentsGroup = attachmentNameInput.closest('.attachments-block');

    expect(attachmentsGroup).not.toBeNull();
    expect(attachmentsGroup).toContainElement(attachmentFileInput);
  });
});
