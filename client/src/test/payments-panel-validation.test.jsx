import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');

const baseForm = {
  memberId: '', month: 1, year: '', amount: '', goalId: '',
  paid: false, paidAt: '', notes: '', attachmentName: ''
};

const baseProps = {
  payments: [],
  setPaymentForm: vi.fn(),
  loading: false,
  submitting: false,
  members: [],
  goals: [],
  paymentSettings: {},
  onDelete: vi.fn(),
  onReceipt: vi.fn(),
  onPix: vi.fn(),
  fileInputKey: 'k'
};

describe('PaymentsPanel — validação do formulário', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true, memberId: null });
  });

  it('limpa a mensagem de erro após um reenvio válido do formulário', () => {
    const onSubmit = vi.fn();
    const { container, rerender, queryByText } = render(
      <PaymentsPanel {...baseProps} paymentForm={baseForm} onSubmit={onSubmit} />
    );

    fireEvent.submit(container.querySelector('form'));
    expect(queryByText('Valor deve ser maior que zero')).not.toBeNull();

    const validForm = { ...baseForm, memberId: '1', amount: '50', year: '2026' };
    rerender(
      <PaymentsPanel {...baseProps} paymentForm={validForm} onSubmit={onSubmit} />
    );
    fireEvent.submit(container.querySelector('form'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(queryByText('Valor deve ser maior que zero')).toBeNull();
  });
});
