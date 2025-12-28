import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { downloadBinary, uploadDriveFile } from '../services/api';
import { currentMonth, currentYear } from '../utils/formatters';

export function usePayments(showToast, handleError, monthFilter, yearFilter, selectedMemberId) {
  const { apiFetch, authToken } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    month: currentMonth,
    year: currentYear,
    amount: 100,
    paid: true,
    paidAt: new Date().toISOString().slice(0, 10),
    notes: '',
    goalId: '',
    attachmentName: '',
    attachmentFile: null
  });

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(monthFilter !== null ? { month: monthFilter } : {}),
        ...(yearFilter !== null ? { year: yearFilter } : {}),
        ...(selectedMemberId ? { memberId: selectedMemberId } : {})
      });
      const data = await apiFetch(`/api/payments?${params.toString()}`);
      setPayments(data.payments || []);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, handleError, monthFilter, yearFilter, selectedMemberId]);

  const handlePaymentSubmit = useCallback(async (event, refreshCallbacks = []) => {
    event.preventDefault();
    if (!paymentForm.memberId) {
      showToast('Selecione um membro', 'error');
      return;
    }
    if (!paymentForm.attachmentFile) {
      showToast('Anexo é obrigatório', 'error');
      return;
    }
    try {
      const uploadResponse = await uploadDriveFile(
        paymentForm.attachmentFile,
        paymentForm.attachmentName,
        authToken
      );
      const uploadedFile = uploadResponse?.file;
      const attachmentName = uploadedFile?.name || paymentForm.attachmentName || null;
      const attachmentUrl = uploadedFile?.webViewLink || uploadedFile?.webContentLink || null;
      const attachmentId = uploadedFile?.id || null;
      const payload = {
        memberId: Number(paymentForm.memberId),
        month: Number(paymentForm.month),
        year: Number(paymentForm.year),
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
    }
  }, [apiFetch, authToken, handleError, loadPayments, paymentForm, showToast]);

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
    loadPayments,
    handlePaymentSubmit,
    handlePaymentDelete,
    handleReceipt,
    fileInputKey
  };
}
