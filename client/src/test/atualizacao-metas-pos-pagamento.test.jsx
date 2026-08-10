import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Reproduz o bug: PaymentsPage passa refreshCallbacks=[] para
// handlePaymentSubmit/handlePaymentDelete (ver client/src/routes/PaymentsPage.jsx),
// então nada dispara loadGoals — vindo de SharedDataContext — após lançar ou
// excluir um pagamento. Como GoalsPanel/SharedDataContext não são
// remontados ao trocar de rota, o progresso das metas ('raised'/'progress',
// calculado no backend a partir da soma dos pagamentos) fica desatualizado
// até um reload completo da página.

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ authToken: 'token-valido', authChecked: true })
}));

const loadGoals = vi.fn();

vi.mock('../contexts/SharedDataContext', () => ({
  useSharedData: () => ({
    members: [],
    goals: [],
    loadGoals,
    publicSettings: {}
  })
}));

// Emula o comportamento real de usePayments (ver client/src/hooks/usePayments.js):
// handlePaymentSubmit/handlePaymentDelete recebem um array de refreshCallbacks
// e, após concluir a operação, disparam cada callback (cb()). O bug está em
// PaymentsPage sempre invocá-los com [] — não neste hook.
vi.mock('../hooks', () => ({
  usePayments: () => ({
    payments: [],
    paymentForm: {},
    setPaymentForm: vi.fn(),
    loading: false,
    submitting: false,
    fileInputKey: 0,
    loadPayments: vi.fn(),
    handlePaymentSubmit: vi.fn(async (event, refreshCallbacks = []) => {
      await Promise.all(refreshCallbacks.map((cb) => cb()));
    }),
    handlePaymentDelete: vi.fn(async (id, refreshCallbacks = []) => {
      await Promise.all(refreshCallbacks.map((cb) => cb()));
    }),
    handleReceipt: vi.fn(),
    handlePixCode: vi.fn(),
    page: 1,
    pageSize: 10,
    total: 0,
    filterMonth: '',
    filterYear: '',
    filterMemberId: null,
    setPage: vi.fn(),
    onFilterMonthChange: vi.fn(),
    onFilterYearChange: vi.fn(),
    onFilterMemberChange: vi.fn(),
    onPageSizeChange: vi.fn()
  }),
  useToast: () => ({ toast: null, showToast: vi.fn(), handleError: vi.fn() })
}));

vi.mock('../components/payments/PaymentsPanel', () => ({
  PaymentsPanel: ({ onSubmit, onDelete }) => (
    <div>
      <button onClick={(e) => onSubmit(e)}>lançar-pagamento</button>
      <button onClick={() => onDelete(1)}>excluir-pagamento</button>
    </div>
  )
}));

vi.mock('../components', () => ({
  Toast: () => null
}));

import { PaymentsPage } from '../routes/PaymentsPage';

describe('PaymentsPage — atualização de metas após pagamento', () => {
  it('recarrega as metas (loadGoals) após lançar um pagamento', async () => {
    loadGoals.mockClear();
    const { findByText } = render(<PaymentsPage />);

    fireEvent.click(await findByText('lançar-pagamento'));

    await waitFor(() => expect(loadGoals).toHaveBeenCalledTimes(1));
  });

  it('recarrega as metas (loadGoals) após excluir um pagamento', async () => {
    loadGoals.mockClear();
    const { findByText } = render(<PaymentsPage />);

    fireEvent.click(await findByText('excluir-pagamento'));

    await waitFor(() => expect(loadGoals).toHaveBeenCalledTimes(1));
  });
});
