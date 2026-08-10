import { lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useExtrato, useToast } from '../hooks';
import { useSharedData } from '../contexts/SharedDataContext';
import { Toast } from '../components';

// Painel de extrato carregado sob demanda (rota dedicada /extrato).
const ExtratoPanel = lazy(() =>
  import('../components/extrato/ExtratoPanel').then((mod) => ({ default: mod.ExtratoPanel }))
);

// Rota /extrato: extrato consolidado de movimentações, isolado em sua
// própria rota. O hook useExtrato segue funcionando como antes; membros vêm
// de SharedDataContext (já carregados ao entrar na área autenticada, ver
// AppLayout) e alimentam o filtro por membro (admin).
export function ExtratoPage() {
  const { isAdmin } = useAuth();
  const { toast, handleError } = useToast();

  const { members } = useSharedData();

  const {
    entries,
    summary,
    loading,
    filters,
    setFilters,
    loadExtrato,
    exportExtrato
  } = useExtrato(handleError, isAdmin);

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
