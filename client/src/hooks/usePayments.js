import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBinary, uploadDriveFile } from '../services/api';
import { currentMonth, currentYear } from '../utils/formatters';

const FILTERS_STORAGE_KEY = 'tesoureiro_payment_filters';
const DEBOUNCE_MS = 300;

const DEFAULT_FILTERS = {
  filterMonth: '',
  filterYear: '',
  filterMemberId: '',
  filterStatus: '',
  filterMinAmount: '',
  filterMaxAmount: '',
  filterNotes: '',
  filterHasAttachment: '',
  filterGoalId: ''
};

function loadStoredFilters() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_FILTERS;
  }
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_FILTERS, ...parsed };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function persistFilters(filters) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // ignora erro de quota ou modo privado
  }
}

export function usePayments(showToast, handleError, selectedMemberId, members = [], defaultAmount = 100) {
  const { apiFetch, authToken } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  const stored = useMemo(loadStoredFilters, []);
  const [filterMonth, setFilterMonth] = useState(stored.filterMonth);
  const [filterYear, setFilterYear] = useState(stored.filterYear);
  const [filterMemberId, setFilterMemberId] = useState(stored.filterMemberId);
  const [filterStatus, setFilterStatus] = useState(stored.filterStatus);
  const [filterMinAmount, setFilterMinAmount] = useState(stored.filterMinAmount);
  const [filterMaxAmount, setFilterMaxAmount] = useState(stored.filterMaxAmount);
  const [filterNotes, setFilterNotes] = useState(stored.filterNotes);
  const [filterHasAttachment, setFilterHasAttachment] = useState(stored.filterHasAttachment);
  const [filterGoalId, setFilterGoalId] = useState(stored.filterGoalId);

  // Debounce para inputs de texto/número que disparam a cada keystroke
  const [debouncedNotes, setDebouncedNotes] = useState(stored.filterNotes);
  const [debouncedMinAmount, setDebouncedMinAmount] = useState(stored.filterMinAmount);
  const [debouncedMaxAmount, setDebouncedMaxAmount] = useState(stored.filterMaxAmount);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedNotes(filterNotes), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterNotes]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMinAmount(filterMinAmount), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterMinAmount]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedMaxAmount(filterMaxAmount), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filterMaxAmount]);

  // Persistência consolidada (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      persistFilters({
        filterMonth,
        filterYear,
        filterMemberId,
        filterStatus,
        filterMinAmount,
        filterMaxAmount,
        filterNotes,
        filterHasAttachment,
        filterGoalId
      });
    }, 500);
    return () => clearTimeout(t);
  }, [
    filterMonth,
    filterYear,
    filterMemberId,
    filterStatus,
    filterMinAmount,
    filterMaxAmount,
    filterNotes,
    filterHasAttachment,
    filterGoalId
  ]);

  const activeFiltersCount = useMemo(() => {
    return [
      filterMonth,
      filterYear,
      filterMemberId,
      filterStatus,
      filterMinAmount,
      filterMaxAmount,
      filterNotes,
      filterHasAttachment,
      filterGoalId
    ].filter((v) => v !== '' && v !== null && v !== undefined).length;
  }, [
    filterMonth,
    filterYear,
    filterMemberId,
    filterStatus,
    filterMinAmount,
    filterMaxAmount,
    filterNotes,
    filterHasAttachment,
    filterGoalId
  ]);

  const [lastDefaultAmount, setLastDefaultAmount] = useState(defaultAmount);
  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    month: currentMonth,
    year: currentYear,
    amount: defaultAmount,
    paid: true,
    paidAt: new Date().toISOString().slice(0, 10),
    notes: '',
    goalId: '',
    attachmentName: '',
    attachmentFile: null
  });

  useEffect(() => {
    const nextDefault = Number(defaultAmount);
    if (Number.isNaN(nextDefault)) return;
    setPaymentForm((prev) => {
      const currentAmount = Number(prev.amount);
      const previousDefault = Number(lastDefaultAmount);
      if (!prev.amount || currentAmount === previousDefault) {
        return { ...prev, amount: nextDefault };
      }
      return prev;
    });
    setLastDefaultAmount(nextDefault);
  }, [defaultAmount, lastDefaultAmount]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const effectiveMemberId = selectedMemberId || filterMemberId;
      const params = new URLSearchParams({
        ...(effectiveMemberId ? { memberId: effectiveMemberId } : {}),
        ...(filterMonth ? { month: filterMonth } : {}),
        ...(filterYear ? { year: filterYear } : {}),
        ...(filterStatus ? { status: filterStatus } : {}),
        ...(debouncedMinAmount !== '' ? { minAmount: debouncedMinAmount } : {}),
        ...(debouncedMaxAmount !== '' ? { maxAmount: debouncedMaxAmount } : {}),
        ...(debouncedNotes ? { notes: debouncedNotes } : {}),
        ...(filterHasAttachment ? { hasAttachment: filterHasAttachment } : {}),
        ...(filterGoalId ? { goalId: filterGoalId } : {}),
        page,
        pageSize
      });
      const data = await apiFetch(`/api/payments?${params.toString()}`);
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [
    apiFetch,
    handleError,
    selectedMemberId,
    filterMonth,
    filterYear,
    filterMemberId,
    filterStatus,
    debouncedMinAmount,
    debouncedMaxAmount,
    debouncedNotes,
    filterHasAttachment,
    filterGoalId,
    page,
    pageSize
  ]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleFilterMonthChange = useCallback((val) => {
    setFilterMonth(val);
    setPage(1);
  }, []);
  const handleFilterYearChange = useCallback((val) => {
    setFilterYear(val);
    setPage(1);
  }, []);
  const handleFilterMemberChange = useCallback((val) => {
    setFilterMemberId(val);
    setPage(1);
  }, []);
  const handleFilterStatusChange = useCallback((val) => {
    setFilterStatus(val);
    setPage(1);
  }, []);
  const handleFilterMinAmountChange = useCallback((val) => {
    setFilterMinAmount(val);
    setPage(1);
  }, []);
  const handleFilterMaxAmountChange = useCallback((val) => {
    setFilterMaxAmount(val);
    setPage(1);
  }, []);
  const handleFilterNotesChange = useCallback((val) => {
    setFilterNotes(val);
    setPage(1);
  }, []);
  const handleFilterHasAttachmentChange = useCallback((val) => {
    setFilterHasAttachment(val);
    setPage(1);
  }, []);
  const handleFilterGoalIdChange = useCallback((val) => {
    setFilterGoalId(val);
    setPage(1);
  }, []);
  const handlePageSizeChange = useCallback((val) => {
    setPageSize(Number(val));
    setPage(1);
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterMonth('');
    setFilterYear('');
    setFilterMemberId('');
    setFilterStatus('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterNotes('');
    setFilterHasAttachment('');
    setFilterGoalId('');
    setPage(1);
  }, []);

  const handlePaymentSubmit = useCallback(async (event, refreshCallbacks = []) => {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!paymentForm.memberId) {
      showToast('Selecione um membro', 'error');
      return;
    }
    if (!paymentForm.attachmentFile) {
      showToast('Anexo é obrigatório', 'error');
      return;
    }
    try {
      setSubmitting(true);
      const memberIdValue = Number(paymentForm.memberId);
      const member = members.find((item) => item.id === memberIdValue);
      const memberLabel = member?.name || member?.email || `membro-${memberIdValue}`;
      const monthValue = Number(paymentForm.month);
      const yearValue = Number(paymentForm.year);
      const monthFolder = String(monthValue).padStart(2, '0');
      const uploadResponse = await uploadDriveFile(
        paymentForm.attachmentFile,
        paymentForm.attachmentName,
        authToken,
        {
          module: 'Pagamentos',
          year: yearValue,
          month: monthFolder,
          label: memberLabel
        }
      );
      const uploadedFile = uploadResponse?.file;
      const attachmentName = uploadedFile?.name || paymentForm.attachmentName || null;
      const attachmentUrl = uploadedFile?.webViewLink || uploadedFile?.webContentLink || null;
      const attachmentId = uploadedFile?.id || null;
      const payload = {
        memberId: memberIdValue,
        month: monthValue,
        year: yearValue,
        amount: Number(paymentForm.amount),
        paid: paymentForm.paid,
        paidAt: paymentForm.paidAt,
        notes: paymentForm.notes,
        goalId: paymentForm.goalId ? Number(paymentForm.goalId) : null,
        attachmentId,
        attachmentName,
        attachmentUrl
      };
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await Promise.all([loadPayments(), ...refreshCallbacks.map(cb => cb())]);
      setPaymentForm((prev) => ({
        ...prev,
        attachmentName: '',
        attachmentFile: null
      }));
      setFileInputKey((value) => value + 1);
      showToast('Pagamento registrado');
    } catch (error) {
      handleError(error);
    } finally {
      setSubmitting(false);
    }
  }, [apiFetch, authToken, handleError, loadPayments, members, paymentForm, showToast, submitting]);

  const handlePaymentDelete = useCallback(async (id, refreshCallbacks = []) => {
    if (!window.confirm('Remover este pagamento?')) return;
    try {
      await apiFetch(`/api/payments/${id}`, { method: 'DELETE' });
      await Promise.all([loadPayments(), ...refreshCallbacks.map(cb => cb())]);
      showToast('Pagamento removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadPayments, showToast]);

  const handleReceipt = useCallback(async (id) => {
    try {
      await downloadBinary(`/api/payments/${id}/receipt`, `recibo-${id}.pdf`, authToken);
      showToast('Recibo gerado');
    } catch (error) {
      handleError(error);
    }
  }, [authToken, handleError, showToast]);

  return {
    payments,
    paymentForm,
    setPaymentForm,
    loading,
    submitting,
    loadPayments,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleReceipt,
    fileInputKey,
    page,
    pageSize,
    total,
    setPage,
    filterMonth,
    filterYear,
    filterMemberId,
    filterStatus,
    filterMinAmount,
    filterMaxAmount,
    filterNotes,
    filterHasAttachment,
    filterGoalId,
    activeFiltersCount,
    onFilterMonthChange: handleFilterMonthChange,
    onFilterYearChange: handleFilterYearChange,
    onFilterMemberChange: handleFilterMemberChange,
    onFilterStatusChange: handleFilterStatusChange,
    onFilterMinAmountChange: handleFilterMinAmountChange,
    onFilterMaxAmountChange: handleFilterMaxAmountChange,
    onFilterNotesChange: handleFilterNotesChange,
    onFilterHasAttachmentChange: handleFilterHasAttachmentChange,
    onFilterGoalIdChange: handleFilterGoalIdChange,
    onPageSizeChange: handlePageSizeChange,
    onClearFilters: clearAllFilters
  };
}
