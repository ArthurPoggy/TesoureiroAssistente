import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useSettings(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [currentBalance, setCurrentBalance] = useState(null);
  const [balanceInput, setBalanceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/settings');
      const balance = Number(data.currentBalance ?? 0);
      setCurrentBalance(balance);
      setBalanceInput(String(balance));
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, handleError]);

  const saveBalance = useCallback(async () => {
    const parsed = Number(balanceInput);
    if (Number.isNaN(parsed)) {
      showToast('Informe um saldo válido', 'error');
      return false;
    }
    try {
      setSaving(true);
      const data = await apiFetch('/api/settings/balance', {
        method: 'PUT',
        body: { value: parsed }
      });
      const balance = Number(data.currentBalance ?? parsed);
      setCurrentBalance(balance);
      setBalanceInput(String(balance));
      showToast('Saldo atualizado');
      return true;
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [apiFetch, balanceInput, handleError, showToast]);

  return {
    currentBalance,
    balanceInput,
    setBalanceInput,
    loading,
    saving,
    loadSettings,
    saveBalance
  };
}
