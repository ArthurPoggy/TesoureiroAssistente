import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { months } from '../../utils/formatters';
import { StatsGrid } from './StatsGrid';
import { GoalsGrid } from './GoalsGrid';

export function DashboardSection({ dashboard, goals, onEditGoal, onDeleteGoal }) {
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
    <section className="panel">
      <h2>Visão geral financeira</h2>
      <StatsGrid dashboard={dashboard} />
      <div className="chart-wrapper">
        <Bar
          data={chartData}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </div>
      <GoalsGrid goals={goals} onEdit={onEditGoal} onDelete={onDeleteGoal} />
    </section>
  );
}
