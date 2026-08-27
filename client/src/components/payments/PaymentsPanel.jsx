import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, months, currentYear } from '../../utils/formatters';
import { useLayoutEffect, useRef, useState } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

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
  onPix,
  fileInputKey,
  page = 1,
  pageSize = 25,
  total = 0,
  filterMonth = '',
  filterYear = '',
  filterMemberId = '',
  onPageChange,
  onPageSizeChange,
  onFilterMonthChange,
  onFilterYearChange,
  onFilterMemberChange,
  children
}) {
  const { canEdit, memberId } = useAuth();
  const [errors, setErrors] = useState({});
  const tableWrapperRef = useRef(null);
  const [tableMinHeight, setTableMinHeight] = useState(0);
  const shapeKey = `${pageSize}|${filterMonth}|${filterYear}|${filterMemberId}`;
  const committedShapeKeyRef = useRef(shapeKey);

  // A altura mínima reservada acompanha a maior altura já vista para a
  // combinação atual de filtros/pageSize (tipicamente a página cheia),
  // evitando que uma página "curta" (ex.: última página) colapse a altura
  // do wrapper e cause um salto vertical perceptível durante/após o loading.
  // Ao trocar filtros ou o tamanho de página, o total de linhas esperado
  // muda de "forma", então a reserva é reiniciada — mas só depois que o
  // carregamento da nova "forma" terminar: enquanto `loading` estiver ativo,
  // a página antiga (de shape anterior) ainda está visível sob o overlay, e
  // descartar a reserva agora colapsaria o wrapper e voltaria a crescer
  // quando os dados novos chegassem, produzindo o próprio salto de altura
  // que essa reserva existe para evitar.
  useLayoutEffect(() => {
    if (loading) return;
    if (committedShapeKeyRef.current === shapeKey) return;
    committedShapeKeyRef.current = shapeKey;
    setTableMinHeight(0);
  }, [shapeKey, loading]);

  useLayoutEffect(() => {
    if (loading) return;
    const node = tableWrapperRef.current;
    if (!node) return;
    const height = node.scrollHeight;
    setTableMinHeight((prev) => Math.max(prev, height));
  }, [loading, payments]);
  const canViewOwnPix = (payment) => Boolean(onPix) && payment.member_id === memberId;
  const showActionsColumn = canEdit || payments.some(canViewOwnPix);

  const validatePaymentForm = () => {
    const newErrors = {};

    if (!paymentForm.memberId) {
      newErrors.memberId = 'Selecione um membro';
    }
    if (!paymentForm.amount || paymentForm.amount <= 0) {
      newErrors.amount = 'Valor deve ser maior que zero';
    }
    if (!paymentForm.year) {
      newErrors.year = 'Ano obrigatório';
    }
    if (paymentForm.paid && !paymentForm.paidAt) {
      newErrors.paidAt = 'Informe a data do pagamento';
    }

    return newErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validatePaymentForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    onSubmit(event);
  };

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

      {canEdit && (
        <form className="form-grid" onSubmit={handleSubmit} aria-busy={submitting}>
          {errors.memberId && <span className="error">{errors.memberId}</span>}
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
          {errors.amount && <span className="error">{errors.amount}</span>}
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
      )}

      <div className="table-toolbar">
        <div className="table-toolbar-filters">
          {canEdit && (
            <select
              value={filterMemberId}
              onChange={(e) => onFilterMemberChange?.(e.target.value)}
            >
              <option value="">Todos os membros</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
          <select
            value={filterMonth}
            onChange={(e) => onFilterMonthChange?.(e.target.value)}
          >
            <option value="">Todos os meses</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => onFilterYearChange?.(e.target.value)}
          >
            <option value="">Todos os anos</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="table-toolbar-pagesize">
          <label>
            Por página:
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(e.target.value)}
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        ref={tableWrapperRef}
        className={`table-wrapper${loading ? ' table-wrapper--loading' : ''}`}
        style={tableMinHeight ? { '--table-min-height': `${tableMinHeight}px` } : undefined}
      >
        {loading && payments.length === 0 ? (
          <p className="table-loading-msg">Carregando pagamentos...</p>
        ) : (
          <>
            {loading && (
              <div className="table-loading-overlay" role="status" aria-label="Carregando">
                <span className="spinner table-spinner" aria-hidden="true" />
              </div>
            )}
            <table className="payments-table">
              <colgroup>
                <col className="col-member" />
                <col className="col-period" />
                <col className="col-amount" />
                <col className="col-status" />
                <col className="col-goal" />
                {showActionsColumn && <col className="col-actions" />}
              </colgroup>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Competência</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Meta</th>
                  {showActionsColumn && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.member_name}</td>
                    <td>{payment.month}/{payment.year}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td className={payment.paid ? 'paid' : 'pending'}>
                      {payment.paid ? 'Pago' : 'Pendente'}
                    </td>
                    <td>{payment.goal_id ? goals.find((g) => g.id === payment.goal_id)?.title : '-'}</td>
                    {showActionsColumn && (
                      <td>
                        {(canEdit || canViewOwnPix(payment)) && (
                          <>
                            {canEdit && (
                              <button onClick={() => onReceipt(payment.id)}>Gerar recibo</button>
                            )}
                            {(canEdit || canViewOwnPix(payment)) && onPix && (
                              <button className="ghost" onClick={() => onPix(payment.id)}>PIX</button>
                            )}
                            {canEdit && (
                              <button className="ghost" onClick={() => onDelete(payment.id)}>Remover</button>
                            )}
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {total > 0 && (() => {
        const totalPages = Math.ceil(total / pageSize);
        const from = (page - 1) * pageSize + 1;
        const to = Math.min(page * pageSize, total);
        return (
          <div className="pagination">
            <span className="pagination-info">
              Exibindo {from}–{to} de {total} registros
            </span>
            <div className="pagination-controls">
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(1)} disabled={page === 1} title="Primeira">«</button>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(page - 1)} disabled={page === 1}>Anterior</button>
              <span className="pagination-page">Página {page} de {totalPages}</span>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages}>Próxima</button>
              <button className="ghost pagination-btn" onClick={() => onPageChange?.(totalPages)} disabled={page >= totalPages} title="Última">»</button>
            </div>
          </div>
        );
      })()}

      {children}
    </section>
  );
}
