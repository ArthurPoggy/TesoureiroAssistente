import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectsPanel } from '../components/projects/ProjectsPanel';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};
const asyncNoop = async () => {};

const mockProject = {
  id: 1,
  name: 'Acampamento de Verão',
  description: 'Projeto principal do ano',
  status: 'active',
  members: [{ member_id: 10, name: 'João' }]
};

const defaultProps = {
  projects: [mockProject],
  projectForm: { name: '', description: '', status: 'active' },
  setProjectForm: noop,
  editingProjectId: null,
  members: [],
  onSubmit: asyncNoop,
  onDelete: asyncNoop,
  onEdit: noop,
  onReset: noop,
  onAddMember: asyncNoop,
  onRemoveMember: asyncNoop,
  saving: false
};

describe('ProjectsPanel — abertura do modal de edição', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ canEdit: true });
  });

  it('não exibe o modal inicialmente', () => {
    render(<ProjectsPanel {...defaultProps} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o modal ao clicar em Editar e passa o projeto correto para onEdit', () => {
    const onEdit = vi.fn();
    render(<ProjectsPanel {...defaultProps} editingProjectId={1} onEdit={onEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(onEdit).toHaveBeenCalledWith(mockProject);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha o modal e chama onReset ao cancelar', () => {
    const onReset = vi.fn();
    render(<ProjectsPanel {...defaultProps} editingProjectId={1} onReset={onReset} />);

    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe o formulário de criação apenas quando não há edição em curso', () => {
    render(<ProjectsPanel {...defaultProps} editingProjectId={null} />);
    expect(screen.getByPlaceholderText('Nome do projeto')).toBeInTheDocument();
  });

  it('oculta o formulário de criação enquanto o modal de edição está aberto', () => {
    render(<ProjectsPanel {...defaultProps} editingProjectId={1} />);
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(screen.queryByRole('button', { name: /^salvar projeto$/i })).not.toBeInTheDocument();
  });
});
