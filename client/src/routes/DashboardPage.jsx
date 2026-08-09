import { lazy, Suspense, useEffect, useMemo, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { parseMonthFilter, parseYearFilter, currentMonth, currentYear } from '../utils/formatters';
import { useMembers, useGoals, useEvents, useDashboard, useSettings, useExtrato, useClanHistory, useTags, useProjects } from '../hooks';
import {
  Header,
  SettingsPanel,
  GoalsPanel,
  EventsPanel,
  DelinquencyRanking,
  ReportsSection,
  ExtratoPanel,
  ClanHistoryPanel,
  ProjectsPanel,
  Toast
} from '../components';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Painel de dashboard carregado sob demanda (rota dedicada /dashboard).
const DashboardSection = lazy(() =>
  import('../components/dashboard/DashboardSection').then((mod) => ({ default: mod.DashboardSection }))
);

// Rota /dashboard: mantém, por ora, os módulos ainda não migrados para rotas
// próprias (metas, eventos, configurações, extrato, histórico, projetos e
// relatórios). Membros, Pagamentos e Despesas passaram a ter suas próprias
// rotas (ver MembersPage, PaymentsPage, ExpensesPage).
export function DashboardPage() {
  const { authToken, authChecked, authUser, isAdmin } = useAuth();

  // Estado de UI
  const [toast, setToast] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleError = useCallback((error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  }, [showToast]);

  // Hooks de dados
  const { members, loadMembers } = useMembers(showToast, handleError);

  const { goals, goalForm, setGoalForm, editingGoalId, loadGoals, resetGoalForm, handleGoalSubmit, handleGoalDelete, startEditGoal } = useGoals(showToast, handleError);

  const { events, eventForm, setEventForm, editingEventId, loadEvents, resetEventForm, handleEventSubmit, handleEventDelete, startEditEvent } = useEvents(showToast, handleError);

  const {
    publicSettings,
    settingsForm,
    setSettingsForm,
    loading: settingsLoading,
    saving: settingsSaving,
    loadPublicSettings,
    loadSettings,
    saveSettings
  } = useSettings(showToast, handleError);

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
    projects,
    loading: projectsLoading,
    projectForm,
    setProjectForm,
    editingProjectId,
    saving: projectSaving,
    loadProjects,
    resetProjectForm,
    handleProjectSubmit,
    handleProjectDelete,
    startEditProject,
    addMemberToProject,
    removeMemberFromProject,
    filterName: projectFilterName,
    filterStatus: projectFilterStatus,
    filterStartDate: projectFilterStartDate,
    filterEndDate: projectFilterEndDate,
    filterMemberId: projectFilterMemberId,
    activeFiltersCount: projectActiveFiltersCount,
    onFilterNameChange: handleProjectFilterName,
    onFilterStatusChange: handleProjectFilterStatus,
    onFilterStartDateChange: handleProjectFilterStartDate,
    onFilterEndDateChange: handleProjectFilterEndDate,
    onFilterMemberIdChange: handleProjectFilterMemberId,
    onClearFilters: handleProjectClearFilters
  } = useProjects(showToast, handleError);

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

  const {
    entries: extratoEntries,
    summary: extratoSummary,
    loading: extratoLoading,
    filters: extratoFilters,
    setFilters: setExtratoFilters,
    loadExtrato,
    exportExtrato
  } = useExtrato(handleError, isAdmin);

  const { tags, loadTags } = useTags(showToast, handleError);

  // Carregar dados iniciais
  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadMembers();
    loadGoals();
    loadEvents();
    loadHistory();
    loadTags();
    loadProjects();
  }, [authToken, authChecked, loadMembers, loadGoals, loadEvents, loadHistory, loadTags, loadProjects]);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadPublicSettings();
  }, [authToken, authChecked, loadPublicSettings]);

  useEffect(() => {
    if (!authToken || !authChecked || !isAdmin || !showSettings) return;
    loadSettings();
  }, [authToken, authChecked, isAdmin, loadSettings, showSettings]);

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
        settingsOpen={showSettings}
        onToggleSettings={() => setShowSettings((value) => !value)}
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

      {showSettings && isAdmin && (
        <SettingsPanel
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          loading={settingsLoading}
          saving={settingsSaving}
          onSave={async () => {
            const saved = await saveSettings();
            if (saved) {
              loadDashboard();
            }
          }}
          onClose={() => setShowSettings(false)}
          showToast={showToast}
          handleError={handleError}
        />
      )}

      <GoalsPanel
        goalForm={goalForm}
        setGoalForm={setGoalForm}
        editingGoalId={editingGoalId}
        onSubmit={handleGoalSubmit}
        onReset={resetGoalForm}
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

      {isAdmin && <DelinquencyRanking delinquent={delinquent} ranking={ranking} />}

      <ProjectsPanel
        projects={projects}
        loading={projectsLoading}
        projectForm={projectForm}
        setProjectForm={setProjectForm}
        editingProjectId={editingProjectId}
        members={members}
        saving={projectSaving}
        onSubmit={handleProjectSubmit}
        onDelete={handleProjectDelete}
        onEdit={startEditProject}
        onReset={resetProjectForm}
        onAddMember={addMemberToProject}
        onRemoveMember={removeMemberFromProject}
        filterName={projectFilterName}
        filterStatus={projectFilterStatus}
        filterStartDate={projectFilterStartDate}
        filterEndDate={projectFilterEndDate}
        filterMemberId={projectFilterMemberId}
        activeFiltersCount={projectActiveFiltersCount}
        onFilterNameChange={handleProjectFilterName}
        onFilterStatusChange={handleProjectFilterStatus}
        onFilterStartDateChange={handleProjectFilterStartDate}
        onFilterEndDateChange={handleProjectFilterEndDate}
        onFilterMemberIdChange={handleProjectFilterMemberId}
        onClearFilters={handleProjectClearFilters}
        tags={tags}
      />

      <ExtratoPanel
        entries={extratoEntries}
        summary={extratoSummary}
        loading={extratoLoading}
        filters={extratoFilters}
        setFilters={setExtratoFilters}
        onLoad={loadExtrato}
        onExport={exportExtrato}
        members={isAdmin ? members : []}
        isAdmin={isAdmin}
      />

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
