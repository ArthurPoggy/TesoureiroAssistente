import { useAuth } from '../../contexts/AuthContext';
import { MemberDetailView } from './MemberDetailView';

export function MembersPanel({
  members,
  memberForm,
  setMemberForm,
  editingMemberId,
  selectedMemberDetail,
  setSelectedMemberDetail,
  inviteLink,
  setInviteLink,
  onSubmit,
  onInvite,
  onDelete,
  onEdit,
  onReset,
  showToast
}) {
  const { canEdit, isAdmin } = useAuth();

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Membros</h2>
        <p>Todo membro possui acesso de visualização. Gere o link de primeiro acesso ao criar.</p>
      </div>

      {canEdit ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            placeholder="Nome"
            value={memberForm.name}
            onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email (login)"
            value={memberForm.email}
            onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
            required
          />
          <input
            placeholder="Apelido"
            value={memberForm.nickname}
            onChange={(e) => setMemberForm({ ...memberForm, nickname: e.target.value })}
          />
          <div className="form-actions">
            <button type="submit">{editingMemberId ? 'Atualizar' : 'Adicionar membro'}</button>
            {editingMemberId && (
              <button type="button" className="ghost" onClick={onReset}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <p className="lock-hint">Faça login como tesoureiro para cadastrar ou editar membros.</p>
      )}

      {inviteLink && (
        <div className="invite-link">
          <p>Link de primeiro acesso:</p>
          <div className="invite-row">
            <input readOnly value={inviteLink} />
            <button
              type="button"
              className="ghost"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                showToast('Link copiado');
              }}
            >
              Copiar
            </button>
          </div>
          <small>Compartilhe este link para o membro criar a senha.</small>
        </div>
      )}

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Apelido</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className={selectedMemberDetail?.id === member.id ? 'selected' : ''}
                onClick={() => {
                  if (isAdmin) {
                    setSelectedMemberDetail(member);
                  }
                }}
              >
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td>{member.nickname}</td>
                {canEdit && (
                  <td>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(member);
                        setInviteLink('');
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(member.id);
                      }}
                    >
                      Remover
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdmin && selectedMemberDetail && (
        <MemberDetailView
          member={selectedMemberDetail}
          onInvite={onInvite}
          onDelete={onDelete}
        />
      )}
    </section>
  );
}
