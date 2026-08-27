import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Cobre, em um único lugar, a ausência do aviso "Somente o tesoureiro
// pode ..." nos quatro painéis onde ele existia (Anexos, Pagamentos,
// Despesas e Eventos): com canEdit false o formulário simplesmente não é
// renderizado, sem texto de restrição no lugar.

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { AttachmentsBlock } = await import('../components/files/AttachmentsBlock');
const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');
const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');
const { EventsPanel } = await import('../components/events/EventsPanel');

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

const panels = [
  ['AttachmentsBlock', () => <AttachmentsBlock {...attachmentsProps} />],
  ['PaymentsPanel', () => <PaymentsPanel {...paymentsProps} />],
  ['ExpensesPanel', () => <ExpensesPanel {...expenseProps} />],
  ['EventsPanel', () => <EventsPanel {...eventProps} />]
];

describe('Painéis sem aviso de restrição ao tesoureiro', () => {
  it.each(panels)('%s não exibe texto de restrição quando canEdit é false', (_name, renderPanel) => {
    mockUseAuth.mockReturnValue({ canEdit: false, memberId: null });
    const { queryByText } = render(renderPanel());
    expect(queryByText(/somente o tesoureiro pode/i)).not.toBeInTheDocument();
  });
});
