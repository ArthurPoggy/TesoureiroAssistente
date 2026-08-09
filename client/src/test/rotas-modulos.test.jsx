import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Espiões para confirmar que os dados de cada módulo são carregados quando a
// rota é acessada diretamente por URL, sem passar pelo menu de navegação.
const loadMembers = vi.fn();
const loadPayments = vi.fn();
const loadExpenses = vi.fn();
const loadDashboard = vi.fn();
const loadGoals = vi.fn();
const loadEvents = vi.fn();
const loadPublicSettings = vi.fn();
const loadSettings = vi.fn();
const loadExtrato = vi.fn();
const loadRecords = vi.fn();
const loadTags = vi.fn();
const loadProjects = vi.fn();
const loadDelinquent = vi.fn();
const loadRanking = vi.fn();

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
    loadMembers,
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
    loadPayments,
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
    loadGoals,
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
    loadExpenses,
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
    loadEvents,
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
    loadDashboard,
    loadDelinquent,
    loadRanking,
    handleExport: vi.fn()
  }),
  useSettings: () => ({
    publicSettings: {},
    settingsForm: {},
    setSettingsForm: vi.fn(),
    loading: false,
    saving: false,
    loadPublicSettings,
    loadSettings,
    saveSettings: vi.fn()
  }),
  useExtrato: () => ({
    entries: [],
    summary: {},
    loading: false,
    filters: {},
    setFilters: vi.fn(),
    loadExtrato,
    exportExtrato: vi.fn()
  }),
  useClanHistory: () => ({
    records: [],
    historyForm: {},
    setHistoryForm: vi.fn(),
    editingHistoryId: null,
    fileInputKey: 0,
    loadRecords,
    resetHistoryForm: vi.fn(),
    handleHistorySubmit: vi.fn(),
    handleHistoryDelete: vi.fn(),
    startEditHistory: vi.fn()
  }),
  useTags: () => ({ tags: [], loadTags }),
  useProjects: () => ({
    projects: [],
    loading: false,
    projectForm: {},
    setProjectForm: vi.fn(),
    editingProjectId: null,
    saving: false,
    loadProjects,
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
  }),
  useToast: () => ({
    toast: null,
    showToast: vi.fn(),
    handleError: vi.fn()
  })
}));

import { useAuth } from '../contexts/AuthContext';
import App from '../App';

// Sonda de localização: confirma que a rota acessada diretamente não é
// redirecionada para outra (ex.: /membros não deve cair de volta em /dashboard).
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="current-path">{location.pathname}</div>;
}

const ADMIN_AUTH = {
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
};

// Cabeçalhos que identificam, de forma inequívoca, cada painel de módulo.
const HEADINGS = {
  dashboard: 'Visão geral financeira',
  membros: 'Membros',
  pagamentos: 'Pagamentos mensais',
  despesas: 'Despesas'
};

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('Rotas dedicadas por módulo (dashboard, membros, pagamentos, despesas)', () => {
  it('acesso direto a /dashboard renderiza somente o painel de dashboard e carrega seus dados', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/dashboard');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard');
    await waitFor(() => expect(screen.getByRole('heading', { name: HEADINGS.dashboard })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: HEADINGS.membros })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.pagamentos })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.despesas })).not.toBeInTheDocument();
    await waitFor(() => expect(loadDashboard).toHaveBeenCalled());
  });

  it('acesso direto a /membros (sem passar pelo menu) renderiza somente MembersPanel e carrega os membros', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/membros');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/membros');
    await waitFor(() => expect(screen.getByRole('heading', { name: HEADINGS.membros })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: HEADINGS.dashboard })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.pagamentos })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.despesas })).not.toBeInTheDocument();
    await waitFor(() => expect(loadMembers).toHaveBeenCalled());
  });

  it('acesso direto a /pagamentos (sem passar pelo menu) renderiza somente PaymentsPanel e carrega os pagamentos', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/pagamentos');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/pagamentos');
    await waitFor(() => expect(screen.getByRole('heading', { name: HEADINGS.pagamentos })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: HEADINGS.dashboard })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.membros })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.despesas })).not.toBeInTheDocument();
    await waitFor(() => expect(loadPayments).toHaveBeenCalled());
  });

  it('acesso direto a /despesas (sem passar pelo menu) renderiza somente ExpensesPanel e carrega as despesas', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/despesas');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/despesas');
    await waitFor(() => expect(screen.getByRole('heading', { name: HEADINGS.despesas })).toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: HEADINGS.dashboard })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.membros })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: HEADINGS.pagamentos })).not.toBeInTheDocument();
    await waitFor(() => expect(loadExpenses).toHaveBeenCalled());
  });
});
