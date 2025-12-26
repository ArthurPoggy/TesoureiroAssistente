export function DelinquencyRanking({ delinquent, ranking }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Inadimplência e ranking</h2>
        <p>Filtre quem ainda não pagou e gamifique os bons pagadores.</p>
      </div>
      <div className="split">
        <div>
          <h3>Inadimplentes do mês</h3>
          <ul className="pill-list">
            {delinquent.length === 0 && <li>Todos pagaram!</li>}
            {delinquent.map((member, index) => (
              <li key={`${member.name}-${index}`}>{member.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Ranking de pontualidade</h3>
          <ol className="ranking">
            {ranking.map((entry, index) => (
              <li key={`${entry.name}-${index}`}>
                <span>{entry.name}</span>
                <strong>{entry.payments} pagamentos</strong>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
