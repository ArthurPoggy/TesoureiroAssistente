export function ReportsSection({ reportLoading, onExport }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Relatórios e exportação</h2>
        <p>Exporte pagamentos ou despesas em PDF ou CSV.</p>
      </div>
      <div className="buttons">
        <button disabled={reportLoading} onClick={() => onExport('csv', 'payments')}>
          Exportar pagamentos (CSV)
        </button>
        <button disabled={reportLoading} onClick={() => onExport('pdf', 'payments')}>
          Exportar pagamentos (PDF)
        </button>
        <button disabled={reportLoading} onClick={() => onExport('csv', 'expenses')}>
          Exportar despesas (CSV)
        </button>
        <button disabled={reportLoading} onClick={() => onExport('pdf', 'expenses')}>
          Exportar despesas (PDF)
        </button>
      </div>
    </section>
  );
}
