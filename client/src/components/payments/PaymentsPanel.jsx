import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, months, currentYear } from '../../utils/formatters';
import { useState } from 'react';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

const STATUS_LABELS = { paid: 'Pago', pending: 'Pendente' };
const HAS_ATTACHMENT_LABELS = { true: 'Com anexo', false: 'Sem anexo' };

function buildActiveChips({
  filterMonth,
  filterYear,
  filterMemberId,
  filterStatus,
  filterMinAmount,
  filterMaxAmount,
  filterNotes,
  filterHasAttachment,
  filterGoalId,
  members,
  goals,
  handlers
}) {
  const chips = [];
  if (filterMonth) {
    const monthLabel = months.find((m) => String(m.value) === String(filterMonth))?.label || filterMonth;
    chips.push({ key: 'month', label: `Mês: ${monthLabel}`, onClear: () => handlers.onFilterMonthChange('') });
  }
  if (filterYear) {
    chips.push({ key: 'year', label: `Ano: ${filterYear}`, onClear: () => handlers.onFilterYearChange('') });
  }
  if (filterMemberId) {
    const member = members.find((m) => String(m.id) === String(filterMemberId));
    chips.push({
      key: 'member',
      label: `Membro: ${member?.name || filterMemberId}`,
      onClear: () => handlers.onFilterMemberChange('')
    });
  }
  if (filterStatus) {
    chips.push({
      key: 'status',
      label: `Status: ${STATUS_LABELS[filterStatus] || filterStatus}`,
      onClear: () => handlers.onFilterStatusChange('')
    });
  }
  if (filterMinAmount !== '' && filterMinAmount !== undefined && filterMinAmount !== null) {
    chips.push({
      key: 'minAmount',
      label: `Valor ≥ ${formatCurrency(Number(filterMinAmount))}`,
      onClear: () => handlers.onFilterMinAmountChange('')
    });
  }
  if (filterMaxAmount !== '' && filterMaxAmount !== undefined && filterMaxAmount !== null) {
    chips.push({
      key: 'maxAmount',
      label: `Valor ≤ ${formatCurrency(Number(filterMaxAmount))}`,
      onClear: () => handlers.onFilterMaxAmountChange('')
    });
  }
  if (filterNotes) {
    chips.push({
      key: 'notes',
      label: `Obs: "${filterNotes}"`,
      onClear: () => handlers.onFilterNotesChange('')
    });
  }
  if (filterHasAttachment) {
    chips.push({
      key: 'hasAttachment',
      label: HAS_ATTACHMENT_LABELS[filterHasAttachment] || filterHasAttachment,
      onClear: () => handlers.onFilterHasAttachmentChange('')
    });
  }
  if (filterGoalId) {
    const goal = goals.find((g) => String(g.id) === String(filterGoalId));
    chips.push({
      key: 'goal',
      label: `Meta: ${goal?.title || filterGoalId}`,
      onClear: () => handlers.onFilterGoalIdChange('')
    });
  }
  return chips;
}

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
  page = 1,
  pageSize = 25,
  total = 0,
  filterMonth = '',
  filterYear = '',
  filterMemberId = '',
  filterStatus = '',
  filterMinAmount = '',
  filterMaxAmount = '',
  filterNotes = '',
  filterHasAttachment = '',
  filterGoalId = '',
  activeFiltersCount = 0,
  onPageChange,
  onPageSizeChange,
  onFilterMonthChange,
  onFilterYearChange,
  onFilterMemberChange,
  onFilterStatusChange,
  onFilterMinAmountChange,
  onFilterMaxAmountChange,
  onFilterNotesChange,
  onFilterHasAttachmentChange,
  onFilterGoalIdChange,
  onClearFilters,
  children
}) {
  const { canEdit } = useAuth();
  const [errors, setErrors] = useState({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const paymentInfoItems = [];
  const validate = () => {
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

  const handlers = {
    onFilterMonthChange,
    onFilterYearChange,
    onFilterMemberChange,
    onFilterStatusChange,
    onFilterMinAmountChange,
    onFilterMaxAmountChange,
    onFilterNotesChange,
    onFilterHasAttachmentChange,
    onFilterGoalIdChange
  };

  const chips = buildActiveChips({
    filterMonth,
    filterYear,
    filterMemberId,
    filterStatus,
    filterMinAmount,
    filterMaxAmount,
    filterNotes,
    filterHasAttachment,
    filterGoalId,
    members,
    goals,
    handlers
  });

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
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const validationErrors = validate();
            if (Object.keys(validationErrors).length > 0) {
              setErrors(validationErrors);
              return;
            }
            onSubmit(e);
          }}
          aria-busy={submitting}
        >
          <select
            value={paymentForm.memberId}
            onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })}
            required
          >
            {errors.memberId && <span className="error">{errors.memberId}</span>}
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
      ) : (
        <p className="lock-hint">Somente o tesoureiro pode registrar ou editar pagamentos.</p>
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
          <button
            type="button"
            className="ghost filters-toggle-btn"
            onClick={() => setFiltersExpanded((v) => !v)}
            aria-expanded={filtersExpanded}
            aria-controls="advanced-filters"
          >
            {filtersExpanded ? '▼ Filtros avançados' : '▶ Filtros avançados'}
            {activeFiltersCount > 0 && (
              <span className="filters-badge">{activeFiltersCount}</span>
            )}
          </button>
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

      {filtersExpanded && (
        <div className="advanced-filters" id="advanced-filters">
          <div className="advanced-filters-grid">
            <label className="filter-field">
              <span>Status</span>
              <select
                value={filterStatus}
                onChange={(e) => onFilterStatusChange?.(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Valor mínimo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filterMinAmount}
                onChange={(e) => onFilterMinAmountChange?.(e.target.value)}
                placeholder="0,00"
              />
            </label>
            <label className="filter-field">
              <span>Valor máximo</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={filterMaxAmount}
                onChange={(e) => onFilterMaxAmountChange?.(e.target.value)}
                placeholder="0,00"
              />
            </label>
            <label className="filter-field filter-field-wide">
              <span>Busca em observações</span>
              <input
                type="text"
                value={filterNotes}
                onChange={(e) => onFilterNotesChange?.(e.target.value)}
                placeholder="Digite para buscar..."
              />
            </label>
            <label className="filter-field">
              <span>Anexo</span>
              <select
                value={filterHasAttachment}
                onChange={(e) => onFilterHasAttachmentChange?.(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Com anexo</option>
                <option value="false">Sem anexo</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Meta</span>
              <select
                value={filterGoalId}
                onChange={(e) => onFilterGoalIdChange?.(e.target.value)}
              >
                <option value="">Todas</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>{goal.title}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="filter-chips" role="region" aria-label="Filtros ativos">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                type="button"
                className="filter-chip-clear"
                aria-label={`Remover filtro: ${chip.label}`}
                onClick={chip.onClear}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="ghost clear-filters-btn"
            onClick={onClearFilters}
          >
            Limpar todos ({activeFiltersCount})
          </button>
        </div>
      )}

      <div className={`table-wrapper${loading ? ' table-wrapper--loading' : ''}`}>
        {loading && payments.length === 0 ? (
          <p className="table-loading-msg">Carregando pagamentos...</p>
        ) : (
          <>
            {loading && (
              <div className="table-loading-overlay" role="status" aria-label="Carregando">
                <span className="spinner table-spinner" aria-hidden="true" />
              </div>
            )}
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
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="table-empty">
                      Nenhum pagamento corresponde aos filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.member_name}</td>
                      <td>{payment.month}/{payment.year}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td className={payment.paid ? 'paid' : 'pending'}>
                        {payment.paid ? 'Pago' : 'Pendente'}
                      </td>
                      <td>{payment.goal_id ? goals.find((g) => g.id === payment.goal_id)?.title : '-'}</td>
                      {canEdit && (
                        <td>
                          <button onClick={() => onReceipt(payment.id)}>Gerar recibo</button>
                          <button className="ghost" onClick={() => onDelete(payment.id)}>Remover</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
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
