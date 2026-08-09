import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './routes/AppLayout';
import { AccessDeniedPage } from './routes/AccessDeniedPage';
import { DashboardPage } from './routes/DashboardPage';
import { MembersPage } from './routes/MembersPage';
import { PaymentsPage } from './routes/PaymentsPage';
import { ExpensesPage } from './routes/ExpensesPage';
import './styles/index.css';

// Árvore de rotas e guards de auth/role. Dashboard, Membros, Pagamentos e
// Despesas já possuem rotas dedicadas, cada uma carregando seu painel sob
// demanda (ver DashboardPage/MembersPage/PaymentsPage/ExpensesPage). Os
// demais módulos ainda não migrados seguem hospedados em /dashboard.
// RoleRoute fica disponível para restringir rotas específicas assim que
// forem extraídas.
function App() {
  const { authToken } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={authToken ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={authToken ? <Navigate to="/dashboard" replace /> : <LoginScreen />} />
      <Route path="/acesso-negado" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/membros" element={<MembersPage />} />
          <Route path="/pagamentos" element={<PaymentsPage />} />
          <Route path="/despesas" element={<ExpensesPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
