import { useAuth } from '../../contexts/AuthContext';

export function SettingsPanel({
  balanceInput,
  setBalanceInput,
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
    <section className="panel settings-panel">
      <div className="panel-header">
        <h2>Configurações</h2>
        <p>Ajuste informações gerais do tesouro do clã.</p>
      </div>

      <form
        className="form-grid settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <div className="settings-field">
          <label htmlFor="current-balance">Saldo atual</label>
          <input
            id="current-balance"
            type="number"
            step="0.01"
            value={balanceInput}
            onChange={(event) => setBalanceInput(event.target.value)}
            disabled={loading || saving}
          />
          <small>Use este campo para ajustar o saldo real do caixa.</small>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading || saving}>
            {saving ? 'Salvando...' : 'Salvar saldo'}
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </form>
    </section>
  );
}
