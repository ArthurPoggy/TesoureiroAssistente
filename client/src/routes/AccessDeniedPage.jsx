import { Link } from 'react-router-dom';

export function AccessDeniedPage() {
  return (
    <div className="app-shell">
      <div className="empty-state">
        <h1>Acesso negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
        <Link to="/dashboard">Voltar ao painel</Link>
      </div>
    </div>
  );
}
