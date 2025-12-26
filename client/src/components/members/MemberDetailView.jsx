export function MemberDetailView({ member, onInvite, onDelete }) {
  return (
    <div className="user-detail">
      <h3>Detalhes do membro</h3>
      <p>
        <strong>Nome:</strong> {member.name || '-'}
      </p>
      <p>
        <strong>Email:</strong> {member.email || '-'}
      </p>
      <p>
        <strong>Apelido:</strong> {member.nickname || '-'}
      </p>
      <p>
        <strong>Permissão:</strong> {member.role || 'viewer'}
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
        <button className="ghost" onClick={() => onDelete(member.id)}>
          Remover membro
        </button>
      </div>
    </div>
  );
}
