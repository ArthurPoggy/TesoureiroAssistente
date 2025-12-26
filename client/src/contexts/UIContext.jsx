import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { currentMonth, currentYear, parseMonthFilter, parseYearFilter } from '../utils/formatters';

const UIContext = createContext(null);

export function UIProvider({ children, members = [], authUser = {} }) {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [selectedUserFilter, setSelectedUserFilter] = useState('all');

  const isAdmin = authUser.role === 'admin';

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const handleError = useCallback((error) => {
    console.error(error);
    showToast(error.message || 'Algo deu errado', 'error');
  }, [showToast]);

  // Opções de filtro por usuário
  const userFilterOptions = useMemo(() => {
    const options = [{ id: 'all', label: 'Todos', memberId: null }];
    if (isAdmin) {
      members.forEach((member) => {
        options.push({
          id: `member-${member.id}`,
          label: member.name || member.email,
          memberId: member.id
        });
      });
      return options;
    }
    if (authUser.memberId) {
      const member = members.find((item) => item.id === authUser.memberId);
      options.push({
        id: 'me',
        label: member?.name || authUser.name || authUser.email,
        memberId: authUser.memberId
      });
    }
    return options;
  }, [isAdmin, members, authUser]);

  // Reset filtro se opção não existir mais
  useEffect(() => {
    if (!userFilterOptions.some((option) => option.id === selectedUserFilter)) {
      setSelectedUserFilter('all');
    }
  }, [userFilterOptions, selectedUserFilter]);

  const selectedUser = useMemo(
    () => userFilterOptions.find((option) => option.id === selectedUserFilter) || userFilterOptions[0],
    [userFilterOptions, selectedUserFilter]
  );

  const selectedMemberId = useMemo(() => selectedUser?.memberId || null, [selectedUser]);

  const monthFilter = useMemo(() => parseMonthFilter(selectedMonth), [selectedMonth]);
  const yearFilter = useMemo(() => parseYearFilter(selectedYear), [selectedYear]);

  const resetFilters = useCallback(() => {
    setSelectedMonth('all');
    setSelectedYear('');
  }, []);

  const value = {
    // Toast
    toast,
    showToast,
    handleError,
    // Loading
    loading,
    setLoading,
    reportLoading,
    setReportLoading,
    // Filtros
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedUserFilter,
    setSelectedUserFilter,
    userFilterOptions,
    selectedUser,
    selectedMemberId,
    monthFilter,
    yearFilter,
    resetFilters
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI deve ser usado dentro de um UIProvider');
  }
  return context;
}
