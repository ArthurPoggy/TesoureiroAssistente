import { useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { months } from '../../utils/formatters';
import { StatsGrid } from './StatsGrid';
import { GoalsGrid } from './GoalsGrid';

// Imagem padrão da identidade visual, usada quando nenhum fundo é configurado em settings.
const DEFAULT_DASHBOARD_BACKGROUND = 'var(--gradient-dashboard-default)';
// Overlay mais leve que o do login (--color-overlay-dark) para não competir com cards e tabelas.
const OVERLAY_COLOR = 'var(--color-overlay-light)';

export function DashboardSection({ dashboard, goals, onEditGoal, onDeleteGoal, dashboardNote, dashboardBackgroundUrl }) {
  const [loadedBackgroundUrl, setLoadedBackgroundUrl] = useState(null);

  // Pré-carrega a imagem custom (quando houver) de forma assíncrona, sem bloquear a
  // renderização dos dados do dashboard — o fallback (gradiente) não precisa de pré-carregamento.
  useEffect(() => {
    if (!dashboardBackgroundUrl) {
      return undefined;
    }
    const img = new Image();
    img.onload = () => setLoadedBackgroundUrl(dashboardBackgroundUrl);
    img.onerror = () => setLoadedBackgroundUrl(dashboardBackgroundUrl);
    img.src = dashboardBackgroundUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [dashboardBackgroundUrl]);

  const backgroundImage = dashboardBackgroundUrl ? `url(${dashboardBackgroundUrl})` : DEFAULT_DASHBOARD_BACKGROUND;
  // Sem imagem custom (gradiente padrão) não há carregamento a aguardar: considerar pronto direto na renderização.
  // Com imagem custom, só é considerado pronto quando a URL atual terminou de pré-carregar (onload/onerror).
  const isBackgroundLoaded = !dashboardBackgroundUrl || loadedBackgroundUrl === dashboardBackgroundUrl;

  const chartData = useMemo(() => {
    const dataset = months.map((monthItem) => {
      const record = dashboard.monthlyCollections?.find(
        (entry) => Number(entry.month) === monthItem.value
      );
      return record ? Number(record.total) : 0;
    });
    return {
      labels: months.map((monthItem) => monthItem.label),
      datasets: [
        {
          label: 'Arrecadação mensal',
          data: dataset,
          backgroundColor: '#3c6ff7'
        }
      ]
    };
  }, [dashboard]);

  return (
    <section className={`panel dashboard-section${isBackgroundLoaded ? ' dashboard-section--loaded' : ' dashboard-section--loading'}`}>
      <div
        className="dashboard-section-background"
        data-testid="dashboard-section-background"
        style={{
          backgroundImage,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      <div className="dashboard-section-overlay" data-testid="dashboard-section-overlay" style={{ background: OVERLAY_COLOR }} />
      <div className="dashboard-section-content">
        <h2>Visão geral financeira</h2>
        {dashboardNote && (
          <div className="panel-note">
            <h3>Aviso do tesoureiro</h3>
            <p>{dashboardNote}</p>
          </div>
        )}
        <StatsGrid dashboard={dashboard} />
        <div className="chart-wrapper">
          <Bar
            data={chartData}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
        <GoalsGrid goals={goals} onEdit={onEditGoal} onDelete={onDeleteGoal} />
      </div>
    </section>
  );
}
