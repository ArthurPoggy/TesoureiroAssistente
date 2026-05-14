import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const roleLabels = {
  admin: 'Tesoureiro',
  diretor_financeiro: 'Diretor Financeiro',
  viewer: 'Visualização'
};

const maskCpf = (cpf) => {
  if (!cpf) return '-';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
};

const formatAmount = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function MemberDetailView({ member, onInvite, onDelete, onRoleChange }) {
  const { authUser, apiFetch } = useAuth();
  const [changingRole, setChangingRole] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const isStrictAdmin = authUser.role === 'admin';
  const isSelf = authUser?.memberId && String(authUser.memberId) === String(member?.id);

  useEffect(() => {
    if (!member?.id) return;
    let canceled = false;
    setLoadingSummary(true);
    setSummary(null);
    apiFetch(`/api/members/${member.id}/summary`)
      .then((data) => { if (!canceled) setSummary(data); })
      .catch(() => { if (!canceled) setSummary(null); })
      .finally(() => { if (!canceled) setLoadingSummary(false); });
    return () => { canceled = true; };
  }, [member?.id, apiFetch]);

  const handleRoleChange = async (e) => {
    const newRole = e.target.value;
    if (newRole === member.role || !onRoleChange) return;
    setChangingRole(true);
    try {
      await onRoleChange(member.id, newRole);
    } finally {
      setChangingRole(false);
    }
  };

  const effectiveMember = summary?.member || member;

  return (
    <div className="member-detail-panel">
      <div className="member-detail-header">
        <div className="member-detail-avatar">
          {(effectiveMember.name || effectiveMember.nickname || '?')[0].toUpperCase()}
        </div>
        <div>
          <h3>{effectiveMember.name || effectiveMember.nickname || 'Membro'}</h3>
          <span className={`member-status-badge ${effectiveMember.active ? 'status-active' : 'status-inactive'}`}>
            {effectiveMember.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <div className="member-detail-sections">
        <section className="member-detail-section">
          <h4>Dados Pessoais</h4>
          <dl className="member-detail-grid">
            <dt>Email</dt>
            <dd>{effectiveMember.email || '-'}</dd>
            <dt>Apelido</dt>
            <dd>{effectiveMember.nickname || '-'}</dd>
            <dt>CPF / Registro</dt>
            <dd>{maskCpf(effectiveMember.cpf)}</dd>
            <dt>Membro desde</dt>
            <dd>{effectiveMember.joined_at ? new Date(effectiveMember.joined_at).toLocaleDateString('pt-BR') : '-'}</dd>
            <dt>Primeiro acesso</dt>
            <dd>{effectiveMember.must_reset_password ? 'Pendente' : 'Concluído'}</dd>
            <dt>Permissão</dt>
            <dd>
              {isStrictAdmin && !isSelf ? (
                <select value={effectiveMember.role || 'viewer'} onChange={handleRoleChange} disabled={changingRole}>
                  <option value="viewer">Visualização</option>
                  <option value="admin">Tesoureiro</option>
                  <option value="diretor_financeiro">Diretor Financeiro</option>
                </select>
              ) : (
                roleLabels[effectiveMember.role] || effectiveMember.role || 'Visualização'
              )}
            </dd>
          </dl>
        </section>

        <section className="member-detail-section">
          <h4>Pagamentos</h4>
          {loadingSummary ? (
            <p className="member-detail-loading">Carregando...</p>
          ) : summary ? (
            <div className="member-payment-summary">
              <div className="member-stat-card">
                <span className="member-stat-value">{summary.payments.total}</span>
                <span className="member-stat-label">pagamentos registrados</span>
              </div>
              <div className="member-stat-card">
                <span className="member-stat-value">{formatAmount(summary.payments.totalAmount)}</span>
                <span className="member-stat-label">total acumulado</span>
              </div>
              {summary.payments.lastPayment && (
                <p className="member-detail-hint">
                  Último pagamento: {MONTH_NAMES[(summary.payments.lastPayment.month || 1) - 1]}/{summary.payments.lastPayment.year}
                </p>
              )}
              {summary.payments.total === 0 && (
                <p className="member-detail-hint">Nenhum pagamento registrado.</p>
              )}
            </div>
          ) : (
            <p className="member-detail-hint">Não foi possível carregar.</p>
          )}
        </section>

        <section className="member-detail-section">
          <h4>Projetos Ativos</h4>
          {loadingSummary ? (
            <p className="member-detail-loading">Carregando...</p>
          ) : summary ? (
            summary.activeProjects.length > 0 ? (
              <ul className="member-projects-list">
                {summary.activeProjects.map((p) => (
                  <li key={p.id} className="member-project-item">
                    <span className="member-project-dot" />
                    {p.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="member-detail-hint member-no-project">Sem projeto ativo no momento.</p>
            )
          ) : (
            <p className="member-detail-hint">Não foi possível carregar.</p>
          )}
        </section>
      </div>

      <div className="form-actions member-detail-actions">
    <div className="user-detail">
      <h3>Detalhes do membro</h3>
      <p>
        <strong>Nome:</strong> {member.name || '-'}
      </p>
      <p>
        <strong>Email:</strong> {member.email || '-'}
      </p>
      <p>
        <strong>Registro Escoteiro:</strong> {member.cpf || '-'}
      </p>
      <p>
        <strong>Apelido:</strong> {member.nickname || '-'}
      </p>
      <p>
        <strong>Permissão:</strong>{' '}
        {isStrictAdmin ? (
          <select value={member.role || 'viewer'} onChange={handleRoleChange} disabled={changingRole}>
            <option value="viewer">Visualização</option>
            <option value="admin">Tesoureiro</option>
            <option value="diretor_financeiro">Diretor Financeiro</option>
          </select>
        ) : (
          roleLabels[member.role] || member.role || 'Visualização'
        )}
      </p>
      <p>
        <strong>Status:</strong> {member.active ? 'Ativo' : 'Inativo'}
      </p>
      <p>
        <strong>Primeiro acesso:</strong>{' '}
        {member.must_reset_password ? 'Pendente' : 'Concluído'}
      </p>
      <p>
        <strong>Criado em:</strong> {member.joined_at || '-'}
      </p>
      <div className="form-actions">
        <button type="button" onClick={() => onInvite(member.id)}>
          Gerar link de acesso
        </button>
        <button type="button" className="ghost" onClick={() => onDelete(member.id)}>
          Remover membro
        </button>
      </div>
    </div>
  );
}
