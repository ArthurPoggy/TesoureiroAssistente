import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBinary, uploadDriveFile } from '../services/api';
import { currentMonth, currentYear } from '../utils/formatters';

export function usePayments(showToast, handleError, selectedMemberId, members = [], defaultAmount = 100) {
  const { apiFetch, authToken } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
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
    const currentAmount = Number(paymentForm.amount);
    const previousDefault = Number(lastDefaultAmount);
    const nextDefault = Number(defaultAmount);
    if (Number.isNaN(nextDefault)) {
      return;
    }
    if (!paymentForm.amount || currentAmount === previousDefault) {
      setPaymentForm((prev) => ({ ...prev, amount: nextDefault }));
    }
    setLastDefaultAmount(nextDefault);
  }, [defaultAmount, lastDefaultAmount, paymentForm.amount]);

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const query = params.toString();
      const data = await apiFetch(query ? `/api/payments?${query}` : '/api/payments');
      setPayments(data.payments || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, handleError, selectedMemberId]);

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
    fileInputKey
  };
}
