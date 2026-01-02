import { useAuth } from '../../contexts/AuthContext';
import { months } from '../../utils/formatters';

export function Header({
  orgName,
  orgTagline,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  userFilterOptions,
  selectedUserFilter,
  setSelectedUserFilter,
  resetFilters,
  settingsOpen,
  onToggleSettings
}) {
  const { authUser, isAdmin, logout } = useAuth();

  return (
    <header>
      <div>
        <h1>{orgName || 'Tesoureiro Assistente'}</h1>
        <p>{orgTagline || 'Controle completo de membros, pagamentos, metas e eventos do clã.'}</p>
      </div>
      <div className="filters">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          <option value="all">Todos os meses</option>
          {months.map((monthOption) => (
            <option value={monthOption.value} key={monthOption.value}>
              {monthOption.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={selectedYear}
          min="2020"
          placeholder="Todos os anos"
          onChange={(e) => setSelectedYear(e.target.value)}
        />
        <button type="button" className="ghost" onClick={resetFilters}>
          Ver tudo
        </button>
      </div>
      <div className="user-filters">
        {userFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={selectedUserFilter === option.id ? 'active' : 'ghost'}
            onClick={() => setSelectedUserFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="auth-panel">
        <div className="auth-status">
          <span>{isAdmin ? 'Tesoureiro' : 'Visualização'}</span>
          <span>{authUser.email}</span>
          {isAdmin && (
            <button type="button" className="ghost" onClick={onToggleSettings}>
              {settingsOpen ? 'Fechar configurações' : 'Configurações'}
            </button>
          )}
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
