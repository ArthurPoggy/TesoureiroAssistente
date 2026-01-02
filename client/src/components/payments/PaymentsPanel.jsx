import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, months } from '../../utils/formatters';

export function PaymentsPanel({
  payments,
  paymentForm,
  setPaymentForm,
  loading,
  submitting,
  members,
  goals,
  paymentSettings,
  onSubmit,
  onDelete,
  onReceipt,
  fileInputKey,
  children
}) {
  const { canEdit } = useAuth();
  const paymentInfoItems = [];
  if (paymentSettings?.paymentDueDay) {
    paymentInfoItems.push({
      label: 'Vencimento padrão',
      value: `dia ${paymentSettings.paymentDueDay}`
    });
  }
  if (paymentSettings?.pixKey) {
    paymentInfoItems.push({
      label: 'Chave PIX',
      value: paymentSettings.pixKey
    });
  }
  if (paymentSettings?.pixReceiver) {
    paymentInfoItems.push({
      label: 'Recebedor',
      value: paymentSettings.pixReceiver
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Pagamentos mensais</h2>
        <p>Histórico completo e geração de recibos.</p>
      </div>

      {paymentInfoItems.length > 0 && (
        <div className="panel-note">
          <h3>Informações para pagamento</h3>
          <ul className="info-list">
            {paymentInfoItems.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canEdit ? (
        <form className="form-grid" onSubmit={onSubmit} aria-busy={submitting}>
          <select
            value={paymentForm.memberId}
            onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })}
            required
          >
            <option value="">Selecione um membro</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select
            value={paymentForm.month}
            onChange={(e) => setPaymentForm({ ...paymentForm, month: Number(e.target.value) })}
          >
            {months.map((monthOption) => (
              <option key={monthOption.value} value={monthOption.value}>
                {monthOption.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={paymentForm.year}
            onChange={(e) => setPaymentForm({ ...paymentForm, year: Number(e.target.value) })}
          />
          <input
            type="number"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            placeholder="Valor"
          />
          <select
            value={paymentForm.goalId}
            onChange={(e) => setPaymentForm({ ...paymentForm, goalId: e.target.value })}
          >
            <option value="">Meta opcional</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={paymentForm.paid}
              onChange={(e) => setPaymentForm({ ...paymentForm, paid: e.target.checked })}
            />
            Pago
          </label>
          <input
            type="date"
            value={paymentForm.paidAt}
            onChange={(e) => setPaymentForm({ ...paymentForm, paidAt: e.target.value })}
          />
          <input
            placeholder="Observações"
            value={paymentForm.notes}
            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
          />
          <input
            placeholder="Nome do anexo (opcional)"
            value={paymentForm.attachmentName}
            onChange={(e) => setPaymentForm({ ...paymentForm, attachmentName: e.target.value })}
          />
          <input
            key={fileInputKey}
            type="file"
            onChange={(e) =>
              setPaymentForm({
                ...paymentForm,
                attachmentFile: e.target.files ? e.target.files[0] : null
              })
            }
            required
          />
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Registrando...' : 'Registrar pagamento'}
            </button>
            {submitting && (
              <div className="loading-indicator" role="status" aria-live="polite">
                <span className="spinner" aria-hidden="true" />
                <span>Processando pagamento e upload do anexo.</span>
              </div>
            )}
          </div>
        </form>
      ) : (
        <p className="lock-hint">Somente o tesoureiro pode registrar ou editar pagamentos.</p>
      )}

      <div className="table-wrapper">
        {loading ? (
          <p>Carregando pagamentos...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Membro</th>
                <th>Competência</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Meta</th>
                {canEdit && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.member_name}</td>
                  <td>
                    {payment.month}/{payment.year}
                  </td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td className={payment.paid ? 'paid' : 'pending'}>
                    {payment.paid ? 'Pago' : 'Pendente'}
                  </td>
                  <td>{payment.goal_id ? goals.find((goal) => goal.id === payment.goal_id)?.title : '-'}</td>
                  {canEdit && (
                    <td>
                      <button onClick={() => onReceipt(payment.id)}>Gerar recibo</button>
                      <button className="ghost" onClick={() => onDelete(payment.id)}>
                        Remover
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {children}
    </section>
  );
}
