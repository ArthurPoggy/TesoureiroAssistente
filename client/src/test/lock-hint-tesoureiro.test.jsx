import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { AttachmentsBlock } = await import('../components/files/AttachmentsBlock');
const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');

const attachmentsProps = {
  files: [],
  filesLoading: false,
  fileForm: { name: '', file: null },
  setFileForm: vi.fn(),
  fileUploading: false,
  fileInputKey: 'key',
  onSubmit: vi.fn()
};

const paymentsProps = {
  payments: [],
  paymentForm: {
    memberId: '',
    month: 1,
    year: 2025,
    amount: '',
    goalId: '',
    paid: false,
    paidAt: '',
    notes: '',
    attachmentName: ''
  },
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
  total: 0
};

describe('AttachmentsBlock — sem aviso de restrição ao tesoureiro', () => {
  it('não exibe texto de restrição quando canEdit é false', () => {
    mockUseAuth.mockReturnValue({ canEdit: false });
    const { queryByText } = render(<AttachmentsBlock {...attachmentsProps} />);
    expect(queryByText(/somente o tesoureiro pode/i)).not.toBeInTheDocument();
  });
});

describe('PaymentsPanel — sem aviso de restrição ao tesoureiro', () => {
  it('não exibe texto de restrição quando canEdit é false', () => {
    mockUseAuth.mockReturnValue({ canEdit: false, memberId: null });
    const { queryByText } = render(<PaymentsPanel {...paymentsProps} />);
    expect(queryByText(/somente o tesoureiro pode/i)).not.toBeInTheDocument();
  });
});
