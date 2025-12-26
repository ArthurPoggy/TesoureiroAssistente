import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useEvents(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    name: '',
    eventDate: new Date().toISOString().slice(0, 10),
    raisedAmount: '',
    spentAmount: '',
    description: ''
  });
  const [editingEventId, setEditingEventId] = useState(null);

  const loadEvents = useCallback(async () => {
    try {
      const data = await apiFetch('/api/events');
      setEvents(data.events || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetEventForm = useCallback(() => {
    setEventForm({
      name: '',
      eventDate: new Date().toISOString().slice(0, 10),
      raisedAmount: '',
      spentAmount: '',
      description: ''
    });
    setEditingEventId(null);
  }, []);

  const handleEventSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: eventForm.name,
        eventDate: eventForm.eventDate,
        raisedAmount: Number(eventForm.raisedAmount || 0),
        spentAmount: Number(eventForm.spentAmount || 0),
        description: eventForm.description
      };
      const endpoint = editingEventId ? `/api/events/${editingEventId}` : '/api/events';
      const method = editingEventId ? 'PUT' : 'POST';
      await apiFetch(endpoint, { method, body: JSON.stringify(payload) });
      await loadEvents();
      resetEventForm();
      showToast('Evento salvo');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, editingEventId, eventForm, handleError, loadEvents, resetEventForm, showToast]);

  const handleEventDelete = useCallback(async (id) => {
    if (!window.confirm('Remover este evento?')) return;
    try {
      await apiFetch(`/api/events/${id}`, { method: 'DELETE' });
      await loadEvents();
      showToast('Evento removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadEvents, showToast]);

  const startEditEvent = useCallback((eventItem) => {
    setEventForm({
      name: eventItem.name,
      eventDate: eventItem.event_date,
      raisedAmount: eventItem.raised_amount,
      spentAmount: eventItem.spent_amount,
      description: eventItem.description || ''
    });
    setEditingEventId(eventItem.id);
  }, []);

  return {
    events,
    eventForm,
    setEventForm,
    editingEventId,
    loadEvents,
    resetEventForm,
    handleEventSubmit,
    handleEventDelete,
    startEditEvent
  };
}
