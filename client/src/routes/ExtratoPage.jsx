import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMembers, useExtrato, useToast } from '../hooks';
import { Toast } from '../components';

// Painel de extrato carregado sob demanda (rota dedicada /extrato).
const ExtratoPanel = lazy(() =>
  import('../components/extrato/ExtratoPanel').then((mod) => ({ default: mod.ExtratoPanel }))
);

// Rota /extrato: extrato consolidado de movimentações, isolado em sua
// própria rota. O hook useExtrato segue funcionando como antes; membros são
// carregados aqui apenas para alimentar o filtro por membro (admin).
export function ExtratoPage() {
  const { authToken, authChecked, isAdmin } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const { members, loadMembers } = useMembers(showToast, handleError);

  const {
    entries,
    summary,
    loading,
    filters,
    setFilters,
    loadExtrato,
    exportExtrato
  } = useExtrato(handleError, isAdmin);

  useEffect(() => {
    if (!authToken || !authChecked || !isAdmin) return;
    loadMembers();
  }, [authToken, authChecked, isAdmin, loadMembers]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <ExtratoPanel
          entries={entries}
          summary={summary}
          loading={loading}
          filters={filters}
          setFilters={setFilters}
          onLoad={loadExtrato}
          onExport={exportExtrato}
          members={isAdmin ? members : []}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
}
