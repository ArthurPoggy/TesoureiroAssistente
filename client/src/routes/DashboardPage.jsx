import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { parseMonthFilter, parseYearFilter, currentMonth, currentYear } from '../utils/formatters';
import { useDashboard, useClanHistory, useToast } from '../hooks';
import { useSharedData } from '../contexts/SharedDataContext';
import {
  Header,
  GoalsPanel,
  DelinquencyRanking,
  ReportsSection,
  ClanHistoryPanel,
  Toast
} from '../components';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Painel de dashboard carregado sob demanda (rota dedicada /dashboard).
const DashboardSection = lazy(() =>
  import('../components/dashboard/DashboardSection').then((mod) => ({ default: mod.DashboardSection }))
);

// Rota /dashboard: mantém, por ora, os módulos ainda não migrados para rotas
// próprias (metas, histórico do clã e relatórios). Membros, Pagamentos,
// Despesas, Eventos, Projetos, Extrato e Configurações passaram a ter suas
// próprias rotas (ver MembersPage, PaymentsPage, ExpensesPage, EventsPage,
// ProjectsPage, ExtratoPage, SettingsPage).
export function DashboardPage() {
  const { authToken, authChecked, authUser, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Estado de UI
  const { toast, showToast, handleError } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');

  // Membros, metas e configurações públicas vêm de SharedDataContext (já
  // carregados ao entrar na área autenticada, ver AppLayout); esta página só
  // consome os dados e as ações de CRUD de metas da mesma instância
  // compartilhada.
  const {
    members,
    goals,
    goalForm,
    setGoalForm,
    editingGoalId,
    resetGoalForm,
    handleGoalSubmit,
    handleGoalDelete,
    startEditGoal,
    publicSettings
  } = useSharedData();

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

  const {
    records: historyRecords,
    historyForm,
    setHistoryForm,
    editingHistoryId,
    fileInputKey: historyFileInputKey,
    loadRecords: loadHistory,
    resetHistoryForm,
    handleHistorySubmit,
    handleHistoryDelete,
    startEditHistory
  } = useClanHistory(showToast, handleError);

  // Carregar dados iniciais (membros, metas e configurações públicas já são
  // carregados por SharedDataProvider ao entrar na área autenticada)
  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadHistory();
  }, [authToken, authChecked, loadHistory]);

  // Recarregar dados filtrados
  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadDashboard();
    if (isAdmin) {
      loadDelinquent();
      loadRanking();
    }
  }, [selectedMonth, selectedYear, selectedMemberId, authToken, authChecked, isAdmin, loadDelinquent, loadRanking, loadDashboard]);

  const resetFilters = useCallback(() => {
    setSelectedMonth('all');
    setSelectedYear('');
  }, []);

  return (
    <div className="app-shell">
      <Header
        orgName={publicSettings.orgName}
        orgTagline={publicSettings.orgTagline}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        userFilterOptions={userFilterOptions}
        selectedUserFilter={selectedUserFilter}
        setSelectedUserFilter={setSelectedUserFilter}
        resetFilters={resetFilters}
        settingsOpen={false}
        onToggleSettings={() => navigate('/configuracoes')}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <DashboardSection
          dashboard={dashboard}
          goals={goals}
          onEditGoal={startEditGoal}
          onDeleteGoal={handleGoalDelete}
          dashboardNote={publicSettings.dashboardNote}
        />
      </Suspense>

      <GoalsPanel
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        editingGoalId={editingGoalId}
        onSubmit={handleGoalSubmit}
        onReset={resetGoalForm}
      />

      {isAdmin && <DelinquencyRanking delinquent={delinquent} ranking={ranking} />}

      <ClanHistoryPanel
        records={historyRecords}
        historyForm={historyForm}
        setHistoryForm={setHistoryForm}
        editingHistoryId={editingHistoryId}
        fileInputKey={historyFileInputKey}
        onSubmit={handleHistorySubmit}
        onDelete={handleHistoryDelete}
        onEdit={startEditHistory}
        onReset={resetHistoryForm}
      />

      {isAdmin && (
        <ReportsSection
          reportLoading={reportLoading}
          onExport={(format, type) => handleExport(format, type, showToast)}
        />
      )}

      <footer>
        {publicSettings.disclaimerText && <p className="disclaimer">{publicSettings.disclaimerText}</p>}
        <p className="credits">Desenvolvido por Tuzinho e Diego</p>
      </footer>
    </div>
  );
}
