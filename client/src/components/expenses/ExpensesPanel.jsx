import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';

export function ExpensesPanel({
  expenses,
  expenseForm,
  setExpenseForm,
  editingExpenseId,
  fileInputKey,
  events,
  onSubmit,
  onDelete,
  onEdit,
  onReset
}) {
  const { canEdit } = useAuth();

  return (
    <div>
      <div className="panel-header">
        <h2>Despesas</h2>
        <p>Controle de gastos por categoria.</p>
      </div>

      {canEdit ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            placeholder="Descrição"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Valor"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            required
          />
          <input
            type="date"
            value={expenseForm.expenseDate}
            onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
            required
          />
          <input
            placeholder="Categoria"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
          />
          <select
            value={expenseForm.eventId}
            onChange={(e) => setExpenseForm({ ...expenseForm, eventId: e.target.value })}
          >
            <option value="">Evento associado</option>
            {events.map((eventItem) => (
              <option key={eventItem.id} value={eventItem.id}>
                {eventItem.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Observações"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />
          <input
            placeholder="Nome do anexo (opcional)"
            value={expenseForm.attachmentName}
            onChange={(e) => setExpenseForm({ ...expenseForm, attachmentName: e.target.value })}
          />
          <input
            key={fileInputKey}
            type="file"
            onChange={(e) =>
              setExpenseForm({
                ...expenseForm,
                attachmentFile: e.target.files ? e.target.files[0] : null
              })
            }
            required={!editingExpenseId}
          />
          <div className="form-actions">
            <button type="submit">{editingExpenseId ? 'Atualizar' : 'Salvar despesa'}</button>
            {editingExpenseId && (
              <button type="button" className="ghost" onClick={onReset}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="lock-hint">Somente o tesoureiro pode registrar despesas.</p>
      )}

      <div className="table-wrapper compact">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Título</th>
              <th>Valor</th>
              <th>Categoria</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td>{expense.expense_date}</td>
                <td>{expense.title}</td>
                <td>{formatCurrency(expense.amount)}</td>
                <td>{expense.category}</td>
                {canEdit && (
                  <td>
                    <button onClick={() => onEdit(expense)}>Editar</button>
                    <button className="ghost" onClick={() => onDelete(expense.id)}>
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
