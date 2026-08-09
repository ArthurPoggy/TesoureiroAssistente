import { Outlet } from 'react-router-dom';
import { NavMenu } from './NavMenu';
import { SharedDataProvider } from '../contexts/SharedDataContext';

// Layout raiz das rotas autenticadas: hospeda o menu de navegação e
// renderiza a rota filha ativa através do Outlet.
//
// SharedDataProvider (ver client/src/contexts/SharedDataContext.jsx) envolve
// as rotas filhas para compartilhar membros, metas e configurações públicas
// entre as páginas que precisam desses recursos (DashboardPage,
// PaymentsPage, MembersPage, ProjectsPage, ExtratoPage), carregando cada um
// uma única vez por sessão de navegação em vez de cada rota buscá-los de
// forma independente ao montar.
export function AppLayout() {
  return (
    <SharedDataProvider>
      <NavMenu />
      <Outlet />
    </SharedDataProvider>
  );
}
