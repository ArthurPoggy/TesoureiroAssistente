import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');

const baseProps = {
  paymentForm: { memberId: '', month: 1, year: 2025, amount: '', goalId: '', paid: false, paidAt: '', notes: '', attachmentName: '' },
  setPaymentForm: vi.fn(),
  loading: false,
  submitting: false,
  members: [],
  goals: [],
  paymentSettings: {},
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onReceipt: vi.fn(),
  fileInputKey: 'k',
  total: 2
};

describe('PaymentsPanel — alinhamento da coluna Ações entre linhas', () => {
  it('mantém o mesmo número de células em todas as linhas quando apenas algumas têm ação aplicável', () => {
    // canEdit=false, mas onPix é fornecido: a coluna Ações aparece no cabeçalho
    // porque payments.some(canViewOwnPix) é true (o pagamento do próprio membro, id 42).
    // O pagamento de outro membro (id 99) não tem ação aplicável e não deveria
    // fazer a linha perder a célula — apenas renderizá-la vazia.
    mockUseAuth.mockReturnValue({ canEdit: false, memberId: 42 });

    const payments = [
      { id: 1, member_id: 42, member_name: 'Próprio membro', month: 3, year: 2025, amount: 120, paid: 1, goal_id: null },
      { id: 2, member_id: 99, member_name: 'Outro membro', month: 3, year: 2025, amount: 80, paid: 0, goal_id: null }
    ];

    const { container } = render(
      <PaymentsPanel {...baseProps} payments={payments} onPix={vi.fn()} />
    );

    const headerCells = container.querySelectorAll('thead tr th').length;
    const rows = container.querySelectorAll('tbody tr');

    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row.querySelectorAll('td').length).toBe(headerCells);
    });
  });
});
