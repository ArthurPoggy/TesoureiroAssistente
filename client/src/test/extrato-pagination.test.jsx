import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExtratoPanel } from '../components/extrato/ExtratoPanel';

// Cobre a subtask "Backend: paginação no GET /api/extrato" no lado do
// frontend: ExtratoPanel reaproveita o mesmo padrão de paginação já usado em
// PaymentsPanel (seletor de itens por página + botões de navegação), então
// essa UI precisa de cobertura própria assim como a rota já tem a sua.

const baseEntries = Array.from({ length: 5 }, (_, i) => ({
  date: `2024-01-${String(i + 1).padStart(2, '0')}`,
  type: 'despesa',
  description: `Despesa ${i + 1}`,
  amount: -10,
  running_balance: -10 * (i + 1)
}));

const baseProps = {
  entries: baseEntries,
  summary: { totalIncome: 0, totalExpense: 50, netBalance: -50, count: 20 },
  loading: false,
  filters: { startDate: '', endDate: '', type: '', memberId: '' },
  setFilters: vi.fn(),
  onLoad: vi.fn(),
  onExport: vi.fn(),
  members: [],
  isAdmin: true,
  page: 1,
  pageSize: 5,
  total: 20,
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn()
};

describe('ExtratoPanel — paginação', () => {
  it('exibe o resumo de página e o total vindos das props, não recalculados a partir de `entries`', () => {
    const { getByText } = render(<ExtratoPanel {...baseProps} />);
    expect(getByText('Exibindo 1–5 de 20 registros')).toBeTruthy();
    expect(getByText('Página 1 de 4')).toBeTruthy();
  });

  it('desabilita "Anterior"/"«" na primeira página e habilita "Próxima"/"»"', () => {
    const { container } = render(<ExtratoPanel {...baseProps} page={1} />);
    const buttons = container.querySelectorAll('.pagination-btn');
    const [first, prev, next, last] = buttons;
    expect(first.disabled).toBe(true);
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    expect(last.disabled).toBe(false);
  });

  it('desabilita "Próxima"/"»" na última página', () => {
    const { container } = render(<ExtratoPanel {...baseProps} page={4} />);
    const buttons = container.querySelectorAll('.pagination-btn');
    const [first, prev, next, last] = buttons;
    expect(first.disabled).toBe(false);
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(true);
    expect(last.disabled).toBe(true);
  });

  it('chama onPageChange com a página correta ao clicar em "Próxima" e "Última"', () => {
    const onPageChange = vi.fn();
    const { container } = render(<ExtratoPanel {...baseProps} page={2} onPageChange={onPageChange} />);
    const [, , next, last] = container.querySelectorAll('.pagination-btn');

    fireEvent.click(next);
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(last);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('chama onPageSizeChange ao trocar o seletor "Por página"', () => {
    const onPageSizeChange = vi.fn();
    const { getByLabelText } = render(<ExtratoPanel {...baseProps} onPageSizeChange={onPageSizeChange} />);
    const select = getByLabelText(/Por página/i);
    fireEvent.change(select, { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith('50');
  });

  it('não renderiza os controles de paginação quando total é 0', () => {
    const { container } = render(<ExtratoPanel {...baseProps} entries={[]} total={0} />);
    expect(container.querySelector('.pagination')).toBeNull();
  });

  // O seletor "Por página" precisa oferecer exatamente as mesmas opções
  // (10/25/50/100) e na mesma ordem que PaymentsPanel usa, já que a subtask
  // pede reaproveitar o mesmo padrão em vez de criar um novo.
  it('oferece as mesmas opções de "Por página" (10, 25, 50, 100) que o PaymentsPanel', () => {
    const { getByLabelText } = render(<ExtratoPanel {...baseProps} />);
    const select = getByLabelText(/Por página/i);
    const optionValues = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(optionValues).toEqual(['10', '25', '50', '100']);
  });

  // Com a paginação feita no servidor (ver GET /api/extrato), `entries` já
  // chega contendo só os itens da página atual — o painel não deve
  // reduzir/paginar essa lista de novo no cliente, só exibi-la como veio.
  it('renderiza exatamente as entries recebidas via props, sem paginar/fatiar de novo no cliente', () => {
    const { container } = render(<ExtratoPanel {...baseProps} />);
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(baseEntries.length);
  });
});
