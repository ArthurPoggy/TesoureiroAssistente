import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';

export function EventsPanel({
  events,
  eventForm,
  setEventForm,
  editingEventId,
  onSubmit,
  onDelete,
  onEdit,
  onReset
}) {
  const { canEdit } = useAuth();

  return (
    <div>
      <div className="panel-header">
        <h2>Eventos</h2>
        <p>Use eventos para contar histórias como &quot;Acampamento de junho&quot;.</p>
      </div>

      {canEdit ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            placeholder="Nome do evento"
            value={eventForm.name}
            onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
            required
          />
          <input
            type="date"
            value={eventForm.eventDate}
            onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Arrecadado"
            value={eventForm.raisedAmount}
            onChange={(e) => setEventForm({ ...eventForm, raisedAmount: e.target.value })}
          />
          <input
            type="number"
            placeholder="Gasto"
            value={eventForm.spentAmount}
            onChange={(e) => setEventForm({ ...eventForm, spentAmount: e.target.value })}
          />
          <input
            placeholder="Descrição"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
          />
          <div className="form-actions">
            <button type="submit">{editingEventId ? 'Atualizar evento' : 'Salvar evento'}</button>
            {editingEventId && (
              <button type="button" className="ghost" onClick={onReset}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="lock-hint">Somente o tesoureiro pode registrar eventos.</p>
      )}

      <div className="events-list">
        {events.map((eventItem) => (
          <article key={eventItem.id} className="event-card">
            <div>
              <h3>{eventItem.name}</h3>
              <span>{eventItem.event_date}</span>
            </div>
            <p>{eventItem.description}</p>
            <p>
              Arrecadado {formatCurrency(eventItem.raised_amount)} • Gasto{' '}
              {formatCurrency(eventItem.spent_amount)} • Saldo{' '}
              {formatCurrency((eventItem.raised_amount || 0) - (eventItem.spent_amount || 0))}
            </p>
            {canEdit && (
              <div className="goal-actions">
                <button onClick={() => onEdit(eventItem)}>Editar</button>
                <button className="ghost" onClick={() => onDelete(eventItem.id)}>
                  Remover
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
