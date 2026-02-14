import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const roleLabels = {
  admin: 'Tesoureiro',
  diretor_financeiro: 'Diretor Financeiro',
  viewer: 'Visualização'
};

export function MemberDetailView({ member, onInvite, onDelete, onRoleChange }) {
  const { authUser } = useAuth();
  const [changingRole, setChangingRole] = useState(false);
  const isStrictAdmin = authUser.role === 'admin';

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
        <strong>Registro:</strong> {member.cpf || '-'}
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
        <button className="ghost" onClick={() => onDelete(member.id)}>
          Remover membro
        </button>
      </div>
    </div>
  );
}
