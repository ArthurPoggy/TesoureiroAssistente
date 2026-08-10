import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { ExpenseDetailView } from './ExpenseDetailView';

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

// Réplica do padrão de seleção de linha usado em MembersPanel: clicar na
// linha alterna a despesa selecionada (toggle), e os botões de ação
// interrompem a propagação para não disparar a seleção.
function ExpensesTable({ expenses, canEdit, selectedExpenseDetail, setSelectedExpenseDetail, onEdit, onDelete }) {
  const toggleSelection = (expense) => {
    setSelectedExpenseDetail(selectedExpenseDetail?.id === expense.id ? null : expense);
  };

  return (
    <table>
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
        {expenses.length === 0 ? (
          <tr>
            <td colSpan={canEdit ? 6 : 5} className="table-empty">
              Nenhuma despesa encontrada.
            </td>
          </tr>
        ) : (
          expenses.map((expense) => (
            <tr
              key={expense.id}
              className={selectedExpenseDetail?.id === expense.id ? 'selected' : ''}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleSelection(expense)}
            >
              <td>{expense.expense_date}</td>
              <td>{expense.title}</td>
              <td>{formatCurrency(expense.amount)}</td>
              <td>{expense.category}</td>
              <td><TagPills tags={expense.tags} /></td>
              {canEdit && (
                <td>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(expense);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(expense.id);
                    }}
                  >
                    Remover
                  </button>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
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
  selectedExpenseDetail,
  setSelectedExpenseDetail,
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
        <p>
          Controle de gastos por categoria.
          {expenses.length > 0 && ' Clique em uma despesa para ver os detalhes.'}
        </p>
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
        <ExpensesTable
          expenses={filteredExpenses}
          canEdit={canEdit}
          selectedExpenseDetail={selectedExpenseDetail}
          setSelectedExpenseDetail={setSelectedExpenseDetail}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {selectedExpenseDetail && <ExpenseDetailView expense={selectedExpenseDetail} />}
    </section>
  );
}
