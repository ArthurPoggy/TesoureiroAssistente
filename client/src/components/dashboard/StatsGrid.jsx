import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

export function StatsGrid({ dashboard }) {
  const { isAdmin } = useAuth();
  const showCurrentBalance = isAdmin && dashboard.currentBalance !== null && dashboard.currentBalance !== undefined;
  const balanceLabel = showCurrentBalance ? 'Saldo atual' : 'Saldo';
  const balanceValue = showCurrentBalance ? dashboard.currentBalance : dashboard.balance;

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
        <span>{balanceLabel}</span>
        <strong>{formatCurrency(balanceValue)}</strong>
      </article>
    </div>
  );
}
