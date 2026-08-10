import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');

const tags = [
  { id: 1, name: 'Acampamento' },
  { id: 2, name: 'Material' }
];

const baseProps = {
  expenseForm: {
    title: '', amount: '', expenseDate: '', category: '', eventId: '',
    notes: '', tagIds: [], attachmentName: '', attachmentFile: null
  },
  setExpenseForm: vi.fn(),
  editingExpenseId: null,
  fileInputKey: 'key',
  events: [],
  tags,
  expenses: [],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

describe('ExpensesPanel — criação inline de tag', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe o campo de nova tag apenas para quem pode editar', () => {
    const { getByPlaceholderText } = render(
      <ExpensesPanel {...baseProps} onCreateTag={vi.fn()} />
    );
    expect(getByPlaceholderText('Nova tag')).toBeInTheDocument();

    mockUseAuth.mockReturnValue({ canEdit: false });
    const { queryByPlaceholderText } = render(
      <ExpensesPanel {...baseProps} onCreateTag={vi.fn()} />
    );
    expect(queryByPlaceholderText('Nova tag')).not.toBeInTheDocument();
  });

  it('digitar um nome e submeter chama onCreateTag com o nome informado', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('Transporte'));
  });

  it('nome vazio ou apenas espaços não dispara onCreateTag', () => {
    const onCreateTag = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: '   ' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    expect(onCreateTag).not.toHaveBeenCalled();
  });

  it('a tag criada é adicionada à seleção via onChange/setExpenseForm', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const setExpenseForm = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} setExpenseForm={setExpenseForm} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => {
      expect(setExpenseForm).toHaveBeenCalledWith(
        expect.objectContaining({ tagIds: expect.arrayContaining([3]) })
      );
    });
  });

  it('limpa o campo de texto após a criação bem-sucedida', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    const input = getByPlaceholderText('Nova tag');
    fireEvent.change(input, { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => expect(input.value).toBe(''));
  });
});
