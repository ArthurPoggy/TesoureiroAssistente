import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { MemberAvatar } from './MemberAvatar';

const roleLabels = {
  admin: 'Tesoureiro',
  diretor_financeiro: 'Diretor Financeiro',
  viewer: 'Visualização'
};

export function MemberDetailView({ member, onInvite, onDelete, onRoleChange, onAvatarUpload, avatarUploading }) {
  const { authUser, isAdmin } = useAuth();
  const [changingRole, setChangingRole] = useState(false);
  const isStrictAdmin = authUser.role === 'admin';
  const canEditAvatar = isAdmin || authUser.memberId === member?.id;

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
      <div className="user-detail-header">
        <MemberAvatar
          member={member}
          size="lg"
          editable={canEditAvatar}
          onUpload={(file) => onAvatarUpload && onAvatarUpload(member.id, file)}
          uploading={avatarUploading}
        />
        <h3>Detalhes do membro</h3>
      </div>
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
