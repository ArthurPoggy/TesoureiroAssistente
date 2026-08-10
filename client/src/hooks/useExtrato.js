import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBinary } from '../services/api';
import { runRequest } from '../utils/hookRequests';

export function useExtrato(handleError, isAdmin) {
  const { apiFetch, authToken } = useAuth();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFiltersState] = useState({ startDate: '', endDate: '', type: '', memberId: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const buildQuery = useCallback((overrideFilters, overridePage, overridePageSize) => {
    const active = overrideFilters || filters;
    const params = new URLSearchParams();
    if (active.startDate) params.append('startDate', active.startDate);
    if (active.endDate) params.append('endDate', active.endDate);
    if (active.type) params.append('type', active.type);
    if (isAdmin && active.memberId) params.append('memberId', active.memberId);
    params.append('page', overridePage || page);
    params.append('pageSize', overridePageSize || pageSize);
    return params.toString();
  }, [filters, isAdmin, page, pageSize]);

  const loadExtrato = useCallback(async (overrideFilters, overridePage, overridePageSize) => {
    try {
      setLoading(true);
      // Chamadas sem página explícita (carga inicial, envio do formulário de
      // filtros) sempre voltam para a primeira página, evitando uma página
      // vazia quando o novo filtro tem menos resultados que a página atual.
      const effectivePage = overridePage || 1;
      if (!overridePage) setPage(1);
      await runRequest(handleError, async () => {
        const qs = buildQuery(overrideFilters, effectivePage, overridePageSize);
        const data = await apiFetch(`/api/extrato${qs ? `?${qs}` : ''}`);
        setEntries(data.entries || []);
        setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 });
        setTotal(data.total || 0);
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch, buildQuery, handleError]);

  // Trocar qualquer filtro reseta a página para 1 imediatamente, no mesmo
  // momento em que o filtro muda — igual aos handlers onFilterMonthChange/
  // onFilterYearChange/onFilterMemberChange do usePayments.
  const handleSetFilters = useCallback((nextFilters) => {
    setPage(1);
    setFiltersState(nextFilters);
  }, []);

  const handlePageChange = useCallback((nextPage) => {
    setPage(nextPage);
    loadExtrato(undefined, nextPage, undefined);
  }, [loadExtrato]);

  const handlePageSizeChange = useCallback((nextPageSize) => {
    const parsedPageSize = Number(nextPageSize);
    setPageSize(parsedPageSize);
    setPage(1);
    loadExtrato(undefined, 1, parsedPageSize);
  }, [loadExtrato]);

  const exportExtrato = useCallback(async (format = 'csv') => {
    await runRequest(handleError, async () => {
      const qs = buildQuery();
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      await downloadBinary(`/api/extrato/export?format=${format}${qs ? `&${qs}` : ''}`, `extrato.${ext}`, authToken);
    });
  }, [authToken, buildQuery, handleError]);

  return {
    entries,
    summary,
    loading,
    filters,
    setFilters: handleSetFilters,
    loadExtrato,
    exportExtrato,
    page,
    pageSize,
    total,
    setPage,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange
  };
}
