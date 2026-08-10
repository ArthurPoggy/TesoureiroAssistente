import { useCallback, useState } from 'react';

// Hook compartilhado de toast/handleError. Cada rota migrada (DashboardPage,
// PaymentsPage, ExpensesPage etc.) precisa de sua própria instância de toast
// — elas não compartilham estado global de dados (ver nota em AppLayout.jsx),
// então este hook existe apenas para eliminar a duplicação do boilerplate de
// UI (mensagem, timeout, log de erro) que antes era copiado em cada página.
export function useToast() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleError = useCallback((error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  }, [showToast]);

  return { toast, showToast, handleError };
}
