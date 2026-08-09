import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { PaymentsPanel } = await import('../components/payments/PaymentsPanel');

mockUseAuth.mockReturnValue({ canEdit: true, memberId: 1 });

const basePayments = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  member_id: 1,
  member_name: `Membro ${i + 1}`,
  month: 1,
  year: 2025,
  amount: 100,
  paid: 1,
  goal_id: null
}));

const baseProps = {
  paymentForm: { memberId: '', month: 1, year: 2025, amount: '', goalId: '', paid: false, paidAt: '', notes: '', attachmentName: '' },
  setPaymentForm: vi.fn(),
  submitting: false,
  members: [],
  goals: [],
  paymentSettings: {},
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onReceipt: vi.fn(),
  fileInputKey: 'k',
  page: 1,
  pageSize: 10,
  total: 20,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn()
};

describe('PaymentsPanel — overlay de loading ao trocar de página', () => {
  it('não colapsa para a mensagem "Carregando pagamentos..." nem some com as linhas quando onPageChange dispara loading e já há linhas renderizadas', () => {
    const { container, queryByText, rerender } = render(
      <PaymentsPanel {...baseProps} payments={basePayments} loading={false} />
    );

    // Estado inicial: página 1 carregada, sem overlay.
    expect(container.querySelectorAll('tbody tr').length).toBe(10);
    expect(queryByText('Carregando pagamentos...')).toBeNull();

    // Simula a troca de página: o consumidor (usePayments) seta loading=true
    // e só substitui `payments` quando a resposta da API chega — durante a
    // transição, as linhas antigas (da página 1) continuam na prop `payments`.
    rerender(<PaymentsPanel {...baseProps} payments={basePayments} loading={true} />);

    // Não deve colapsar para a mensagem de "carregando" nem remover a tabela,
    // já que há linhas renderizadas (evita o salto de altura/estrutura).
    expect(queryByText('Carregando pagamentos...')).toBeNull();
    const wrapper = container.querySelector('.table-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper.className).toContain('table-wrapper--loading');
    expect(container.querySelector('table.payments-table')).not.toBeNull();
    expect(container.querySelectorAll('tbody tr').length).toBe(10);
    // O overlay de loading deve aparecer sobre a tabela existente, não substituí-la.
    expect(container.querySelector('.table-loading-overlay')).not.toBeNull();

    // Resposta da nova página chega: linhas trocam, loading volta a false.
    const nextPagePayments = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i,
      member_id: 1,
      member_name: `Membro pág 2 ${i + 1}`,
      month: 2,
      year: 2025,
      amount: 100,
      paid: 1,
      goal_id: null
    }));
    rerender(<PaymentsPanel {...baseProps} payments={nextPagePayments} loading={false} page={2} />);

    expect(container.querySelectorAll('tbody tr').length).toBe(8);
    expect(container.querySelector('.table-wrapper--loading')).toBeNull();
    expect(container.querySelector('.table-loading-overlay')).toBeNull();
  });

  it('mantém as linhas antigas visíveis (sem colapsar para a mensagem de carregamento) mesmo se o consumidor demorar a atualizar `payments` após onPageSizeChange', () => {
    const { container, queryByText, rerender } = render(
      <PaymentsPanel {...baseProps} payments={basePayments} loading={false} />
    );

    rerender(<PaymentsPanel {...baseProps} payments={basePayments} loading={true} pageSize={25} />);

    // Regressão específica: se a re-renderização das linhas fosse disparada
    // de forma ingênua limpando `payments` (ou tratando loading como "sem
    // dados"), a tabela colapsaria para a mensagem abaixo — o que produz o
    // salto de altura perceptível que esta subtask corrige.
    expect(queryByText('Carregando pagamentos...')).toBeNull();
    expect(container.querySelectorAll('tbody tr').length).toBe(10);
  });

  describe('reserva de altura mínima não deve ser descartada durante o carregamento de onPageSizeChange', () => {
    // jsdom não calcula layout real (scrollHeight é sempre 0), então simulamos
    // uma altura proporcional ao número de linhas atualmente no DOM — o
    // suficiente para expor a ordem de efeitos do componente sem depender de
    // um navegador real (o salto de altura em si, em pixels, é coberto pelo
    // e2e client/e2e/payments-pagination-height.spec.js).
    let originalDescriptor;

    beforeAll(() => {
      originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get() {
          if (this.classList?.contains('table-wrapper')) {
            return this.querySelectorAll('tbody tr').length * 50;
          }
          return 0;
        }
      });
    });

    afterAll(() => {
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalDescriptor);
      }
    });

    it('não descarta a altura mínima já reservada enquanto a página curta ainda está visível sob o overlay de loading', () => {
      const { container, rerender } = render(
        <PaymentsPanel {...baseProps} payments={basePayments} loading={false} pageSize={10} />
      );

      // Altura mínima reservada a partir da página cheia (10 linhas = 500px simulados).
      const wrapper = container.querySelector('.table-wrapper');
      expect(wrapper.style.getPropertyValue('--table-min-height')).toBe('500px');

      // Navega para uma página curta (2 linhas) do mesmo pageSize: a reserva
      // de altura deve permanecer (comportamento já coberto/corrigido).
      const shortPagePayments = basePayments.slice(0, 2);
      rerender(<PaymentsPanel {...baseProps} payments={shortPagePayments} loading={false} pageSize={10} page={2} />);
      expect(wrapper.style.getPropertyValue('--table-min-height')).toBe('500px');

      // Usuário aciona onPageSizeChange: o consumidor seta loading=true e um
      // novo pageSize imediatamente, mas `payments` ainda é a página curta
      // (2 linhas) até a resposta da API chegar. Como o pageSize mudou, a
      // "forma" da tabela mudou — mas isso não deveria remover a reserva de
      // altura MENQUANTO a tabela curta antiga ainda está visível sob o
      // overlay de loading, senão o wrapper colapsa visivelmente para caber
      // só 2 linhas e volta a crescer quando os dados novos chegam (o
      // "salto de altura ao trocar de página" que esta subtask corrige).
      rerender(
        <PaymentsPanel {...baseProps} payments={shortPagePayments} loading={true} pageSize={25} page={1} />
      );
      expect(wrapper.style.getPropertyValue('--table-min-height')).toBe('500px');
    });
  });
});
