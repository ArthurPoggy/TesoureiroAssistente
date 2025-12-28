export function DelinquencyRanking({ delinquent, ranking }) {
  return (
    <section className="panel ranking-panel">
      <div className="panel-header">
        <h2>Inadimplência e ranking</h2>
        <p>Filtre quem ainda não pagou e gamifique os bons pagadores.</p>
      </div>
      <div className="split ranking-split">
        <div className="ranking-card">
          <h3>Inadimplentes do mês</h3>
          <p className="ranking-subtitle">Quem ainda não registrou pagamento.</p>
          <ul className="pill-list delinquent-list">
            {delinquent.length === 0 && <li className="pill-empty">Todos pagaram!</li>}
            {delinquent.map((member, index) => (
              <li key={`${member.name}-${index}`}>{member.name}</li>
            ))}
          </ul>
        </div>
        <div className="ranking-card">
          <h3>Ranking de pontualidade</h3>
          <p className="ranking-subtitle">Top 5 com mais pagamentos em dia.</p>
          <ol className="ranking-board">
            {ranking.length === 0 ? (
              <li className="ranking-empty">Sem registros para este período.</li>
            ) : (
              ranking.map((entry, index) => (
                <li key={`${entry.name}-${index}`} className={`ranking-item rank-${index + 1}`}>
                  <span className="ranking-position">{index + 1}</span>
                  <span className="ranking-name">{entry.name}</span>
                  <span className="ranking-score">{entry.payments} pagamentos</span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </section>
  );
}
