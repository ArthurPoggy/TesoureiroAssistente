import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AppLayout } from './routes/AppLayout';
import { AccessDeniedPage } from './routes/AccessDeniedPage';
import { DashboardPage } from './routes/DashboardPage';
import './styles/index.css';

// Árvore de rotas e guards de auth/role. O conteúdo dos painéis ainda não
// foi dividido em rotas por módulo — por ora tudo é montado via a rota
// provisória /dashboard (ver DashboardPage). RoleRoute fica disponível para
// restringir rotas específicas assim que forem extraídas.
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
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
