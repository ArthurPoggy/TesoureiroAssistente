import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function SettingsPanel({
  settingsForm,
  setSettingsForm,
  loading,
  saving,
  onSave,
  onClose,
  showToast,
  handleError
}) {
  const { isAdmin, apiFetch } = useAuth();
  const [driveStatus, setDriveStatus] = useState({ loading: true, connected: false, source: 'none' });
  const [driveConnecting, setDriveConnecting] = useState(false);

  const loadDriveStatus = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setDriveStatus((prev) => ({ ...prev, loading: true }));
    try {
      const data = await apiFetch('/api/google-drive/status');
      setDriveStatus({
        loading: false,
        connected: Boolean(data.connected),
        source: data.source || 'none'
      });
    } catch (error) {
      setDriveStatus((prev) => ({ ...prev, loading: false }));
      if (handleError) {
        handleError(error);
      }
    }
  }, [apiFetch, handleError]);

  useEffect(() => {
    loadDriveStatus();
  }, [loadDriveStatus]);

  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'drive-auth') {
        loadDriveStatus();
        if (showToast) {
          showToast('Google Drive conectado');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [loadDriveStatus, showToast]);

  const handleDriveConnect = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setDriveConnecting(true);
    try {
      const data = await apiFetch('/api/google-drive/auth-url');
      if (data?.url) {
        window.open(data.url, 'drive_oauth', 'width=520,height=680,noopener,noreferrer');
        if (showToast) {
          showToast('Abra a janela do Google e conclua a conexão');
        }
      }
    } catch (error) {
      if (handleError) {
        handleError(error);
      }
    } finally {
      setDriveConnecting(false);
    }
  }, [apiFetch, handleError, showToast]);

  const driveStatusLabel = {
    service_account: 'Service Account',
    env: 'Variável de ambiente',
    db: 'Salvo no banco',
    none: 'Não configurado'
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <section className="modal settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Configurações</h2>
            <p>Ajuste informações gerais do tesouro do clã.</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form
          className="form-grid settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="settings-field">
            <label htmlFor="org-name">Nome do grupo</label>
            <input
              id="org-name"
              value={settingsForm.orgName}
              onChange={(event) => setSettingsForm({ ...settingsForm, orgName: event.target.value })}
              disabled={loading || saving}
            />
            <small>Este nome aparece no topo e nos recibos.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="org-tagline">Subtítulo</label>
            <input
              id="org-tagline"
              value={settingsForm.orgTagline}
              onChange={(event) => setSettingsForm({ ...settingsForm, orgTagline: event.target.value })}
              disabled={loading || saving}
            />
            <small>Uma frase curta para contextualizar o painel.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="default-amount">Valor padrão do pagamento</label>
            <input
              id="default-amount"
              type="number"
              step="0.01"
              value={settingsForm.defaultPaymentAmount}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, defaultPaymentAmount: event.target.value })
              }
              disabled={loading || saving}
            />
            <small>Preenche automaticamente novos pagamentos.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="payment-due-day">Dia padrão de vencimento</label>
            <input
              id="payment-due-day"
              type="number"
              min="1"
              max="31"
              placeholder="Opcional"
              value={settingsForm.paymentDueDay}
              onChange={(event) => setSettingsForm({ ...settingsForm, paymentDueDay: event.target.value })}
              disabled={loading || saving}
            />
            <small>Exibido como lembrete nas telas de pagamento.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="current-balance">Saldo atual</label>
            <input
              id="current-balance"
              type="number"
              step="0.01"
              value={settingsForm.currentBalance}
              onChange={(event) => setSettingsForm({ ...settingsForm, currentBalance: event.target.value })}
              disabled={loading || saving}
            />
            <small>Use este campo para ajustar o saldo real do caixa.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="pix-key">Chave PIX</label>
            <input
              id="pix-key"
              value={settingsForm.pixKey}
              onChange={(event) => setSettingsForm({ ...settingsForm, pixKey: event.target.value })}
              disabled={loading || saving}
              placeholder="Opcional"
            />
            <small>Exibida na área de pagamentos para facilitar a cobrança.</small>
          </div>

          <div className="settings-field">
            <label htmlFor="pix-receiver">Recebedor PIX</label>
            <input
              id="pix-receiver"
              value={settingsForm.pixReceiver}
              onChange={(event) => setSettingsForm({ ...settingsForm, pixReceiver: event.target.value })}
              disabled={loading || saving}
              placeholder="Nome do titular"
            />
            <small>Ajuda os membros a conferirem o destinatário.</small>
          </div>

          <div className="settings-field settings-field-full">
            <label htmlFor="document-footer">Mensagem do recibo</label>
            <textarea
              id="document-footer"
              value={settingsForm.documentFooter}
              onChange={(event) => setSettingsForm({ ...settingsForm, documentFooter: event.target.value })}
              disabled={loading || saving}
            />
            <small>Texto exibido no rodapé de recibos e relatórios.</small>
          </div>

          <div className="settings-field settings-field-full">
            <label htmlFor="dashboard-note">Aviso do painel</label>
            <textarea
              id="dashboard-note"
              value={settingsForm.dashboardNote}
              onChange={(event) => setSettingsForm({ ...settingsForm, dashboardNote: event.target.value })}
              disabled={loading || saving}
              placeholder="Mensagem rápida para todos os usuários"
            />
            <small>Mostrado no topo da visão geral financeira.</small>
          </div>

          <div className="settings-field settings-field-full">
            <label>Google Drive</label>
            <div className="buttons">
              <button
                type="button"
                onClick={handleDriveConnect}
                disabled={loading || saving || driveConnecting}
              >
                {driveConnecting
                  ? 'Conectando...'
                  : driveStatus.connected
                    ? 'Reconectar Drive'
                    : 'Conectar Drive'}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={loadDriveStatus}
                disabled={driveStatus.loading}
              >
                {driveStatus.loading ? 'Atualizando...' : 'Atualizar status'}
              </button>
            </div>
            <small>
              Status: {driveStatus.connected ? 'Conectado' : 'Desconectado'} ·{' '}
              {driveStatusLabel[driveStatus.source] || driveStatusLabel.none}
            </small>
            <small>
              Use esta opção para renovar o refresh token quando aparecer “invalid_grant”.
            </small>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || saving}>
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
