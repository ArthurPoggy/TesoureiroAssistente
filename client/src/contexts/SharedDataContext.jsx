import { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useMembers, useGoals, useSettings, useToast } from '../hooks';
import { Toast } from '../components';

const SharedDataContext = createContext(null);

// Compartilha, entre todas as rotas de módulo, os recursos que múltiplas
// páginas carregavam de forma independente (membros, metas e configurações
// públicas) — ver discussão nas rodadas de revisão do PR de roteamento.
// Antes, DashboardPage, PaymentsPage, MembersPage, ProjectsPage e
// ExtratoPage instanciavam useMembers/useGoals/useSettings cada uma por
// conta própria, disparando uma busca de rede redundante ao mesmo recurso
// sempre que o usuário navegava entre rotas que o compartilham (ex.:
// membros ao ir de /dashboard para /membros). Este provider instancia os
// três hooks uma única vez, dispara a carga inicial uma única vez (com uma
// ref para não repetir em re-renders) e expõe o resultado via contexto;
// cada página passou a ler os dados já carregados em vez de buscá-los de
// novo. O formulário completo de configurações (admin, /configuracoes)
// continua com sua própria instância de useSettings em SettingsPage, pois
// usa um endpoint diferente (/api/settings) e não é compartilhado com
// nenhuma outra rota.
export function SharedDataProvider({ children }) {
  const { authToken, authChecked } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const membersData = useMembers(showToast, handleError);
  const goalsData = useGoals(showToast, handleError);
  const { publicSettings, loadPublicSettings } = useSettings(showToast, handleError);

  const { loadMembers } = membersData;
  const { loadGoals } = goalsData;

  const loadedRef = useRef(false);

  useEffect(() => {
    if (!authToken || !authChecked) {
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadMembers();
    loadGoals();
    loadPublicSettings();
  }, [authToken, authChecked, loadMembers, loadGoals, loadPublicSettings]);

  return (
    <SharedDataContext.Provider value={{ ...membersData, ...goalsData, publicSettings, loadPublicSettings }}>
      {toast && <Toast message={toast.message} type={toast.type} />}
      {children}
    </SharedDataContext.Provider>
  );
}

// Hook de leitura do contexto. Lançar quando usado fora do provider ajuda a
// detectar cedo um esquecimento de envolver a árvore de rotas com
// SharedDataProvider, em vez de falhar silenciosamente com dados vazios.
export function useSharedData() {
  const ctx = useContext(SharedDataContext);
  if (!ctx) {
    throw new Error('useSharedData deve ser usado dentro de SharedDataProvider');
  }
  return ctx;
}
