import { useState, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useMembers(showToast, handleError) {
  const { apiFetch, authUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', cpf: '', nickname: '' });
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedMemberDetail, _setSelectedMemberDetail] = useState(null);
  const [inviteLink, setInviteLink] = useState('');

  const selectedRef = useRef(null);
  const setSelectedMemberDetail = useCallback((value) => {
    selectedRef.current = value;
    _setSelectedMemberDetail(value);
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/members');
      const list = data.members || [];
      setMembers(list);
      if (selectedRef.current) {
        const updated = list.find((m) => m.id === selectedRef.current.id);
        selectedRef.current = updated || null;
        _setSelectedMemberDetail(updated || null);
      }
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError]);

  const resetMemberForm = useCallback(() => {
    setMemberForm({ name: '', email: '', cpf: '', nickname: '' });
    setEditingMemberId(null);
  }, []);

  const handleMemberSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: memberForm.name,
        email: memberForm.email,
        cpf: memberForm.cpf,
        nickname: memberForm.nickname
      };
      const isEditing = Boolean(editingMemberId);
      const endpoint = isEditing ? `/api/members/${editingMemberId}` : '/api/members';
      const method = isEditing ? 'PUT' : 'POST';
      const data = await apiFetch(endpoint, { method, body: payload });
      await loadMembers();
      resetMemberForm();
      if (!isEditing && data?.setupToken) {
        const link = `${window.location.origin}/?setup=${data.setupToken}`;
        setInviteLink(link);
        setSelectedMemberDetail(data.member || null);
      } else if (isEditing) {
        setInviteLink('');
        setSelectedMemberDetail(data.member || null);
      }
      showToast('Membro salvo com sucesso');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, editingMemberId, handleError, loadMembers, memberForm, resetMemberForm, setSelectedMemberDetail, showToast]);

  const handleMemberInvite = useCallback(async (id) => {
    try {
      const data = await apiFetch(`/api/members/${id}/invite`, { method: 'POST' });
      if (data?.setupToken) {
        const link = `${window.location.origin}/?setup=${data.setupToken}`;
        setInviteLink(link);
      }
      if (data?.member) {
        setSelectedMemberDetail(data.member);
      }
      showToast('Link de acesso gerado');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, setSelectedMemberDetail, showToast]);

  const handleMemberDelete = useCallback(async (id) => {
    if (!window.confirm('Remover este membro?')) return;
    try {
      await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
      if (selectedRef.current?.id === id) {
        setSelectedMemberDetail(null);
      }
      await loadMembers();
      showToast('Membro removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadMembers, setSelectedMemberDetail, showToast]);

  const handleRoleChange = useCallback(async (id, role) => {
    if (authUser?.memberId && String(id) === String(authUser.memberId)) {
      showToast('Você não pode alterar o próprio cargo', 'error');
      return;
    }
    try {
      const data = await apiFetch(`/api/members/${id}/role`, { method: 'PUT', body: { role } });
      if (data?.member) {
        setSelectedMemberDetail(data.member);
      }
      await loadMembers();
      showToast('Permissão atualizada');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadMembers, setSelectedMemberDetail, showToast]);

  const startEditMember = useCallback((member) => {
    setMemberForm({
      name: member.name,
      email: member.email || '',
      cpf: member.cpf || '',
      nickname: member.nickname || ''
    });
    setEditingMemberId(member.id);
    setInviteLink('');
  }, []);

  return {
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
  };
}
