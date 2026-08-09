import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Espiões para confirmar que os dados de cada módulo são carregados quando a
// rota é acessada diretamente por URL, sem passar pelo menu de navegação.
const loadEvents = vi.fn();
const loadProjects = vi.fn();
const loadExtrato = vi.fn();
const loadPublicSettings = vi.fn();
const loadSettings = vi.fn();

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
  })
}));

import { useAuth } from '../contexts/AuthContext';
import App from '../App';

// Sonda de localização: confirma que a rota acessada diretamente não é
// redirecionada para outra (ex.: /eventos não deve cair de volta em /dashboard).
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
  apiFetch: vi.fn().mockResolvedValue({ connected: false, source: 'none' }),
  login: vi.fn(),
  register: vi.fn(),
  setupPassword: vi.fn(),
  logout: vi.fn()
};

const VIEWER_AUTH = {
  authToken: 'token-valido',
  authUser: { role: 'viewer', email: 'v@v.com', name: 'Viewer', memberId: 2 },
  authChecked: true,
  isAdmin: false,
  isDiretor: false,
  canEdit: false,
  memberId: 2,
  apiFetch: vi.fn().mockResolvedValue({ connected: false, source: 'none' }),
  login: vi.fn(),
  register: vi.fn(),
  setupPassword: vi.fn(),
  logout: vi.fn()
};

// Cabeçalhos que identificam, de forma inequívoca, cada painel de módulo.
const HEADINGS = {
  eventos: 'Eventos',
  projetos: 'Projetos',
  extrato: 'Extrato de Movimentações',
  configuracoes: 'Configurações'
};

function renderAt(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('Rotas dedicadas por módulo (eventos, projetos, extrato, configurações)', () => {
  it('acesso direto a /eventos renderiza somente o painel de eventos e carrega os eventos', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/eventos');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/eventos');
    await waitFor(() => expect(screen.getByText(HEADINGS.eventos)).toBeInTheDocument());
    expect(screen.queryByText(HEADINGS.projetos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.extrato)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.configuracoes)).not.toBeInTheDocument();
    await waitFor(() => expect(loadEvents).toHaveBeenCalled());
  });

  it('acesso direto a /projetos renderiza somente o painel de projetos e carrega os projetos', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/projetos');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/projetos');
    await waitFor(() => expect(screen.getByText(HEADINGS.projetos)).toBeInTheDocument());
    expect(screen.queryByText(HEADINGS.eventos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.extrato)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.configuracoes)).not.toBeInTheDocument();
    await waitFor(() => expect(loadProjects).toHaveBeenCalled());
  });

  it('acesso direto a /extrato renderiza somente o painel de extrato e carrega o extrato', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/extrato');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/extrato');
    await waitFor(() => expect(screen.getByText(HEADINGS.extrato)).toBeInTheDocument());
    expect(screen.queryByText(HEADINGS.eventos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.projetos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.configuracoes)).not.toBeInTheDocument();
    await waitFor(() => expect(loadExtrato).toHaveBeenCalled());
  });

  it('acesso direto a /configuracoes (admin) renderiza somente o painel de configurações e carrega as configurações', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);
    renderAt('/configuracoes');

    expect(screen.getByTestId('current-path')).toHaveTextContent('/configuracoes');
    await waitFor(() => expect(screen.getByText(HEADINGS.configuracoes)).toBeInTheDocument());
    expect(screen.queryByText(HEADINGS.eventos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.projetos)).not.toBeInTheDocument();
    expect(screen.queryByText(HEADINGS.extrato)).not.toBeInTheDocument();
    await waitFor(() => expect(loadSettings).toHaveBeenCalled());
  });

  it('bloqueia o viewer ao digitar /configuracoes diretamente na URL, mesmo sem passar pelo menu', async () => {
    useAuth.mockReturnValue(VIEWER_AUTH);
    renderAt('/configuracoes');

    await waitFor(() => expect(screen.getByText('Acesso negado')).toBeInTheDocument());
    expect(screen.getByTestId('current-path')).not.toHaveTextContent('/configuracoes');
    expect(screen.queryByText(HEADINGS.configuracoes)).not.toBeInTheDocument();
  });
});
