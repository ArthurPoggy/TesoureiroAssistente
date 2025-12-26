import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import './App.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const months = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' }
];

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const fetchJSON = async (url, options = {}) => {
  const config = { ...options };
  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }
  const headers = { ...(options.headers || {}) };
  if (config.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (Object.keys(headers).length) {
    config.headers = headers;
  }
  const response = await fetch(url, config);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Não foi possível completar a ação.');
  }
  return response.json();
};

const downloadBinary = async (url, filename, token) => {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error('Falha ao gerar arquivo');
  }
  const blob = await res.blob();
  const fileUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(fileUrl);
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value = 0) => BRL.format(value || 0);

function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('tesoureiro_token'));
  const [authUser, setAuthUser] = useState({ role: null, email: '', name: '', memberId: null });
  const [authChecked, setAuthChecked] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [authMode, setAuthMode] = useState('login');
  const [setupToken, setSetupToken] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', nickname: '' });
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    month: currentMonth,
    year: currentYear,
    amount: 100,
    paid: true,
    paidAt: new Date().toISOString().slice(0, 10),
    notes: '',
    goalId: ''
  });
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [goals, setGoals] = useState([]);
  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    deadline: '',
    description: ''
  });
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    category: '',
    notes: '',
    eventId: ''
  });
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    name: '',
    eventDate: new Date().toISOString().slice(0, 10),
    raisedAmount: '',
    spentAmount: '',
    description: ''
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [dashboard, setDashboard] = useState({
    totalRaised: 0,
    totalExpenses: 0,
    balance: 0,
    monthlyCollections: [],
    goals: [],
    delinquentMembers: [],
    ranking: []
  });
  const [delinquent, setDelinquent] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');
  const isAdmin = authUser.role === 'admin';
  const canEdit = isAdmin;

  const userFilterOptions = useMemo(() => {
    const options = [{ id: 'all', label: 'Todos', memberId: null }];
    if (isAdmin) {
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
      options.push({
        id: 'me',
        label: member?.name || authUser.name || authUser.email,
        memberId: authUser.memberId
      });
    }
    return options;
  }, [isAdmin, members, authUser]);

  useEffect(() => {
    if (!userFilterOptions.some((option) => option.id === selectedUserFilter)) {
      setSelectedUserFilter('all');
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

  const apiFetch = useCallback(
    (url, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }
      return fetchJSON(url, { ...options, headers });
    },
    [authToken]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    if (setup) {
      setSetupToken(setup);
      setAuthMode('setup');
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleError = (error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setAuthLoading(true);
      const data = await fetchJSON('/api/login', { method: 'POST', body: loginForm });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email || loginForm.email,
        name: data.name || '',
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      setLoginForm({ email: '', password: '' });
      setAuthMode('login');
      showToast('Login realizado');
    } catch (error) {
      handleError(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setAuthUser({ role: null, email: '', name: '', memberId: null });
    setAuthChecked(true);
    localStorage.removeItem('tesoureiro_token');
    setAuthMode('login');
    setSetupToken('');
    setSelectedUserFilter('all');
    showToast('Sessão encerrada');
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('As senhas não conferem', 'error');
      return;
    }
    try {
      setAuthLoading(true);
      const payload = {
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password
      };
      const data = await fetchJSON('/api/register', { method: 'POST', body: payload });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email || registerForm.email,
        name: registerForm.name,
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      showToast('Conta criada com sucesso');
    } catch (error) {
      handleError(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetupPassword = async (event) => {
    event.preventDefault();
    if (!setupToken) {
      showToast('Informe o token de acesso', 'error');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('As senhas não conferem', 'error');
      return;
    }
    try {
      setAuthLoading(true);
      const payload = { token: setupToken, password: registerForm.password };
      const data = await fetchJSON('/api/setup-password', { method: 'POST', body: payload });
      setAuthToken(data.token);
      localStorage.setItem('tesoureiro_token', data.token);
      setAuthUser({
        role: data.role,
        email: data.email,
        name: data.name || '',
        memberId: data.memberId ?? null
      });
      setAuthChecked(true);
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      setAuthMode('login');
      setSetupToken('');
      showToast('Senha definida com sucesso');
    } catch (error) {
      handleError(error);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await apiFetch('/api/members');
      const list = data.members || [];
      setMembers(list);
      if (selectedMemberDetail) {
        const updated = list.find((member) => member.id === selectedMemberDetail.id);
        setSelectedMemberDetail(updated || null);
      }
    } catch (error) {
      handleError(error);
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/payments?${params.toString()}`);
      setPayments(data.payments || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    try {
      const data = await apiFetch('/api/goals');
      setGoals(data.goals || []);
    } catch (error) {
      handleError(error);
    }
  };

  const loadExpenses = async () => {
    try {
      const data = await apiFetch('/api/expenses');
      setExpenses(data.expenses || []);
    } catch (error) {
      handleError(error);
    }
  };

  const loadEvents = async () => {
    try {
      const data = await apiFetch('/api/events');
      setEvents(data.events || []);
    } catch (error) {
      handleError(error);
    }
  };

  const loadDelinquent = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/members/delinquent?${params.toString()}`);
      setDelinquent(data.members || []);
    } catch (error) {
      handleError(error);
    }
  };

  const loadRanking = async () => {
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/ranking?${params.toString()}`);
      setRanking(data.ranking || []);
    } catch (error) {
      handleError(error);
    }
  };

  const loadDashboard = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/dashboard?${params.toString()}`);
      setDashboard(data);
    } catch (error) {
      handleError(error);
    }
  };

  useEffect(() => {
    if (!authToken) {
      setAuthUser({ role: null, email: '', name: '', memberId: null });
      setAuthChecked(true);
      return;
    }
    let canceled = false;
    apiFetch('/api/me')
      .then((data) => {
        if (!canceled) {
          setAuthUser({
            role: data.role,
            email: data.email,
            name: data.name || '',
            memberId: data.memberId ?? null
          });
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!canceled) {
          setAuthUser({ role: null, email: '', name: '', memberId: null });
          setAuthToken(null);
          localStorage.removeItem('tesoureiro_token');
          setAuthChecked(true);
        }
      });
    return () => {
      canceled = true;
    };
  }, [authToken, apiFetch]);

  useEffect(() => {
    if (!authToken || !authChecked) {
      return;
    }
    loadMembers();
    loadGoals();
    loadExpenses();
    loadEvents();
  }, [authToken, authChecked]);

  useEffect(() => {
    if (!authToken || !authChecked) {
      return;
    }
    loadPayments();
    loadDelinquent();
    loadRanking();
    loadDashboard();
  }, [selectedMonth, selectedYear, selectedMemberId, authToken, authChecked]);

  const resetMemberForm = () => {
    setMemberForm({ name: '', email: '', nickname: '' });
    setEditingMemberId(null);
  };

  const resetGoalForm = () => {
    setGoalForm({ title: '', targetAmount: '', deadline: '', description: '' });
    setEditingGoalId(null);
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      title: '',
      amount: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      category: '',
      notes: '',
      eventId: ''
    });
    setEditingExpenseId(null);
  };

  const resetEventForm = () => {
    setEventForm({
      name: '',
      eventDate: new Date().toISOString().slice(0, 10),
      raisedAmount: '',
      spentAmount: '',
      description: ''
    });
    setEditingEventId(null);
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: memberForm.name,
        email: memberForm.email,
        nickname: memberForm.nickname
      };
      const isEditing = Boolean(editingMemberId);
      const endpoint = isEditing ? `/api/members/${editingMemberId}` : '/api/members';
      const method = isEditing ? 'PUT' : 'POST';
      const data = await apiFetch(endpoint, { method, body: payload });
      await loadMembers();
      resetMemberForm();
      if (!isEditing && data?.setupToken) {
        const link = `${window.location.origin}/?setup=${data.setupToken}`;
        setInviteLink(link);
        setSelectedMemberDetail(data.member || null);
      } else if (isEditing) {
        setInviteLink('');
        setSelectedMemberDetail(data.member || null);
      }
      showToast('Membro salvo com sucesso');
    } catch (error) {
      handleError(error);
    }
  };

  const handleMemberInvite = async (id) => {
    try {
      const data = await apiFetch(`/api/members/${id}/invite`, { method: 'POST' });
      if (data?.setupToken) {
        const link = `${window.location.origin}/?setup=${data.setupToken}`;
        setInviteLink(link);
      }
      if (data?.member) {
        setSelectedMemberDetail(data.member);
      }
      showToast('Link de acesso gerado');
    } catch (error) {
      handleError(error);
    }
  };

  const handleMemberDelete = async (id) => {
    if (!window.confirm('Remover este membro?')) return;
    try {
      await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
      if (selectedMemberDetail?.id === id) {
        setSelectedMemberDetail(null);
      }
      await loadMembers();
      showToast('Membro removido');
    } catch (error) {
      handleError(error);
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    if (!paymentForm.memberId) {
      showToast('Selecione um membro', 'error');
      return;
    }
    try {
      const payload = {
        memberId: Number(paymentForm.memberId),
        month: Number(paymentForm.month),
        year: Number(paymentForm.year),
        amount: Number(paymentForm.amount),
        paid: paymentForm.paid,
        paidAt: paymentForm.paidAt,
        notes: paymentForm.notes,
        goalId: paymentForm.goalId ? Number(paymentForm.goalId) : null
      };
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await Promise.all([loadPayments(), loadDashboard(), loadDelinquent(), loadGoals(), loadRanking()]);
      showToast('Pagamento registrado');
    } catch (error) {
      handleError(error);
    }
  };

  const handlePaymentDelete = async (id) => {
    if (!window.confirm('Remover este pagamento?')) return;
    try {
      await apiFetch(`/api/payments/${id}`, { method: 'DELETE' });
      await Promise.all([loadPayments(), loadDashboard(), loadDelinquent(), loadRanking()]);
      showToast('Pagamento removido');
    } catch (error) {
      handleError(error);
    }
  };

  const handleGoalSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: goalForm.title,
        targetAmount: Number(goalForm.targetAmount),
        deadline: goalForm.deadline,
        description: goalForm.description
      };
      const endpoint = editingGoalId ? `/api/goals/${editingGoalId}` : '/api/goals';
      const method = editingGoalId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await loadGoals();
      resetGoalForm();
      showToast('Meta salva');
    } catch (error) {
      handleError(error);
    }
  };

  const handleGoalDelete = async (id) => {
    if (!window.confirm('Excluir esta meta?')) return;
    try {
      await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
      await loadGoals();
      showToast('Meta removida');
    } catch (error) {
      handleError(error);
    }
  };

  const handleExpenseSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        category: expenseForm.category,
        notes: expenseForm.notes,
        eventId: expenseForm.eventId ? Number(expenseForm.eventId) : null
      };
      const endpoint = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = editingExpenseId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await Promise.all([loadExpenses(), loadDashboard()]);
      resetExpenseForm();
      showToast('Despesa registrada');
    } catch (error) {
      handleError(error);
    }
  };

  const handleExpenseDelete = async (id) => {
    if (!window.confirm('Remover esta despesa?')) return;
    try {
      await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
      await Promise.all([loadExpenses(), loadDashboard()]);
      showToast('Despesa removida');
    } catch (error) {
      handleError(error);
    }
  };

  const handleEventSubmit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: eventForm.name,
        eventDate: eventForm.eventDate,
        raisedAmount: Number(eventForm.raisedAmount || 0),
        spentAmount: Number(eventForm.spentAmount || 0),
        description: eventForm.description
      };
      const endpoint = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
      const method = editingEventId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await loadEvents();
      resetEventForm();
      showToast('Evento salvo');
    } catch (error) {
      handleError(error);
    }
  };

  const handleEventDelete = async (id) => {
    if (!window.confirm('Remover este evento?')) return;
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      await loadEvents();
      showToast('Evento removido');
    } catch (error) {
      handleError(error);
    }
  };

  const handleReceipt = async (id) => {
    try {
      await downloadBinary(`/api/payments/${id}/receipt`, `recibo-${id}.pdf`, authToken);
      showToast('Recibo gerado');
    } catch (error) {
      handleError(error);
    }
  };

  const handleExport = async (format, type) => {
    try {
      setReportLoading(true);
      const params = new URLSearchParams({
        format,
        type,
        month: selectedMonth,
        year: selectedYear
      });
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const res = await fetch(`/api/reports/export?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error('Falha ao exportar');
      }
      const blob = await res.blob();
      const filename = `relatorio-${type}-${selectedMonth}-${selectedYear}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('Relatório gerado');
    } catch (error) {
      handleError(error);
    } finally {
      setReportLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const dataset = months.map((monthItem) => {
      const record = dashboard.monthlyCollections?.find(
        (entry) => Number(entry.month) === monthItem.value
      );
      return record ? Number(record.total) : 0;
    });
    return {
      labels: months.map((monthItem) => monthItem.label),
      datasets: [
        {
          label: 'Arrecadação mensal',
          data: dataset,
          backgroundColor: '#3c6ff7'
        }
      ]
    };
  }, [dashboard]);

  if (!authToken) {
    return (
      <div className="login-screen">
        <div className="login-card">
          {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
          <h1>Tesoureiro Assistente</h1>
          {authMode === 'login' ? (
            <>
              <p>Entre para acessar os dados do clã.</p>
              <form className="login-form" onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              <button
                type="button"
                className="link-button"
                onClick={() => setAuthMode('register')}
              >
                Criar conta de membro
              </button>
              <button
                type="button"
                className="link-button"
                onClick={() => setAuthMode('setup')}
              >
                Tenho um link de primeiro acesso
              </button>
            </>
          ) : authMode === 'register' ? (
            <>
              <p>Crie seu acesso como membro.</p>
              <form className="login-form" onSubmit={handleRegister}>
                <input
                  placeholder="Nome"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                  }
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Criando...' : 'Criar conta'}
                </button>
              </form>
              <button
                type="button"
                className="link-button"
                onClick={() => setAuthMode('login')}
              >
                Voltar para login
              </button>
            </>
          ) : (
            <>
              <p>Defina sua nova senha para o primeiro acesso.</p>
              <form className="login-form" onSubmit={handleSetupPassword}>
                <input
                  placeholder="Token de acesso"
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Nova senha"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmar senha"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                  }
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? 'Salvando...' : 'Salvar senha'}
                </button>
              </form>
              <button
                type="button"
                className="link-button"
                onClick={() => setAuthMode('login')}
              >
                Voltar para login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>Validando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>Tesoureiro Assistente</h1>
          <p>Controle completo de membros, pagamentos, metas e eventos do clã.</p>
        </div>
        <div className="filters">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {months.map((monthOption) => (
              <option value={monthOption.value} key={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={selectedYear}
            min="2020"
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          />
        </div>
        <div className="user-filters">
          {userFilterOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={selectedUserFilter === option.id ? 'active' : 'ghost'}
              onClick={() => setSelectedUserFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="auth-panel">
          <div className="auth-status">
            <span>{isAdmin ? 'Tesoureiro' : 'Visualização'}</span>
            <span>{authUser.email}</span>
            <button type="button" onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <section className="panel">
        <h2>Visão geral financeira</h2>
        <div className="stats-grid">
          <article className="stat-card">
            <span>Total arrecadado</span>
            <strong>{formatCurrency(dashboard.totalRaised)}</strong>
          </article>
          <article className="stat-card">
            <span>Despesas</span>
            <strong>{formatCurrency(dashboard.totalExpenses)}</strong>
          </article>
          <article className="stat-card">
            <span>Saldo</span>
            <strong>{formatCurrency(dashboard.balance)}</strong>
          </article>
        </div>
        <div className="chart-wrapper">
          <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
        </div>
        <div className="goals-grid">
          {goals.length === 0 && <p>Cadastre metas para acompanhar o progresso.</p>}
          {goals.map((goal) => (
            <article key={goal.id} className="goal-card">
              <div className="goal-header">
                <h3>{goal.title}</h3>
                <span>{goal.deadline || 'Sem prazo'}</span>
              </div>
              <p>{goal.description}</p>
              <p>
                {formatCurrency(goal.raised)} / {formatCurrency(goal.target_amount || goal.targetAmount)}
              </p>
              <div className="progress">
                <div style={{ width: `${goal.progress || 0}%` }} />
              </div>
              {canEdit && (
                <div className="goal-actions">
                  <button
                    onClick={() => {
                      setGoalForm({
                        title: goal.title,
                        targetAmount: goal.target_amount,
                        deadline: goal.deadline || '',
                        description: goal.description || ''
                      });
                      setEditingGoalId(goal.id);
                    }}
                  >
                    Editar
                  </button>
                  <button className="ghost" onClick={() => handleGoalDelete(goal.id)}>
                    Remover
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Membros</h2>
          <p>Todo membro possui acesso de visualização. Gere o link de primeiro acesso ao criar.</p>
        </div>
        {canEdit ? (
          <form className="form-grid" onSubmit={handleMemberSubmit}>
            <input
              placeholder="Nome"
              value={memberForm.name}
              onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email (login)"
              value={memberForm.email}
              onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
              required
            />
            <input
              placeholder="Apelido"
              value={memberForm.nickname}
              onChange={(e) => setMemberForm({ ...memberForm, nickname: e.target.value })}
            />
            <div className="form-actions">
              <button type="submit">{editingMemberId ? 'Atualizar' : 'Adicionar membro'}</button>
              {editingMemberId && (
                <button type="button" className="ghost" onClick={resetMemberForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <p className="lock-hint">Faça login como tesoureiro para cadastrar ou editar membros.</p>
        )}
        {inviteLink && (
          <div className="invite-link">
            <p>Link de primeiro acesso:</p>
            <div className="invite-row">
              <input readOnly value={inviteLink} />
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  showToast('Link copiado');
                }}
              >
                Copiar
              </button>
            </div>
            <small>Compartilhe este link para o membro criar a senha.</small>
          </div>
        )}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Apelido</th>
                {canEdit && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => (
                <tr
                  key={member.id}
                  className={selectedMemberDetail?.id === member.id ? 'selected' : ''}
                  onClick={() => {
                    if (isAdmin) {
                      setSelectedMemberDetail(member);
                    }
                  }}
                >
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.nickname}</td>
                  {canEdit && (
                    <td>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setMemberForm({
                            name: member.name,
                            email: member.email || '',
                            nickname: member.nickname || ''
                          });
                          setEditingMemberId(member.id);
                          setInviteLink('');
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMemberDelete(member.id);
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isAdmin && selectedMemberDetail && (
          <div className="user-detail">
            <h3>Detalhes do membro</h3>
            <p>
              <strong>Nome:</strong> {selectedMemberDetail.name || '-'}
            </p>
            <p>
              <strong>Email:</strong> {selectedMemberDetail.email || '-'}
            </p>
            <p>
              <strong>Apelido:</strong> {selectedMemberDetail.nickname || '-'}
            </p>
            <p>
              <strong>Permissão:</strong> {selectedMemberDetail.role || 'viewer'}
            </p>
            <p>
              <strong>Status:</strong> {selectedMemberDetail.active ? 'Ativo' : 'Inativo'}
            </p>
            <p>
              <strong>Primeiro acesso:</strong>{' '}
              {selectedMemberDetail.must_reset_password ? 'Pendente' : 'Concluído'}
            </p>
            <p>
              <strong>Criado em:</strong> {selectedMemberDetail.joined_at || '-'}
            </p>
            <div className="form-actions">
              <button type="button" onClick={() => handleMemberInvite(selectedMemberDetail.id)}>
                Gerar link de acesso
              </button>
              <button className="ghost" onClick={() => handleMemberDelete(selectedMemberDetail.id)}>
                Remover membro
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Pagamentos mensais</h2>
          <p>Histórico completo e geração de recibos.</p>
        </div>
        {canEdit ? (
          <form className="form-grid" onSubmit={handlePaymentSubmit}>
            <select
              value={paymentForm.memberId}
              onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })}
              required
            >
              <option value="">Selecione um membro</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              value={paymentForm.month}
              onChange={(e) => setPaymentForm({ ...paymentForm, month: Number(e.target.value) })}
            >
              {months.map((monthOption) => (
                <option key={monthOption.value} value={monthOption.value}>
                  {monthOption.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={paymentForm.year}
              onChange={(e) => setPaymentForm({ ...paymentForm, year: Number(e.target.value) })}
            />
            <input
              type="number"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              placeholder="Valor"
            />
            <select
              value={paymentForm.goalId}
              onChange={(e) => setPaymentForm({ ...paymentForm, goalId: e.target.value })}
            >
              <option value="">Meta opcional</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={paymentForm.paid}
                onChange={(e) => setPaymentForm({ ...paymentForm, paid: e.target.checked })}
              />
              Pago
            </label>
            <input
              type="date"
              value={paymentForm.paidAt}
              onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
            />
            <input
              placeholder="Observações"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
            />
            <div className="form-actions">
              <button type="submit">Registrar pagamento</button>
            </div>
          </form>
        ) : (
          <p className="lock-hint">Somente o tesoureiro pode registrar ou editar pagamentos.</p>
        )}
        <div className="table-wrapper">
          {loading ? (
            <p>Carregando pagamentos...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Competência</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Meta</th>
                  {canEdit && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.member_name}</td>
                    <td>
                      {payment.month}/{payment.year}
                    </td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td className={payment.paid ? 'paid' : 'pending'}>
                      {payment.paid ? 'Pago' : 'Pendente'}
                    </td>
                    <td>{payment.goal_id ? goals.find((goal) => goal.id === payment.goal_id)?.title : '-'}</td>
                    {canEdit && (
                      <td>
                        <button onClick={() => handleReceipt(payment.id)}>Gerar recibo</button>
                        <button className="ghost" onClick={() => handlePaymentDelete(payment.id)}>
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="panel two-column">
        <div>
          <div className="panel-header">
            <h2>Despesas</h2>
            <p>Controle de gastos por categoria.</p>
          </div>
          {canEdit ? (
            <form className="form-grid" onSubmit={handleExpenseSubmit}>
              <input
                placeholder="Descrição"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Valor"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                required
              />
              <input
                type="date"
                value={expenseForm.expenseDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                required
              />
              <input
                placeholder="Categoria"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
              />
              <select
                value={expenseForm.eventId}
                onChange={(e) => setExpenseForm({ ...expenseForm, eventId: e.target.value })}
              >
                <option value="">Evento associado</option>
                {events.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>
                    {eventItem.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Observações"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              />
              <div className="form-actions">
                <button type="submit">{editingExpenseId ? 'Atualizar' : 'Salvar despesa'}</button>
                {editingExpenseId && (
                  <button type="button" className="ghost" onClick={resetExpenseForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="lock-hint">Somente o tesoureiro pode registrar despesas.</p>
          )}
          <div className="table-wrapper compact">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Título</th>
                  <th>Valor</th>
                  <th>Categoria</th>
                  {canEdit && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{expense.expense_date}</td>
                    <td>{expense.title}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                    <td>{expense.category}</td>
                  {canEdit && (
                    <td>
                      <button
                        onClick={() => {
                          setExpenseForm({
                            title: expense.title,
                            amount: expense.amount,
                            expenseDate: expense.expense_date,
                            category: expense.category || '',
                            notes: expense.notes || '',
                            eventId: expense.event_id || ''
                          });
                          setEditingExpenseId(expense.id);
                        }}
                      >
                        Editar
                      </button>
                      <button className="ghost" onClick={() => handleExpenseDelete(expense.id)}>
                        Remover
                      </button>
                    </td>
                  )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="panel-header">
            <h2>Eventos</h2>
            <p>Use eventos para contar histórias como &quot;Acampamento de junho&quot;.</p>
          </div>
          {canEdit ? (
            <form className="form-grid" onSubmit={handleEventSubmit}>
              <input
                placeholder="Nome do evento"
                value={eventForm.name}
                onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                required
              />
              <input
                type="date"
                value={eventForm.eventDate}
                onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
                required
              />
              <input
                type="number"
                placeholder="Arrecadado"
                value={eventForm.raisedAmount}
                onChange={(e) => setEventForm({ ...eventForm, raisedAmount: e.target.value })}
              />
              <input
                type="number"
                placeholder="Gasto"
                value={eventForm.spentAmount}
                onChange={(e) => setEventForm({ ...eventForm, spentAmount: e.target.value })}
              />
              <input
                placeholder="Descrição"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
              <div className="form-actions">
                <button type="submit">{editingEventId ? 'Atualizar evento' : 'Salvar evento'}</button>
                {editingEventId && (
                  <button type="button" className="ghost" onClick={resetEventForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          ) : (
            <p className="lock-hint">Somente o tesoureiro pode registrar eventos.</p>
          )}
          <div className="events-list">
            {events.map((eventItem) => (
              <article key={eventItem.id} className="event-card">
                <div>
                  <h3>{eventItem.name}</h3>
                  <span>{eventItem.event_date}</span>
                </div>
                <p>{eventItem.description}</p>
                <p>
                  Arrecadado {formatCurrency(eventItem.raised_amount)} • Gasto{' '}
                  {formatCurrency(eventItem.spent_amount)} • Saldo{' '}
                  {formatCurrency((eventItem.raised_amount || 0) - (eventItem.spent_amount || 0))}
                </p>
                {canEdit && (
                  <div className="goal-actions">
                    <button
                      onClick={() => {
                        setEventForm({
                          name: eventItem.name,
                          eventDate: eventItem.event_date,
                          raisedAmount: eventItem.raised_amount,
                          spentAmount: eventItem.spent_amount,
                          description: eventItem.description || ''
                        });
                        setEditingEventId(eventItem.id);
                      }}
                    >
                      Editar
                    </button>
                    <button className="ghost" onClick={() => handleEventDelete(eventItem.id)}>
                      Remover
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Inadimplência e ranking</h2>
          <p>Filtre quem ainda não pagou e gamifique os bons pagadores.</p>
        </div>
        <div className="split">
          <div>
            <h3>Inadimplentes do mês</h3>
            <ul className="pill-list">
              {delinquent.length === 0 && <li>Todos pagaram! 🎉</li>}
              {delinquent.map((member, index) => (
                <li key={`${member.name}-${index}`}>{member.name}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Ranking de pontualidade</h3>
            <ol className="ranking">
              {ranking.map((entry, index) => (
                <li key={`${entry.name}-${index}`}>
                  <span>{entry.name}</span>
                  <strong>{entry.payments} pagamentos</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Relatórios e exportação</h2>
          <p>Exporte pagamentos ou despesas em PDF ou CSV.</p>
        </div>
        <div className="buttons">
          <button disabled={reportLoading} onClick={() => handleExport('csv', 'payments')}>
            Exportar pagamentos (CSV)
          </button>
          <button disabled={reportLoading} onClick={() => handleExport('pdf', 'payments')}>
            Exportar pagamentos (PDF)
          </button>
          <button disabled={reportLoading} onClick={() => handleExport('csv', 'expenses')}>
            Exportar despesas (CSV)
          </button>
          <button disabled={reportLoading} onClick={() => handleExport('pdf', 'expenses')}>
            Exportar despesas (PDF)
          </button>
        </div>
      </section>

      <footer>
        <p>RF01-RF12 atendidos com dashboard visual, recibos, exportação e ranking.</p>
      </footer>
    </div>
  );
}

export default App;
