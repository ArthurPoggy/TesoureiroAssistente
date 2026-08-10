import { useEffect } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const typeLabels = {
  pagamento: 'Entrada',
  despesa: 'Saída',
  evento: 'Evento'
};

const typeBadgeClass = {
  pagamento: 'badge-income',
  despesa: 'badge-expense',
  evento: 'badge-event'
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const parts = String(value).split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return value;
};

export function ExtratoPanel({
  entries,
  summary,
  loading,
  filters,
  setFilters,
  onLoad,
  onExport,
  members,
  isAdmin,
  page = 1,
  pageSize = 25,
  total = 0,
  onPageChange,
  onPageSizeChange
}) {
  useEffect(() => {
    onLoad();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    onLoad();
  };

  return (
    <section className="panel extrato-panel">
      <div className="panel-header">
        <h2>Extrato de Movimentações</h2>
        <p>Visão completa de entradas, saídas e saldo acumulado.</p>
      </div>

      <form className="extrato-filters" onSubmit={handleFilter}>
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          placeholder="Data início"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="Data fim"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">Todos os tipos</option>
          <option value="pagamento">Pagamento</option>
          <option value="despesa">Despesa</option>
          <option value="evento">Evento</option>
        </select>
        {isAdmin && members && members.length > 0 && (
          <select
            value={filters.memberId}
            onChange={(e) => setFilters({ ...filters, memberId: e.target.value })}
          >
            <option value="">Todos os membros</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" disabled={loading}>
          {loading ? 'Carregando...' : 'Filtrar'}
        </button>
        <label className="extrato-pagesize">
          Por página:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(e.target.value)}
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </form>

      <div className="extrato-summary">
        <div className="extrato-card extrato-income">
          <span className="extrato-card-label">Total entradas</span>
          <span className="extrato-card-value">{formatCurrency(summary.totalIncome)}</span>
        </div>
        <div className="extrato-card extrato-expense">
          <span className="extrato-card-label">Total saídas</span>
          <span className="extrato-card-value">{formatCurrency(summary.totalExpense)}</span>
        </div>
        <div className="extrato-card extrato-net">
          <span className="extrato-card-label">Saldo líquido</span>
          <span className="extrato-card-value">{formatCurrency(summary.netBalance)}</span>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Saldo Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
            {entries.map((entry, index) => (
              <tr key={index}>
                <td>{formatDate(entry.date)}</td>
                <td>
                  <span className={`extrato-badge ${typeBadgeClass[entry.type] || ''}`}>
                    {typeLabels[entry.type] || entry.type}
                  </span>
                </td>
                <td>{entry.description}</td>
                <td className={entry.amount >= 0 ? 'paid' : 'pending'}>
                  {formatCurrency(entry.amount)}
                </td>
                <td>{formatCurrency(entry.running_balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (() => {
        const totalPages = Math.ceil(total / pageSize);
        const from = (page - 1) * pageSize + 1;
        const to = Math.min(page * pageSize, total);
        return (
          <div className="pagination">
            <span className="pagination-info">
              Exibindo {from}–{to} de {total} registros
            </span>
            <div className="pagination-controls">
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(1)} disabled={page === 1} title="Primeira">«</button>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(page - 1)} disabled={page === 1}>Anterior</button>
              <span className="pagination-page">Página {page} de {totalPages}</span>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages}>Próxima</button>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(totalPages)} disabled={page >= totalPages} title="Última">»</button>
            </div>
          </div>
        );
      })()}

      {isAdmin && (
        <div className="extrato-export">
          <button type="button" onClick={() => onExport('csv')}>
            Exportar CSV
          </button>
          <button type="button" onClick={() => onExport('pdf')}>
            Exportar PDF
          </button>
        </div>
      )}
    </section>
  );
}
