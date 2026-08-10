import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthCheckingScreen } from '../components';

// Guarda de autenticação: usuários sem sessão são enviados para /login.
// Enquanto a sessão ainda está sendo verificada (token presente, mas
// authChecked === false) exibe uma tela de carregamento em vez de decidir
// prematuramente para qual rota redirecionar.
export function ProtectedRoute() {
  const { authToken, authChecked } = useAuth();

  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  if (!authChecked) {
    return <AuthCheckingScreen />;
  }

  return <Outlet />;
}
