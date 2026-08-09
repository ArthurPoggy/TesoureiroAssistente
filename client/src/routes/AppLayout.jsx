import { Outlet } from 'react-router-dom';
import { NavMenu } from './NavMenu';

// Layout raiz das rotas autenticadas: hospeda o menu de navegação e
// renderiza a rota filha ativa através do Outlet.
export function AppLayout() {
  return (
    <>
      <NavMenu />
      <Outlet />
    </>
  );
}
