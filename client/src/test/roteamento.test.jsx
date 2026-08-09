import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// App.jsx ainda depende dos hooks de dados atuais (painéis não foram movidos
// para rotas próprias nesta subtask). Eles são mockados para isolar o teste
// do comportamento de roteamento, sem depender de chamadas de rede reais.
vi.mock('../hooks', () => ({
  useMembers: () => ({
    members: [],
    memberForm: {},
    setMemberForm: vi.fn(),
    editingMemberId: null,
    selectedMemberDetail: null,
    setSelectedMemberDetail: vi.fn(),
    inviteLink: '',
    setInviteLink: vi.fn(),
    loadMembers: vi.fn(),
    resetMemberForm: vi.fn(),
    handleMemberSubmit: vi.fn(),
    handleMemberInvite: vi.fn(),
    handleMemberDelete: vi.fn(),
    handleRoleChange: vi.fn(),
    startEditMember: vi.fn()
  }),
  usePayments: () => ({
    payments: [],
    paymentForm: {},
    setPaymentForm: vi.fn(),
    loading: false,
    submitting: false,
    fileInputKey: 0,
    loadPayments: vi.fn(),
    handlePaymentSubmit: vi.fn(),
    handlePaymentDelete: vi.fn(),
    handleReceipt: vi.fn(),
    handlePixCode: vi.fn(),
    page: 1,
    pageSize: 10,
    total: 0,
    filterMonth: '',
    filterYear: '',
    filterMemberId: null,
    setPage: vi.fn(),
    onFilterMonthChange: vi.fn(),
    onFilterYearChange: vi.fn(),
    onFilterMemberChange: vi.fn(),
    onPageSizeChange: vi.fn()
  }),
  useGoals: () => ({
    goals: [],
    goalForm: {},
    setGoalForm: vi.fn(),
    editingGoalId: null,
    loadGoals: vi.fn(),
    resetGoalForm: vi.fn(),
    handleGoalSubmit: vi.fn(),
    handleGoalDelete: vi.fn(),
    startEditGoal: vi.fn()
  }),
  useExpenses: () => ({
    expenses: [],
    expenseForm: {},
    setExpenseForm: vi.fn(),
    editingExpenseId: null,
    fileInputKey: 0,
    loadExpenses: vi.fn(),
    resetExpenseForm: vi.fn(),
    handleExpenseSubmit: vi.fn(),
    handleExpenseDelete: vi.fn(),
    startEditExpense: vi.fn()
  }),
  useEvents: () => ({
    events: [],
    eventForm: {},
    setEventForm: vi.fn(),
    editingEventId: null,
    loadEvents: vi.fn(),
    resetEventForm: vi.fn(),
    handleEventSubmit: vi.fn(),
    handleEventDelete: vi.fn(),
    startEditEvent: vi.fn()
  }),
  useFiles: () => ({}),
  useDashboard: () => ({
    dashboard: {},
    delinquent: [],
    ranking: [],
    reportLoading: false,
    loadDashboard: vi.fn(),
    loadDelinquent: vi.fn(),
    loadRanking: vi.fn(),
    handleExport: vi.fn()
  }),
  useSettings: () => ({
    publicSettings: {},
    settingsForm: {},
    setSettingsForm: vi.fn(),
    loading: false,
    saving: false,
    loadPublicSettings: vi.fn(),
    loadSettings: vi.fn(),
    saveSettings: vi.fn()
  }),
  useExtrato: () => ({
    entries: [],
    summary: {},
    loading: false,
    filters: {},
    setFilters: vi.fn(),
    loadExtrato: vi.fn(),
    exportExtrato: vi.fn()
  }),
  useClanHistory: () => ({
    records: [],
    historyForm: {},
    setHistoryForm: vi.fn(),
    editingHistoryId: null,
    fileInputKey: 0,
    loadRecords: vi.fn(),
    resetHistoryForm: vi.fn(),
    handleHistorySubmit: vi.fn(),
    handleHistoryDelete: vi.fn(),
    startEditHistory: vi.fn()
  }),
  useTags: () => ({ tags: [], loadTags: vi.fn() }),
  useProjects: () => ({
    projects: [],
    loading: false,
    projectForm: {},
    setProjectForm: vi.fn(),
    editingProjectId: null,
    saving: false,
    loadProjects: vi.fn(),
    resetProjectForm: vi.fn(),
    handleProjectSubmit: vi.fn(),
    handleProjectDelete: vi.fn(),
    startEditProject: vi.fn(),
    addMemberToProject: vi.fn(),
    removeMemberFromProject: vi.fn(),
    filterName: '',
    filterStatus: '',
    filterStartDate: '',
    filterEndDate: '',
    filterMemberId: null,
    activeFiltersCount: 0,
    onFilterNameChange: vi.fn(),
    onFilterStatusChange: vi.fn(),
    onFilterStartDateChange: vi.fn(),
    onFilterEndDateChange: vi.fn(),
    onFilterMemberIdChange: vi.fn(),
    onClearFilters: vi.fn()
  })
}));

import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { RoleRoute } from '../routes/RoleRoute';
import App from '../App';

// Componente sonda: exibe o pathname atual da navegação, independente do que
// a árvore de rotas efetivamente renderiza — permite verificar redirecionamentos
// sem acoplar o teste ao conteúdo visual de cada painel.
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

describe('Fundação de roteamento — guards e esqueleto de navegação', () => {
  it('(a) redireciona para /login quando o usuário não está autenticado em rota protegida', () => {
    useAuth.mockReturnValue({
      authToken: null,
      authUser: { role: null, email: '', name: '', memberId: null },
      authChecked: true
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Tela de login</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Conteúdo protegido</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Tela de login')).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo protegido')).not.toBeInTheDocument();
  });

  it("(b) redireciona '/' para '/dashboard' quando o usuário está autenticado", () => {
    useAuth.mockReturnValue({
      authToken: 'token-valido',
      authUser: { role: 'admin', email: 'a@a.com', name: 'Admin', memberId: 1 },
      authChecked: true,
      isAdmin: true,
      isDiretor: false,
      canEdit: true,
      memberId: 1,
      apiFetch: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      setupPassword: vi.fn(),
      logout: vi.fn()
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard');
  });

  it('(c) bloqueia o viewer ao tentar acessar rota restrita a diretor_financeiro/admin', () => {
    useAuth.mockReturnValue({
      authToken: 'token-valido',
      authUser: { role: 'viewer', email: 'v@v.com', name: 'Viewer', memberId: 2 },
      authChecked: true
    });

    render(
      <MemoryRouter initialEntries={['/relatorios']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/acesso-negado" element={<div>Acesso negado</div>} />
          <Route
            element={<RoleRoute allowedRoles={['admin', 'diretor_financeiro']} />}
          >
            <Route path="/relatorios" element={<div>Relatórios restritos</div>} />
          </Route>
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    );

    expect(screen.queryByText('Relatórios restritos')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).not.toHaveTextContent('/relatorios');
  });
});
