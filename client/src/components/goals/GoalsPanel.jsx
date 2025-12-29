import { useAuth } from '../../contexts/AuthContext';

export function GoalsPanel({ goalForm, setGoalForm, editingGoalId, onSubmit, onReset }) {
  const { canEdit } = useAuth();

  if (!canEdit) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Definição de metas</h2>
        <p>Crie metas financeiras para acompanhar o progresso.</p>
      </div>

      <form className="form-grid" onSubmit={onSubmit}>
        <input
          placeholder="Título da meta"
          value={goalForm.title}
          onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Valor alvo"
          value={goalForm.targetAmount}
          onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
          required
        />
        <input
          type="date"
          value={goalForm.deadline}
          onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
        />
        <textarea
          placeholder="Descrição (opcional)"
          value={goalForm.description}
          onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
        />
        <div className="form-actions">
          <button type="submit">{editingGoalId ? 'Atualizar meta' : 'Salvar meta'}</button>
          {editingGoalId && (
            <button type="button" className="ghost" onClick={onReset}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
