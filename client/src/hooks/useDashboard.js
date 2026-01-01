import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useDashboard(handleError, monthFilter, yearFilter, selectedMemberId) {
  const { apiFetch, authToken } = useAuth();
  const [dashboard, setDashboard] = useState({
    totalRaised: 0,
    totalExpenses: 0,
    balance: 0,
    currentBalance: null,
    monthlyCollections: [],
    goals: [],
    delinquentMembers: [],
    ranking: []
  });
  const [delinquent, setDelinquent] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(monthFilter !== null ? { month: monthFilter } : {}),
        ...(yearFilter !== null ? { year: yearFilter } : {}),
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/dashboard?${params.toString()}`);
      setDashboard(data);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, monthFilter, yearFilter, selectedMemberId]);

  const loadDelinquent = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(monthFilter !== null ? { month: monthFilter } : {}),
        ...(yearFilter !== null ? { year: yearFilter } : {}),
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/members/delinquent?${params.toString()}`);
      setDelinquent(data.members || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, monthFilter, yearFilter, selectedMemberId]);

  const loadRanking = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        ...(yearFilter !== null ? { year: yearFilter } : {}),
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/ranking?${params.toString()}`);
      setRanking(data.ranking || []);
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, yearFilter, selectedMemberId]);

  const handleExport = useCallback(async (format, type, showToast) => {
    try {
      setReportLoading(true);
      const params = new URLSearchParams({
        format,
        type,
        ...(monthFilter !== null ? { month: monthFilter } : {}),
        ...(yearFilter !== null ? { year: yearFilter } : {})
      });
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
      const res = await fetch(`/api/reports/export?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error('Falha ao exportar');
      }
      const blob = await res.blob();
      const monthLabel = monthFilter !== null ? String(monthFilter).padStart(2, '0') : 'todos';
      const yearLabel = yearFilter !== null ? String(yearFilter) : 'todos';
      const filename = `relatorio-${type}-${monthLabel}-${yearLabel}.${format}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast('Relatório gerado');
    } catch (error) {
      handleError(error);
    } finally {
      setReportLoading(false);
    }
  }, [authToken, handleError, monthFilter, yearFilter]);

  return {
    dashboard,
    delinquent,
    ranking,
    reportLoading,
    loadDashboard,
    loadDelinquent,
    loadRanking,
    handleExport
  };
}
