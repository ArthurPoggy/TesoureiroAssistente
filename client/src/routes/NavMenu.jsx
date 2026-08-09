import { NavLink } from 'react-router-dom';

// Itens do menu de navegação, um por módulo com rota dedicada. O item
// correspondente à rota atual recebe a classe "active" via NavLink,
// destacando visualmente o módulo em uso.
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Painel' },
  { to: '/membros', label: 'Membros' },
  { to: '/pagamentos', label: 'Pagamentos' },
  { to: '/despesas', label: 'Despesas' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/projetos', label: 'Projetos' },
  { to: '/extrato', label: 'Extrato' },
  { to: '/configuracoes', label: 'Configurações' },
];

export function NavMenu() {
  return (
    <nav className="app-nav">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
