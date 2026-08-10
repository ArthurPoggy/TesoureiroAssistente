import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { AppLayout } from './routes/AppLayout';
import { ScrollToTop } from './routes/ScrollToTop';
import { AccessDeniedPage } from './routes/AccessDeniedPage';
import { DashboardPage } from './routes/DashboardPage';
import { MembersPage } from './routes/MembersPage';
import { PaymentsPage } from './routes/PaymentsPage';
import { ExpensesPage } from './routes/ExpensesPage';
import { EventsPage } from './routes/EventsPage';
import { ProjectsPage } from './routes/ProjectsPage';
import { ExtratoPage } from './routes/ExtratoPage';
import { SettingsPage } from './routes/SettingsPage';
import './styles/index.css';

// Árvore de rotas e guards de auth/role. Dashboard, Membros, Pagamentos,
// Despesas, Eventos, Projetos, Extrato e Configurações já possuem rotas
// dedicadas, cada uma carregando seu painel sob demanda (ver
// DashboardPage/MembersPage/PaymentsPage/ExpensesPage/EventsPage/
// ProjectsPage/ExtratoPage/SettingsPage). Configurações é restrita a
// diretor_financeiro/admin através de RoleRoute, bloqueando o viewer mesmo
// ao digitar a URL diretamente (não apenas escondendo o item de menu).
function App() {
  const { authToken } = useAuth();

  return (
    <>
      <ScrollToTop />
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
            <Route path="/eventos" element={<EventsPage />} />
            <Route path="/projetos" element={<ProjectsPage />} />
            <Route path="/extrato" element={<ExtratoPage />} />

            <Route element={<RoleRoute allowedRoles={['admin', 'diretor_financeiro']} />}>
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
