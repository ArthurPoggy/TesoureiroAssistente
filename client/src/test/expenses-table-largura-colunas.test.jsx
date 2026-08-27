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

describe('ExpensesPanel — largura de coluna estável (analogo a .payments-table)', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('usa table-layout fixo com colgroup de larguras por coluna, como a tabela de pagamentos', () => {
    const { container } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );

    const table = container.querySelector('table.expenses-table');
    expect(table).not.toBeNull();

    const cols = table.querySelectorAll('colgroup > col');
    // Data, Título, Valor, Categoria, Tags e Ações (canEdit=true) — a tabela de
    // despesas atual não possui coluna "Forma de pagamento" (o modelo de
    // despesa não tem esse campo, ao contrário de pagamentos).
    expect(cols.length).toBe(6);

    cols.forEach((col) => {
      expect(col.className).toMatch(/^col-/);
    });
  });

  it('sem permissão de edição, o colgroup acompanha as colunas exibidas', () => {
    mockUseAuth.mockReturnValue({ canEdit: false });
    const { container } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );

    const table = container.querySelector('table.expenses-table');
    const cols = table.querySelectorAll('colgroup > col');
    const headers = table.querySelectorAll('thead th');

    // Sem a coluna de Ações sobram 5 colunas; o colgroup precisa ter
    // exatamente uma <col> por cabeçalho, senão as larguras escorregam de
    // coluna para a vizinha.
    expect(cols.length).toBe(headers.length);
    expect(cols.length).toBe(5);
  });
});
