import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from './contexts/AuthContext';
import { parseMonthFilter, parseYearFilter, currentMonth, currentYear } from './utils/formatters';
import { useMembers, usePayments, useGoals, useExpenses, useEvents, useDashboard } from './hooks';
import {
  LoginScreen,
  AuthCheckingScreen,
  Header,
  DashboardSection,
  GoalsPanel,
  MembersPanel,
  PaymentsPanel,
  ExpensesPanel,
  EventsPanel,
  DelinquencyRanking,
  ReportsSection,
  Toast
} from './components';
import './styles/index.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function App() {
  const { authToken, authUser, authChecked, isAdmin } = useAuth();

  // Estado de UI
  const [toast, setToast] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleError = useCallback((error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  }, [showToast]);

  // Hooks de dados
  const {
    members,
    memberForm,
    setMemberForm,
    editingMemberId,
    selectedMemberDetail,
    setSelectedMemberDetail,
    inviteLink,
    setInviteLink,
    loadMembers,
    resetMemberForm,
    handleMemberSubmit,
    handleMemberInvite,
    handleMemberDelete,
    startEditMember
  } = useMembers(showToast, handleError);

  const { goals, goalForm, setGoalForm, editingGoalId, loadGoals, resetGoalForm, handleGoalSubmit, handleGoalDelete, startEditGoal } = useGoals(showToast, handleError);

  const { events, eventForm, setEventForm, editingEventId, loadEvents, resetEventForm, handleEventSubmit, handleEventDelete, startEditEvent } = useEvents(showToast, handleError);

  // Filtros computados
  const monthFilter = useMemo(() => parseMonthFilter(selectedMonth), [selectedMonth]);
  const yearFilter = useMemo(() => parseYearFilter(selectedYear), [selectedYear]);

  const userFilterOptions = useMemo(() => {
    if (isAdmin) {
      const options = [{ id: 'all', label: 'Todos', memberId: null }];
      members.forEach((member) => {
        options.push({
          id: `member-${member.id}`,
          label: member.name || member.email,
          memberId: member.id
        });
      });
      return options;
    }
    if (authUser.memberId) {
      const member = members.find((item) => item.id === authUser.memberId);
      return [
        {
          id: 'me',
          label: member?.name || authUser.name || authUser.email,
          memberId: authUser.memberId
        }
      ];
    }
    return [];
  }, [isAdmin, members, authUser]);

  useEffect(() => {
    if (!userFilterOptions.length) return;
    if (!userFilterOptions.some((option) => option.id === selectedUserFilter)) {
      setSelectedUserFilter(userFilterOptions[0].id);
    }
  }, [userFilterOptions, selectedUserFilter]);

  const selectedUser = useMemo(
    () => userFilterOptions.find((option) => option.id === selectedUserFilter) || userFilterOptions[0],
    [userFilterOptions, selectedUserFilter]
  );

  const selectedMemberId = useMemo(() => selectedUser?.memberId || null, [selectedUser]);

  const visibleMembers = useMemo(
    () => (selectedMemberId ? members.filter((member) => member.id === selectedMemberId) : members),
    [members, selectedMemberId]
  );

  // Hooks que dependem dos filtros
  const {
    payments,
    paymentForm,
    setPaymentForm,
    loading,
    submitting: paymentSubmitting,
    fileInputKey: paymentFileInputKey,
    loadPayments,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleReceipt
  } = usePayments(showToast, handleError, selectedMemberId, members);

  const {
    expenses,
    expenseForm,
    setExpenseForm,
    editingExpenseId,
    fileInputKey: expenseFileInputKey,
    loadExpenses,
    resetExpenseForm,
    handleExpenseSubmit,
    handleExpenseDelete,
    startEditExpense
  } = useExpenses(showToast, handleError, events);

  const {
    dashboard,
    delinquent,
    ranking,
    reportLoading,
    loadDashboard,
    loadDelinquent,
    loadRanking,
    handleExport
  } = useDashboard(handleError, monthFilter, yearFilter, selectedMemberId);

  // Carregar dados iniciais
  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadMembers();
    loadGoals();
    loadExpenses();
    loadEvents();
  }, [authToken, authChecked, loadMembers, loadGoals, loadExpenses, loadEvents]);

  // Recarregar dados filtrados
  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadPayments();
    loadDelinquent();
    loadRanking();
    loadDashboard();
  }, [selectedMonth, selectedYear, selectedMemberId, authToken, authChecked, loadPayments, loadDelinquent, loadRanking, loadDashboard]);

  const resetFilters = useCallback(() => {
    setSelectedMonth('all');
    setSelectedYear('');
  }, []);

  // Tela de login
  if (!authToken) {
    return <LoginScreen />;
  }

  // Verificando sessão
  if (!authChecked) {
    return <AuthCheckingScreen />;
  }

  // Callbacks para refresh
  const refreshAfterPayment = [loadDashboard, loadDelinquent, loadGoals, loadRanking];
  const refreshAfterExpense = [loadDashboard];

  return (
    <div className="app-shell">
      <Header
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        userFilterOptions={userFilterOptions}
        selectedUserFilter={selectedUserFilter}
        setSelectedUserFilter={setSelectedUserFilter}
        resetFilters={resetFilters}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <DashboardSection
        dashboard={dashboard}
        goals={goals}
        onEditGoal={startEditGoal}
        onDeleteGoal={handleGoalDelete}
      />

      <GoalsPanel
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        editingGoalId={editingGoalId}
        onSubmit={handleGoalSubmit}
        onReset={resetGoalForm}
      />

      <MembersPanel
        members={visibleMembers}
        memberForm={memberForm}
        setMemberForm={setMemberForm}
        editingMemberId={editingMemberId}
        selectedMemberDetail={selectedMemberDetail}
        setSelectedMemberDetail={setSelectedMemberDetail}
        inviteLink={inviteLink}
        setInviteLink={setInviteLink}
        onSubmit={handleMemberSubmit}
        onInvite={handleMemberInvite}
        onDelete={handleMemberDelete}
        onEdit={startEditMember}
        onReset={resetMemberForm}
        showToast={showToast}
      />

      <PaymentsPanel
        payments={payments}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        loading={loading}
        submitting={paymentSubmitting}
        members={members}
        goals={goals}
        onSubmit={(e) => handlePaymentSubmit(e, refreshAfterPayment)}
        onDelete={(id) => handlePaymentDelete(id, refreshAfterPayment)}
        onReceipt={handleReceipt}
        fileInputKey={paymentFileInputKey}
      />

      <section className="panel two-column">
        <ExpensesPanel
          expenses={expenses}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          editingExpenseId={editingExpenseId}
          fileInputKey={expenseFileInputKey}
          events={events}
          onSubmit={(e) => handleExpenseSubmit(e, refreshAfterExpense)}
          onDelete={(id) => handleExpenseDelete(id, refreshAfterExpense)}
          onEdit={startEditExpense}
          onReset={resetExpenseForm}
        />
        <EventsPanel
          events={events}
          eventForm={eventForm}
          setEventForm={setEventForm}
          editingEventId={editingEventId}
          onSubmit={handleEventSubmit}
          onDelete={handleEventDelete}
          onEdit={startEditEvent}
          onReset={resetEventForm}
        />
      </section>

      <DelinquencyRanking delinquent={delinquent} ranking={ranking} />

      {isAdmin && (
        <ReportsSection
          reportLoading={reportLoading}
          onExport={(format, type) => handleExport(format, type, showToast)}
        />
      )}

      <footer>
        <p>RF01-RF12 atendidos com dashboard visual, recibos, exportação e ranking.</p>
      </footer>
    </div>
  );
}

export default App;
