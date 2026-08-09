import { useState } from 'react';

function formatMilestoneDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function sortMilestones(milestones) {
  return [...milestones].sort((a, b) => {
    const dateA = a.data_prevista || '';
    const dateB = b.data_prevista || '';
    if (dateA !== dateB) return dateA < dateB ? -1 : 1;
    return a.id - b.id;
  });
}

function getMilestoneStatus(milestone, firstPendingId) {
  if (milestone.concluido) return 'concluido';
  if (milestone.id === firstPendingId) return 'atual';
  return 'futuro';
}

const STATUS_LABEL = {
  concluido: 'Concluído',
  atual: 'Atual',
  futuro: 'Futuro'
};

export function ProjectTimeline({ project, canEdit, onAddMilestone, onRemoveMilestone }) {
  const [isAdding, setIsAdding] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');

  const milestones = sortMilestones(project.milestones || []);
  const firstPending = milestones.find((m) => !m.concluido);
  const firstPendingId = firstPending ? firstPending.id : null;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!titulo || !dataPrevista) return;
    await onAddMilestone(project.id, { titulo, data_prevista: dataPrevista });
    setTitulo('');
    setDataPrevista('');
    setIsAdding(false);
  };

  return (
    <div className="project-timeline">
      {project.atrasado && (
        <div className="project-late-badge" role="status">
          ⚠ Projeto atrasado
        </div>
      )}

      <ul className="project-timeline-list" aria-label="Cronograma do projeto">
        {milestones.map((milestone) => {
          const status = getMilestoneStatus(milestone, firstPendingId);
          return (
            <li key={milestone.id} className={`project-milestone project-milestone--${status}`}>
              <span className="project-milestone-dot" aria-hidden="true" />
              <span className="project-milestone-title">{milestone.titulo}</span>
              {milestone.data_prevista && (
                <span className="project-milestone-date">{formatMilestoneDate(milestone.data_prevista)}</span>
              )}
              <span className="project-milestone-status">{STATUS_LABEL[status]}</span>
              {canEdit && (
                <button
                  type="button"
                  className="project-milestone-remove"
                  onClick={() => onRemoveMilestone(project.id, milestone.id)}
                >
                  Remover marco
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        isAdding ? (
          <form className="project-milestone-form" onSubmit={handleAdd}>
            <input
              placeholder="Título do marco"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
            <label>
              Data prevista
              <input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit">Salvar marco</button>
              <button type="button" className="ghost" onClick={() => setIsAdding(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className="ghost project-milestone-add-btn" onClick={() => setIsAdding(true)}>
            + Adicionar marco
          </button>
        )
      )}
    </div>
  );
}
