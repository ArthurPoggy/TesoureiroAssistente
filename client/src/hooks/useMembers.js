import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useMembers(showToast, handleError) {
  const { apiFetch } = useAuth();
  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', email: '', nickname: '' });
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [inviteLink, setInviteLink] = useState('');

  const loadMembers = useCallback(async () => {
    try {
      const data = await apiFetch('/api/members');
      const list = data.members || [];
      setMembers(list);
      if (selectedMemberDetail) {
        const updated = list.find((member) => member.id === selectedMemberDetail.id);
        setSelectedMemberDetail(updated || null);
      }
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, selectedMemberDetail]);

  const resetMemberForm = useCallback(() => {
    setMemberForm({ name: '', email: '', nickname: '' });
    setEditingMemberId(null);
  }, []);

  const handleMemberSubmit = useCallback(async (event) => {
    event.preventDefault();
    try {
      const payload = {
        name: memberForm.name,
        email: memberForm.email,
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
  }, [apiFetch, editingMemberId, handleError, loadMembers, memberForm, resetMemberForm, showToast]);

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
  }, [apiFetch, handleError, showToast]);

  const handleMemberDelete = useCallback(async (id) => {
    if (!window.confirm('Remover este membro?')) return;
    try {
      await apiFetch(`/api/members/${id}`, { method: 'DELETE' });
      if (selectedMemberDetail?.id === id) {
        setSelectedMemberDetail(null);
      }
      await loadMembers();
      showToast('Membro removido');
    } catch (error) {
      handleError(error);
    }
  }, [apiFetch, handleError, loadMembers, selectedMemberDetail, showToast]);

  const startEditMember = useCallback((member) => {
    setMemberForm({
      name: member.name,
      email: member.email || '',
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
    startEditMember
  };
}
