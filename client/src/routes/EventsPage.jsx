import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../hooks';
import { Toast } from '../components';

// Painel de eventos carregado sob demanda (rota dedicada /eventos).
const EventsPanel = lazy(() =>
  import('../components/events/EventsPanel').then((mod) => ({ default: mod.EventsPanel }))
);

// Rota /eventos: cadastro e listagem de eventos, isolados em sua própria
// rota. O hook useEvents segue funcionando como antes.
export function EventsPage() {
  const { authToken, authChecked } = useAuth();
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleError = useCallback((error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  }, [showToast]);

  const {
    events,
    eventForm,
    setEventForm,
    editingEventId,
    loadEvents,
    resetEventForm,
    handleEventSubmit,
    handleEventDelete,
    startEditEvent
  } = useEvents(showToast, handleError);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadEvents();
  }, [authToken, authChecked, loadEvents]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <EventsPanel
          events={events}
          eventForm={eventForm}
          setEventForm={setEventForm}
          editingEventId={editingEventId}
          onSubmit={handleEventSubmit}
          onDelete={handleEventDelete}
          onEdit={startEditEvent}
          onReset={resetEventForm}
        />
      </Suspense>
    </div>
  );
}
