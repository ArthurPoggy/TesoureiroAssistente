import { lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMembers, useToast } from '../hooks';
import { Toast } from '../components';

// Painel de membros carregado sob demanda (rota dedicada /membros).
const MembersPanel = lazy(() =>
  import('../components/members/MembersPanel').then((mod) => ({ default: mod.MembersPanel }))
);

// Rota /membros: cadastro, edição e detalhamento de membros, isolados em sua
// própria rota. O hook useMembers segue funcionando como antes.
export function MembersPage() {
  const { authToken, authChecked } = useAuth();
  const { toast, showToast, handleError } = useToast();

  const {
    members,
    memberForm,
    setMemberForm,
    editingMemberId,
    selectedMemberDetail,
    setSelectedMemberDetail,
    inviteLink,
    setInviteLink,
    loadMembers,
    resetMemberForm,
    handleMemberSubmit,
    handleMemberInvite,
    handleMemberDelete,
    handleRoleChange,
    startEditMember
  } = useMembers(showToast, handleError);

  useEffect(() => {
    if (!authToken || !authChecked) return;
    loadMembers();
  }, [authToken, authChecked, loadMembers]);

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
