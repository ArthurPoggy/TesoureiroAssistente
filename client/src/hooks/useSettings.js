import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DEFAULT_PUBLIC = {
  orgName: 'Tesoureiro Assistente',
  orgTagline: 'Controle completo de membros, pagamentos, metas e eventos do clã.',
  defaultPaymentAmount: 100,
  paymentDueDay: null,
  pixKey: '',
  pixReceiver: '',
  dashboardNote: '',
  disclaimerText: ''
};

export function useSettings(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [publicSettings, setPublicSettings] = useState(DEFAULT_PUBLIC);
  const [settingsForm, setSettingsForm] = useState({
    orgName: DEFAULT_PUBLIC.orgName,
    orgTagline: DEFAULT_PUBLIC.orgTagline,
    defaultPaymentAmount: String(DEFAULT_PUBLIC.defaultPaymentAmount),
    currentBalance: '0',
    documentFooter: '',
    paymentDueDay: '',
    pixKey: '',
    pixReceiver: '',
    dashboardNote: '',
    disclaimerText: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const normalizePublic = useCallback((data = {}) => {
    const parsedAmount = Number(data.defaultPaymentAmount ?? DEFAULT_PUBLIC.defaultPaymentAmount);
    const rawDueDay = data.paymentDueDay;
    const parsedDueDay =
      rawDueDay === null || rawDueDay === undefined || rawDueDay === ''
        ? null
        : Number(rawDueDay);
    const normalizedDueDay =
      Number.isInteger(parsedDueDay) && parsedDueDay >= 1 && parsedDueDay <= 31 ? parsedDueDay : null;
    return {
      orgName: data.orgName || DEFAULT_PUBLIC.orgName,
      orgTagline: data.orgTagline ?? DEFAULT_PUBLIC.orgTagline,
      defaultPaymentAmount: Number.isNaN(parsedAmount) ? DEFAULT_PUBLIC.defaultPaymentAmount : parsedAmount,
      paymentDueDay: normalizedDueDay,
      pixKey: data.pixKey || '',
      pixReceiver: data.pixReceiver || '',
      dashboardNote: data.dashboardNote || '',
      disclaimerText: data.disclaimerText ?? ''
    };
  }, []);

  const loadPublicSettings = useCallback(async () => {
    try {
      const data = await apiFetch('/api/settings/public');
      setPublicSettings(normalizePublic(data));
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, normalizePublic]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/settings');
      const normalized = normalizePublic(data);
      setPublicSettings(normalized);
      setSettingsForm({
        orgName: data.orgName ?? normalized.orgName,
        orgTagline: data.orgTagline ?? normalized.orgTagline,
        defaultPaymentAmount: String(normalized.defaultPaymentAmount),
        currentBalance: String(data.currentBalance ?? 0),
        documentFooter: data.documentFooter ?? '',
        paymentDueDay: normalized.paymentDueDay ? String(normalized.paymentDueDay) : '',
        pixKey: data.pixKey ?? '',
        pixReceiver: data.pixReceiver ?? '',
        dashboardNote: data.dashboardNote ?? '',
        disclaimerText: data.disclaimerText ?? ''
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, handleError, normalizePublic]);

  const saveSettings = useCallback(async () => {
    const parsedAmount = Number(settingsForm.defaultPaymentAmount);
    const parsedBalance = Number(settingsForm.currentBalance);
    const trimmedDueDay = String(settingsForm.paymentDueDay || '').trim();
    const parsedDueDay = trimmedDueDay === '' ? null : Number(trimmedDueDay);
    if (Number.isNaN(parsedAmount)) {
      showToast('Informe um valor padrão válido', 'error');
      return false;
    }
    if (Number.isNaN(parsedBalance)) {
      showToast('Informe um saldo válido', 'error');
      return false;
    }
    if (parsedDueDay !== null) {
      if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
        showToast('Informe um dia de vencimento entre 1 e 31', 'error');
        return false;
      }
    }
    try {
      setSaving(true);
      const data = await apiFetch('/api/settings', {
        method: 'PUT',
        body: {
          orgName: settingsForm.orgName,
          orgTagline: settingsForm.orgTagline,
          defaultPaymentAmount: parsedAmount,
          currentBalance: parsedBalance,
          documentFooter: settingsForm.documentFooter,
          paymentDueDay: parsedDueDay === null ? '' : parsedDueDay,
          pixKey: settingsForm.pixKey,
          pixReceiver: settingsForm.pixReceiver,
          dashboardNote: settingsForm.dashboardNote,
          disclaimerText: settingsForm.disclaimerText
        }
      });
      const normalized = normalizePublic(data);
      setPublicSettings(normalized);
      setSettingsForm({
        orgName: data.orgName ?? normalized.orgName,
        orgTagline: data.orgTagline ?? normalized.orgTagline,
        defaultPaymentAmount: String(normalized.defaultPaymentAmount),
        currentBalance: String(data.currentBalance ?? parsedBalance),
        documentFooter: data.documentFooter ?? settingsForm.documentFooter,
        paymentDueDay: normalized.paymentDueDay ? String(normalized.paymentDueDay) : '',
        pixKey: data.pixKey ?? settingsForm.pixKey,
        pixReceiver: data.pixReceiver ?? settingsForm.pixReceiver,
        dashboardNote: data.dashboardNote ?? settingsForm.dashboardNote,
        disclaimerText: data.disclaimerText ?? settingsForm.disclaimerText
      });
      showToast('Configurações salvas');
      return true;
    } catch (error) {
      handleError(error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [apiFetch, handleError, normalizePublic, settingsForm, showToast]);

  return {
    publicSettings,
    settingsForm,
    setSettingsForm,
    loading,
    saving,
    loadPublicSettings,
    loadSettings,
    saveSettings
  };
}
