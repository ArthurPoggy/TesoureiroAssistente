import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MembersPanel } from '../components/members/MembersPanel';
import { MemberDetailView } from '../components/members/MemberDetailView';
import { LoginScreen } from '../components/auth/LoginScreen';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const mockMember = {
  id: 1,
  name: 'João Silva',
  email: 'joao@email.com',
  cpf: '12345',
  nickname: 'João',
  role: 'viewer',
  active: true,
  must_reset_password: false,
  joined_at: '2024-01-01'
};

const noop = () => {};

describe('Rótulo "Registro Escoteiro"', () => {
  describe('MembersPanel', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ canEdit: true, isAdmin: true });
    });

    it('exibe "Registro Escoteiro" como placeholder no formulário de cadastro', () => {
      render(
        <MembersPanel
          members={[]}
          memberForm={{ name: '', email: '', cpf: '', nickname: '' }}
          setMemberForm={noop}
          editingMemberId={null}
          selectedMemberDetail={null}
          setSelectedMemberDetail={noop}
          inviteLink=""
          setInviteLink={noop}
          onSubmit={noop}
          onInvite={noop}
          onDelete={noop}
          onEdit={noop}
          onReset={noop}
          onRoleChange={noop}
          showToast={noop}
        />
      );

      expect(screen.getByPlaceholderText('Registro Escoteiro')).toBeInTheDocument();
    });

    it('exibe "Registro Escoteiro" como cabeçalho da coluna na tabela', () => {
      render(
        <MembersPanel
          members={[mockMember]}
          memberForm={{ name: '', email: '', cpf: '', nickname: '' }}
          setMemberForm={noop}
          editingMemberId={null}
          selectedMemberDetail={null}
          setSelectedMemberDetail={noop}
          inviteLink=""
          setInviteLink={noop}
          onSubmit={noop}
          onInvite={noop}
          onDelete={noop}
          onEdit={noop}
          onReset={noop}
          onRoleChange={noop}
          showToast={noop}
        />
      );

      expect(screen.getByRole('columnheader', { name: 'Registro Escoteiro' })).toBeInTheDocument();
    });

    it('não exibe "CPF" como texto visível ao usuário', () => {
      render(
        <MembersPanel
          members={[mockMember]}
          memberForm={{ name: '', email: '', cpf: '', nickname: '' }}
          setMemberForm={noop}
          editingMemberId={null}
          selectedMemberDetail={null}
          setSelectedMemberDetail={noop}
          inviteLink=""
          setInviteLink={noop}
          onSubmit={noop}
          onInvite={noop}
          onDelete={noop}
          onEdit={noop}
          onReset={noop}
          onRoleChange={noop}
          showToast={noop}
        />
      );

      expect(screen.queryByText('CPF')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('CPF')).not.toBeInTheDocument();
    });
  });

  describe('MemberDetailView', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ authUser: { role: 'admin' } });
    });

    it('exibe "Registro Escoteiro:" no painel de detalhes do membro', () => {
      render(
        <MemberDetailView
          member={mockMember}
          onInvite={noop}
          onDelete={noop}
          onRoleChange={noop}
        />
      );

      expect(screen.getByText('Registro Escoteiro:')).toBeInTheDocument();
    });

    it('não exibe "CPF" como rótulo no painel de detalhes', () => {
      render(
        <MemberDetailView
          member={mockMember}
          onInvite={noop}
          onDelete={noop}
          onRoleChange={noop}
        />
      );

      expect(screen.queryByText('CPF:')).not.toBeInTheDocument();
    });
  });

  describe('LoginScreen', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        login: vi.fn(),
        register: vi.fn(),
        setupPassword: vi.fn(),
        authLoading: false
      });
    });

    it('exibe "Registro Escoteiro" como placeholder no formulário de registro', async () => {
      render(<LoginScreen />);

      const registerTab = screen.getByRole('button', { name: /criar conta de membro/i });
      registerTab.click();

      expect(await screen.findByPlaceholderText('Registro Escoteiro')).toBeInTheDocument();
    });

    it('não exibe "CPF" como placeholder no formulário de registro', async () => {
      render(<LoginScreen />);

      const registerTab = screen.getByRole('button', { name: /criar conta de membro/i });
      registerTab.click();

      expect(screen.queryByPlaceholderText('CPF')).not.toBeInTheDocument();
    });
  });
});
