import { Outlet } from 'react-router-dom';
import { NavMenu } from './NavMenu';

// Layout raiz das rotas autenticadas: hospeda o menu de navegação e
// renderiza a rota filha ativa através do Outlet.
//
// Decisão de arquitetura (consciente, não um esquecimento): cada página de
// rota (DashboardPage, PaymentsPage, ExpensesPage, MembersPage, EventsPage,
// ProjectsPage, ExtratoPage, SettingsPage) chama os hooks de dados de que
// precisa (useMembers, useGoals, useSettings etc.) de forma independente, em
// vez de compartilhar um estado central como o App.jsx monolítico fazia
// antes da migração para rotas. Isso troca "menos requisições" por "módulos
// isolados": cada rota carrega e recarrega só os dados que usa, sem
// depender de um provider global carregado antecipadamente para todas as
// telas. O custo é uma requisição redundante (ex.: membros) quando o
// usuário navega entre rotas que compartilham o mesmo recurso — aceitável
// dado que os dados são pequenos e os hooks já fazem cache local por rota.
// Se esse custo se tornar um problema real (paginação pesada, navegação
// muito frequente entre rotas), migrar os recursos compartilhados
// (membros, metas, configurações públicas) para um contexto ou camada de
// cache (ex. React Query) é o próximo passo natural — não faz parte deste
// PR de roteamento.
export function AppLayout() {
  return (
    <>
      <NavMenu />
      <Outlet />
    </>
  );
}
