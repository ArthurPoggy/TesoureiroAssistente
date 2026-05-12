import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditProjectModal } from '../components/projects/EditProjectModal';
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

const defaultForm = { name: 'Acampamento de Verão', description: 'Projeto principal do ano', status: 'active' };

// ─── EditProjectModal ──────────────────────────────────────────────────────────

describe('EditProjectModal', () => {
  it('renderiza com os dados do projeto pré-carregados', () => {
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={noop}
        saving={false}
      />
    );

    expect(screen.getByDisplayValue('Acampamento de Verão')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Projeto principal do ano')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('active');
  });

  it('exibe o título "Editar projeto"', () => {
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={noop}
        saving={false}
      />
    );

    expect(screen.getByRole('heading', { name: /editar projeto/i })).toBeInTheDocument();
  });

  it('chama onClose ao clicar no botão Cancelar', () => {
    const onClose = vi.fn();
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={onClose}
        saving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onClose ao clicar no botão ×', () => {
    const onClose = vi.fn();
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={onClose}
        saving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /fechar modal/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onClose ao pressionar Esc', () => {
    const onClose = vi.fn();
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={onClose}
        saving={false}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onClose ao clicar no overlay (fora do modal)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={onClose}
        saving={false}
      />
    );

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onSave ao submeter o formulário', async () => {
    const onSave = vi.fn((e) => e.preventDefault());
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={onSave}
        onClose={noop}
        saving={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('desabilita os botões e mostra "Salvando..." durante saving=true', () => {
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={noop}
        saving={true}
      />
    );

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();
  });

  it('não fecha ao clicar dentro do modal (apenas no overlay)', () => {
    const onClose = vi.fn();
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={onClose}
        saving={false}
      />
    );

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── ProjectsPanel — integração com o modal ───────────────────────────────────

describe('ProjectsPanel — abertura do modal de edição', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ canEdit: true });
  });

  const defaultPanelProps = {
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

  it('não exibe o modal inicialmente', () => {
    render(<ProjectsPanel {...defaultPanelProps} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre o modal ao clicar em Editar e passa o projeto correto para onEdit', () => {
    const onEdit = vi.fn();
    render(
      <ProjectsPanel
        {...defaultPanelProps}
        editingProjectId={1}
        onEdit={onEdit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(onEdit).toHaveBeenCalledWith(mockProject);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha o modal e chama onReset ao cancelar', () => {
    const onReset = vi.fn();
    render(
      <ProjectsPanel
        {...defaultPanelProps}
        editingProjectId={1}
        onReset={onReset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exibe o formulário de criação apenas quando não há edição em curso', () => {
    render(<ProjectsPanel {...defaultPanelProps} editingProjectId={null} />);
    expect(screen.getByPlaceholderText('Nome do projeto')).toBeInTheDocument();
  });

  it('oculta o formulário de criação enquanto o modal de edição está aberto', () => {
    render(<ProjectsPanel {...defaultPanelProps} editingProjectId={1} />);
    fireEvent.click(screen.getByRole('button', { name: /^editar$/i }));
    // O botão "Salvar projeto" é exclusivo do form de criação (o modal usa "Salvar alterações")
    expect(screen.queryByRole('button', { name: /^salvar projeto$/i })).not.toBeInTheDocument();
  });
});
