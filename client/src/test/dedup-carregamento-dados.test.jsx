import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Espiões para confirmar que membros, metas e configurações públicas — cada
// um compartilhado por várias rotas migradas (DashboardPage, PaymentsPage,
// MembersPage, ProjectsPage, ExtratoPage) — são buscados uma única vez ao
// entrar na área autenticada, e não de novo a cada navegação entre essas
// rotas. Ver SharedDataContext.
const loadMembers = vi.fn();
const loadGoals = vi.fn();
const loadPublicSettings = vi.fn();

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
    loadPublicSettings,
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
  }),
  useToast: () => ({
    toast: null,
    showToast: vi.fn(),
    handleError: vi.fn()
  })
}));

import { useAuth } from '../contexts/AuthContext';
import App from '../App';

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

describe('Deduplicação de carregamento entre rotas (SharedDataContext)', () => {
  it('carrega membros, metas e configurações públicas uma única vez ao navegar entre /dashboard, /membros e /pagamentos', async () => {
    useAuth.mockReturnValue(ADMIN_AUTH);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => expect(loadMembers).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(loadGoals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(loadPublicSettings).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('link', { name: 'Membros' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Membros' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('link', { name: 'Pagamentos' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Pagamentos mensais' })).toBeInTheDocument());

    // Nenhuma busca redundante: mesmo tendo passado por três rotas que
    // consomem membros/metas/configurações públicas, cada recurso foi
    // buscado uma única vez.
    expect(loadMembers).toHaveBeenCalledTimes(1);
    expect(loadGoals).toHaveBeenCalledTimes(1);
    expect(loadPublicSettings).toHaveBeenCalledTimes(1);
  });
});
