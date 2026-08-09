import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Ao trocar de rota via navegação client-side (sem reload completo da
// página), o navegador não volta o scroll para o topo automaticamente —
// diferente de uma navegação tradicional entre páginas. Este componente
// observa o pathname atual e rola a viewport para o topo a cada mudança
// de rota, preservando o comportamento esperado de uma navegação normal.
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
