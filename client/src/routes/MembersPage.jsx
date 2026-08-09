import { lazy, Suspense } from 'react';
import { useToast } from '../hooks';
import { useSharedData } from '../contexts/SharedDataContext';
import { Toast } from '../components';

// Painel de membros carregado sob demanda (rota dedicada /membros).
const MembersPanel = lazy(() =>
  import('../components/members/MembersPanel').then((mod) => ({ default: mod.MembersPanel }))
);

// Rota /membros: cadastro, edição e detalhamento de membros, isolados em sua
// própria rota. Os dados de membros vêm de SharedDataContext (ver
// AppLayout), que já carrega a lista uma única vez ao entrar na área
// autenticada — esta página só lê o que já está carregado e usa as ações de
// CRUD (submit, convite, exclusão, troca de cargo) da mesma instância
// compartilhada do hook.
export function MembersPage() {
  const { toast, showToast } = useToast();

  const {
    members,
    memberForm,
    setMemberForm,
    editingMemberId,
    selectedMemberDetail,
    setSelectedMemberDetail,
    inviteLink,
    setInviteLink,
    resetMemberForm,
    handleMemberSubmit,
    handleMemberInvite,
    handleMemberDelete,
    handleRoleChange,
    startEditMember
  } = useSharedData();

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <MembersPanel
          members={members}
          memberForm={memberForm}
          setMemberForm={setMemberForm}
          editingMemberId={editingMemberId}
          selectedMemberDetail={selectedMemberDetail}
          setSelectedMemberDetail={setSelectedMemberDetail}
          inviteLink={inviteLink}
          setInviteLink={setInviteLink}
          onSubmit={handleMemberSubmit}
          onInvite={handleMemberInvite}
          onDelete={handleMemberDelete}
          onEdit={startEditMember}
          onReset={resetMemberForm}
          onRoleChange={handleRoleChange}
          showToast={showToast}
        />
      </Suspense>
    </div>
  );
}
