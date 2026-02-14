import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBinary } from '../services/api';

export function useExtrato(handleError) {
  const { apiFetch, authToken } = useAuth();
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', type: '', memberId: '' });

  const buildQuery = useCallback((overrideFilters) => {
    const active = overrideFilters || filters;
    const params = new URLSearchParams();
    if (active.startDate) params.append('startDate', active.startDate);
    if (active.endDate) params.append('endDate', active.endDate);
    if (active.type) params.append('type', active.type);
    if (active.memberId) params.append('memberId', active.memberId);
    return params.toString();
  }, [filters]);

  const loadExtrato = useCallback(async (overrideFilters) => {
    try {
      setLoading(true);
      const qs = buildQuery(overrideFilters);
      const data = await apiFetch(`/api/extrato${qs ? `?${qs}` : ''}`);
      setEntries(data.entries || []);
      setSummary(data.summary || { totalIncome: 0, totalExpense: 0, netBalance: 0, count: 0 });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, buildQuery, handleError]);

  const exportExtrato = useCallback(async (format = 'csv') => {
    try {
      const qs = buildQuery();
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      await downloadBinary(`/api/extrato/export?format=${format}${qs ? `&${qs}` : ''}`, `extrato.${ext}`, authToken);
    } catch (error) {
      handleError(error);
    }
  }, [authToken, buildQuery, handleError]);

  return {
    entries,
    summary,
    loading,
    filters,
    setFilters,
    loadExtrato,
    exportExtrato
  };
}
