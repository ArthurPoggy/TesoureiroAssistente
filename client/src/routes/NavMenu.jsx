import { NavLink } from 'react-router-dom';

// Esqueleto de navegação: à medida que os painéis forem extraídos para
// rotas próprias, novas entradas devem ser adicionadas aqui.
const NAV_ITEMS = [{ to: '/dashboard', label: 'Painel' }];

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
