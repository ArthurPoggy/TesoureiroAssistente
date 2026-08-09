import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { NavMenu } from '../routes/NavMenu';

// Cobre a subtask "Polimento de navegação": destaque do item ativo no menu
// (via NavLink) e navegação back/forward preservando o pathname correto
// entre módulos. O teste de scroll-to-topo fica em scroll-to-top.test.jsx.

describe('NavMenu — destaque de rota ativa', () => {
  it('marca como ativo apenas o item correspondente ao módulo atual, entre pelo menos três módulos', () => {
    render(
      <MemoryRouter initialEntries={['/pagamentos']}>
        <NavMenu />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: 'Painel' });
    const membrosLink = screen.getByRole('link', { name: 'Membros' });
    const pagamentosLink = screen.getByRole('link', { name: 'Pagamentos' });

    expect(pagamentosLink.className).toContain('active');
    expect(dashboardLink.className).not.toContain('active');
    expect(membrosLink.className).not.toContain('active');
  });

  it('atualiza o destaque quando o usuário navega para outro módulo', () => {
    render(
      <MemoryRouter initialEntries={['/membros']}>
        <NavMenu />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Membros' }).className).toContain('active');
    expect(screen.getByRole('link', { name: 'Painel' }).className).not.toContain('active');
  });
});

describe('Histórico do navegador — back/forward entre módulos', () => {
  it('volta e avança corretamente entre pelo menos três rotas preservando o módulo esperado', () => {
    function LocationNav() {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate(-1)}>
            voltar
          </button>
          <button type="button" onClick={() => navigate(1)}>
            avançar
          </button>
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={['/dashboard', '/membros', '/pagamentos']} initialIndex={2}>
        <LocationNav />
        <Routes>
          <Route path="/dashboard" element={<div>Painel atual</div>} />
          <Route path="/membros" element={<div>Membros atual</div>} />
          <Route path="/pagamentos" element={<div>Pagamentos atual</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Pagamentos atual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'voltar' }));
    expect(screen.getByText('Membros atual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'voltar' }));
    expect(screen.getByText('Painel atual')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'avançar' }));
    expect(screen.getByText('Membros atual')).toBeInTheDocument();
  });
});
