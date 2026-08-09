import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMembers, useGoals, usePayments, useSettings, useToast } from '../hooks';
import { Toast } from '../components';

// Painel de pagamentos carregado sob demanda (rota dedicada /pagamentos).
const PaymentsPanel = lazy(() =>
  import('../components/payments/PaymentsPanel').then((mod) => ({ default: mod.PaymentsPanel }))
);

// Rota /pagamentos: registro, filtros e recibos de pagamentos, isolados em
// sua própria rota. O hook usePayments segue funcionando como antes; membros,
// metas e configurações públicas são carregados aqui apenas para alimentar os
// seletores do formulário e as informações de pagamento do painel.
export function PaymentsPage() {
  const { authToken, authChecked } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const { members, loadMembers } = useMembers(showToast, handleError);
  const { goals, loadGoals } = useGoals(showToast, handleError);
  const { publicSettings, loadPublicSettings } = useSettings(showToast, handleError);

  const {
    payments,
    paymentForm,
    setPaymentForm,
    loading,
    submitting,
    fileInputKey,
    loadPayments,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleReceipt,
    handlePixCode,
    page,
    pageSize,
    total,
    filterMonth,
    filterYear,
    filterMemberId,
    setPage,
    onFilterMonthChange,
    onFilterYearChange,
    onFilterMemberChange,
    onPageSizeChange
  } = usePayments(showToast, handleError, null, members, publicSettings.defaultPaymentAmount);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadMembers();
    loadGoals();
    loadPublicSettings();
    loadPayments();
  }, [authToken, authChecked, loadMembers, loadGoals, loadPublicSettings, loadPayments]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <PaymentsPanel
          payments={payments}
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          loading={loading}
          submitting={submitting}
          members={members}
          goals={goals}
          paymentSettings={publicSettings}
          onSubmit={(e) => handlePaymentSubmit(e, [])}
          onDelete={(id) => handlePaymentDelete(id, [])}
          onReceipt={handleReceipt}
          onPix={handlePixCode}
          fileInputKey={fileInputKey}
          page={page}
          pageSize={pageSize}
          total={total}
          filterMonth={filterMonth}
          filterYear={filterYear}
          filterMemberId={filterMemberId}
          onPageChange={setPage}
          onPageSizeChange={onPageSizeChange}
          onFilterMonthChange={onFilterMonthChange}
          onFilterYearChange={onFilterYearChange}
          onFilterMemberChange={onFilterMemberChange}
        />
      </Suspense>
    </div>
  );
}
