import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

function TagSelector({ tags = [], selectedIds = [], onChange, canEdit }) {
  const toggle = (id) => {
    if (!canEdit) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  if (!tags.length) return null;

  return (
    <div className="tag-selector">
      <span className="tag-selector-label">Tags</span>
      <div className="tag-selector-list">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`tag-chip${selectedIds.includes(tag.id) ? ' tag-chip--selected' : ''}${!canEdit ? ' tag-chip--readonly' : ''}`}
            onClick={() => toggle(tag.id)}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function TagPills({ tags }) {
  if (!tags || !tags.length) return null;
  return (
    <div className="tag-pills">
      {tags.map((tag) => (
        <span key={tag.id} className="tag-pill">
          {tag.name}
        </span>
      ))}
    </div>
  );
}

export function ExpensesPanel({
  expenses,
  expenseForm,
  setExpenseForm,
  editingExpenseId,
  fileInputKey,
  events,
  tags = [],
  onSubmit,
  onDelete,
  onEdit,
  onReset
}) {
  const { canEdit } = useAuth();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = useMemo(
    () => [...new Set(expenses.map((e) => e.category).filter(Boolean))].sort(),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!term) return true;
      const haystack = [expense.title, expense.category, expense.notes]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [expenses, search, categoryFilter]);

  return (
    <section className="panel">
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
            type="text"
            placeholder="Observações"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />
          <TagSelector
            tags={tags}
            selectedIds={expenseForm.tagIds || []}
            onChange={(ids) => setExpenseForm({ ...expenseForm, tagIds: ids })}
            canEdit={canEdit}
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

      <div className="table-toolbar">
        <div className="table-toolbar-filters">
          <input
            type="search"
            className="expenses-search"
            placeholder="Buscar despesas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar despesas"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="table-wrapper compact">
        <table className="expenses-table">
          <colgroup>
            <col className="col-date" />
            <col className="col-title" />
            <col className="col-amount" />
            <col className="col-category" />
            <col className="col-tags" />
            {canEdit && <col className="col-actions" />}
          </colgroup>
          <thead>
            <tr>
              <th>Data</th>
              <th>Título</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Tags</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="table-empty">
                  Nenhuma despesa encontrada.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>{expense.title}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{expense.category}</td>
                  <td><TagPills tags={expense.tags} /></td>
                  {canEdit && (
                    <td className="col-actions">
                      <button onClick={() => onEdit(expense)}>Editar</button>
                      <button className="ghost" onClick={() => onDelete(expense.id)}>
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
