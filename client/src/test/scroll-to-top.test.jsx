import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ScrollToTop } from '../routes/ScrollToTop';

// Cobre a subtask "Polimento de navegação": ao trocar de rota via navegação
// client-side (sem reload completo da página), a viewport deve voltar ao
// topo — comportamento que o navegador não dá de graça em SPAs com
// react-router.

describe('ScrollToTop — rola para o topo na troca de rota', () => {
  beforeEach(() => {
    window.scrollTo = vi.fn();
  });

  it('chama window.scrollTo para o topo ao navegar entre rotas, sem depender de reload de página', async () => {
    function Trigger() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/pagamentos')}>
          ir para pagamentos
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ScrollToTop />
        <Routes>
          <Route path="/dashboard" element={<Trigger />} />
          <Route path="/pagamentos" element={<div>Página de pagamentos</div>} />
        </Routes>
      </MemoryRouter>
    );

    window.scrollTo.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'ir para pagamentos' }));

    expect(await screen.findByText('Página de pagamentos')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    });
  });
});
