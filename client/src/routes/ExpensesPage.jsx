import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents, useExpenses, useTags, useToast } from '../hooks';
import { Toast } from '../components';

// Painel de despesas carregado sob demanda (rota dedicada /despesas).
const ExpensesPanel = lazy(() =>
  import('../components/expenses/ExpensesPanel').then((mod) => ({ default: mod.ExpensesPanel }))
);

// Rota /despesas: registro e filtros de despesas, isolados em sua própria
// rota. O hook useExpenses segue funcionando como antes; eventos e tags são
// carregados aqui apenas para alimentar os seletores do formulário.
export function ExpensesPage() {
  const { authToken, authChecked } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const { events, loadEvents } = useEvents(showToast, handleError);
  const { tags, loadTags } = useTags(showToast, handleError);

  const {
    expenses,
    expenseForm,
    setExpenseForm,
    editingExpenseId,
    fileInputKey,
    loadExpenses,
    resetExpenseForm,
    handleExpenseSubmit,
    handleExpenseDelete,
    startEditExpense
  } = useExpenses(showToast, handleError, events);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadEvents();
    loadTags();
    loadExpenses();
  }, [authToken, authChecked, loadEvents, loadTags, loadExpenses]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <ExpensesPanel
          expenses={expenses}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          editingExpenseId={editingExpenseId}
          fileInputKey={fileInputKey}
          events={events}
          tags={tags}
          onSubmit={(e) => handleExpenseSubmit(e, [])}
          onDelete={(id) => handleExpenseDelete(id, [])}
          onEdit={startEditExpense}
          onReset={resetExpenseForm}
        />
      </Suspense>
    </div>
  );
}
