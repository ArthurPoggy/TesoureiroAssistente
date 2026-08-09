import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardSection } from '../components/dashboard/DashboardSection';

// Evita depender de canvas real (chart.js) no jsdom — não é o foco deste teste.
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart" />
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const CUSTOM_DASHBOARD_BG = '/uploads/dashboard-custom.jpg?v=7';

const dashboard = {
  totalRaised: 1000,
  totalExpenses: 200,
  balance: 800,
  currentBalance: 800,
  monthlyCollections: []
};

const goals = [];

function renderDashboard(extraProps = {}) {
  return render(
    <DashboardSection
      dashboard={dashboard}
      goals={goals}
      onEditGoal={vi.fn()}
      onDeleteGoal={vi.fn()}
      dashboardNote=""
      {...extraProps}
    />
  );
}

describe('DashboardSection — imagem de fundo', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAdmin: true, canEdit: true });
  });

  it('aplica a imagem de fundo customizada (reaproveitada dos settings) com overlay mais leve que o do login, sem esconder os dados', async () => {
    renderDashboard({ dashboardBackgroundUrl: CUSTOM_DASHBOARD_BG });

    // Os dados do dashboard devem estar visíveis imediatamente, sem esperar a imagem carregar.
    expect(screen.getByText('Total arrecadado')).toBeInTheDocument();

    const backgroundEl = await screen.findByTestId('dashboard-section-background');

    await waitFor(() => {
      expect(backgroundEl.style.backgroundImage).toContain(CUSTOM_DASHBOARD_BG);
    });
    expect(backgroundEl.style.backgroundSize).toBe('cover');
    expect(backgroundEl.style.backgroundPosition).toBe('center center');

    // Overlay deve ser mais leve que o do login (--color-overlay-dark), para não competir com cards/tabelas.
    const overlay = screen.getByTestId('dashboard-section-overlay');
    expect(overlay).toBeInTheDocument();
    const overlayBg = overlay.style.background || overlay.style.backgroundColor;
    expect(overlayBg).not.toContain('var(--color-overlay-dark)');
    expect(overlayBg).toMatch(/rgba?\(|var\(--color-overlay-light\)/);
  });

  it('usa a imagem padrão (fallback) quando nenhuma imagem de fundo está configurada', async () => {
    renderDashboard({ dashboardBackgroundUrl: '' });

    const backgroundEl = await screen.findByTestId('dashboard-section-background');

    await waitFor(() => {
      expect(backgroundEl.style.backgroundImage).not.toBe('');
    });
    expect(backgroundEl.style.backgroundImage).not.toContain(CUSTOM_DASHBOARD_BG);
  });

  it('não bloqueia a renderização dos dados do dashboard enquanto a imagem de fundo carrega (evita regressão de performance percebida)', () => {
    // Sem mockar o carregamento da imagem (Image.onload nunca dispara nesta suíte),
    // os dados precisam estar visíveis de imediato — a imagem de fundo é tratada de forma assíncrona/lazy.
    renderDashboard({ dashboardBackgroundUrl: CUSTOM_DASHBOARD_BG });

    expect(screen.getByText('Total arrecadado')).toBeInTheDocument();
    expect(screen.getByText('Despesas')).toBeInTheDocument();
  });
});
