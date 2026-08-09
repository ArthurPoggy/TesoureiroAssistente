import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Guarda de autorização: assume-se que a autenticação já foi verificada por
// um ProtectedRoute ancestral. Usuários cujo papel não está entre os
// permitidos são enviados para a página de acesso negado.
export function RoleRoute({ allowedRoles }) {
  const { authUser } = useAuth();

  if (!allowedRoles.includes(authUser.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}
