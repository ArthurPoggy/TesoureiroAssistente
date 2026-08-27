import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

// Integração ponta a ponta da subtask "ExtratoPage: wiring final e testes de
// integração": monta ExtratoPage de verdade (useExtrato real, ExtratoPanel
// real), só substituindo a borda externa (AuthContext/SharedDataContext) por
// dublês, e confirma que a API paginada (entries+total+page+pageSize)
// chega até a tela renderizada e que clicar em "Próxima" refaz a busca e
// atualiza as linhas exibidas — não só que os handlers foram chamados.

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../contexts/SharedDataContext', () => ({
  useSharedData: () => ({ members: [] })
}));

import { useAuth } from '../contexts/AuthContext';
import { ExtratoPage } from '../routes/ExtratoPage';

const TOTAL_ENTRIES = 30;
const DEFAULT_PAGE_SIZE = 25;

// Simula o backend paginado: cada "página" tem suas próprias entradas,
// identificáveis pela descrição, para diferenciar visualmente o conteúdo
// renderizado antes/depois da navegação.
function buildPage(page, pageSize) {
  const start = (page - 1) * pageSize;
  const remaining = TOTAL_ENTRIES - start;
  const count = Math.max(0, Math.min(pageSize, remaining));
  const entries = Array.from({ length: count }, (_, i) => ({
    date: '2024-01-01',
    type: 'despesa',
    description: `Movimento pagina${page} item${i + 1}`,
    amount: -10,
    running_balance: -10
  }));
  return {
    entries,
    summary: { totalIncome: 0, totalExpense: 120, netBalance: -120, count: TOTAL_ENTRIES },
    total: TOTAL_ENTRIES
  };
}

describe('ExtratoPage — integração da paginação com a API', () => {
  let apiFetch;

  beforeEach(() => {
    apiFetch = vi.fn().mockImplementation((url) => {
      const query = new URLSearchParams(url.split('?')[1] || '');
      const page = Number(query.get('page') || 1);
      const pageSize = Number(query.get('pageSize') || DEFAULT_PAGE_SIZE);
      return Promise.resolve(buildPage(page, pageSize));
    });

    useAuth.mockReturnValue({
      apiFetch,
      authToken: 'token-valido',
      isAdmin: true
    });
  });

  it('renderiza a primeira página vinda da API e navega para a segunda ao clicar em "Próxima"', async () => {
    render(<ExtratoPage />);

    await waitFor(() => {
      expect(screen.getByText('Movimento pagina1 item1')).toBeInTheDocument();
    });
    expect(screen.getByText(/Página 1 de 2/)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('page=1'));

    const nextButton = screen.getByRole('button', { name: 'Próxima' });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Página 2 de 2/)).toBeInTheDocument();
    });
    expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('page=2'));

    // A tela deve mostrar somente os itens da página 2 vindos da API — a
    // paginação já é feita no servidor, então a página 1 não deve continuar
    // visível junto com a 2 (o painel não deve acumular nem paginar de novo
    // no cliente).
    expect(screen.getByText('Movimento pagina2 item1')).toBeInTheDocument();
    expect(screen.queryByText('Movimento pagina1 item1')).not.toBeInTheDocument();

    const summary = screen.getByText(/Exibindo 26–30 de 30 registros/);
    expect(summary).toBeInTheDocument();
  });

  it('reflete na tela a troca de itens por página, voltando para a página 1', async () => {
    render(<ExtratoPage />);

    await waitFor(() => {
      expect(screen.getByText('Movimento pagina1 item1')).toBeInTheDocument();
    });

    const pageSizeSelect = screen.getByLabelText(/Por página/i);
    fireEvent.change(pageSizeSelect, { target: { value: '10' } });

    await waitFor(() => {
      expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('pageSize=10'));
    });
    await waitFor(() => {
      expect(apiFetch).toHaveBeenLastCalledWith(expect.stringContaining('page=1'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
    });
  });
});
