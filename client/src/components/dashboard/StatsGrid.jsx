import { formatCurrency } from '../../utils/formatters';

export function StatsGrid({ dashboard }) {
  return (
    <div className="stats-grid">
      <article className="stat-card">
        <span>Total arrecadado</span>
        <strong>{formatCurrency(dashboard.totalRaised)}</strong>
      </article>
      <article className="stat-card">
        <span>Despesas</span>
        <strong>{formatCurrency(dashboard.totalExpenses)}</strong>
      </article>
      <article className="stat-card">
        <span>Saldo</span>
        <strong>{formatCurrency(dashboard.balance)}</strong>
      </article>
    </div>
  );
}
