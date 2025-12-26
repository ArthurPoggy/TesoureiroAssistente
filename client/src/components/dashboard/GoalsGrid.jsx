import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

export function GoalsGrid({ goals, onEdit, onDelete }) {
  const { canEdit } = useAuth();

  if (goals.length === 0) {
    return <p>Cadastre metas para acompanhar o progresso.</p>;
  }

  return (
    <div className="goals-grid">
      {goals.map((goal) => (
        <article key={goal.id} className="goal-card">
          <div className="goal-header">
            <h3>{goal.title}</h3>
            <span>{goal.deadline || 'Sem prazo'}</span>
          </div>
          <p>{goal.description}</p>
          <p>
            {formatCurrency(goal.raised)} / {formatCurrency(goal.target_amount || goal.targetAmount)}
          </p>
          <div className="progress">
            <div style={{ width: `${goal.progress || 0}%` }} />
          </div>
          {canEdit && (
            <div className="goal-actions">
              <button onClick={() => onEdit(goal)}>Editar</button>
              <button className="ghost" onClick={() => onDelete(goal.id)}>
                Remover
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
