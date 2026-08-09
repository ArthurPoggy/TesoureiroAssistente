import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');

const payments = [
  { id: 7, member_name: 'João', month: 3, year: 2025, amount: 120, paid: 1, goal_id: null }
];

const baseProps = {
  payments,
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
  total: 1
};

describe('PaymentsPanel — botão PIX', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe o botão PIX quando onPix é fornecido e canEdit é true', () => {
    const { getByText } = render(<PaymentsPanel {...baseProps} onPix={vi.fn()} />);
    expect(getByText('PIX')).toBeInTheDocument();
  });

  it('chama onPix com o id do pagamento ao clicar', () => {
    const onPix = vi.fn();
    const { getByText } = render(<PaymentsPanel {...baseProps} onPix={onPix} />);
    fireEvent.click(getByText('PIX'));
    expect(onPix).toHaveBeenCalledWith(7);
  });

  it('não renderiza o botão PIX quando onPix não é fornecido', () => {
    const { queryByText } = render(<PaymentsPanel {...baseProps} />);
    expect(queryByText('PIX')).not.toBeInTheDocument();
  });
});

describe('PaymentsPanel — botão PIX para o próprio membro (não-tesoureiro)', () => {
  const ownPayments = [
    { id: 7, member_id: 42, member_name: 'João', month: 3, year: 2025, amount: 120, paid: 1, goal_id: null }
  ];

  it('exibe o botão PIX para um membro comum (canEdit=false) visualizando o próprio pagamento', () => {
    // A rota GET /api/payments/:id/pix permite que o próprio membro (member_id === req.user.memberId)
    // busque o PIX do seu pagamento, mesmo sem ser admin/diretor_financeiro. A UI precisa refletir isso.
    mockUseAuth.mockReturnValue({ canEdit: false, memberId: 42 });
    const { getByText } = render(
      <PaymentsPanel {...baseProps} payments={ownPayments} onPix={vi.fn()} />
    );
    expect(getByText('PIX')).toBeInTheDocument();
  });
});
