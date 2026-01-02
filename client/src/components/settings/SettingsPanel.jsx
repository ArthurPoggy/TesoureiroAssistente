import { useAuth } from '../../contexts/AuthContext';

export function SettingsPanel({
  settingsForm,
  setSettingsForm,
  loading,
  saving,
  onSave,
  onClose
}) {
  const { isAdmin } = useAuth();

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
