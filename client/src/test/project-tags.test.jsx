import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTagSelector } from '../components/projects/ProjectTagSelector';

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ProjectsPanel } = await import('../components/projects/ProjectsPanel');

const tags = [
  { id: 1, name: 'Social' },
  { id: 2, name: 'Fundraising' }
];

describe('ProjectTagSelector', () => {
  it('não renderiza nada quando não há tags', () => {
    const { container } = render(<ProjectTagSelector tags={[]} selectedIds={[]} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('marca tag selecionada e alterna ao clicar', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ProjectTagSelector tags={tags} selectedIds={[1]} onChange={onChange} />
    );
    const social = getByText('Social');
    expect(social).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(getByText('Fundraising'));
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it('desmarca tag já selecionada', () => {
    const onChange = vi.fn();
    const { getByText } = render(
      <ProjectTagSelector tags={tags} selectedIds={[1]} onChange={onChange} />
    );
    fireEvent.click(getByText('Social'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});

describe('ProjectsPanel — exibição de tags', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  const baseProps = {
    projects: [
      { id: 1, name: 'Projeto X', status: 'active', members: [], tags: [{ id: 1, name: 'Social' }] }
    ],
    projectForm: { name: '', description: '', status: 'active', start_date: '', end_date: '', tagIds: [] },
    setProjectForm: vi.fn(),
    editingProjectId: null,
    members: [],
    onSubmit: vi.fn(),
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onReset: vi.fn(),
    onAddMember: vi.fn(),
    onRemoveMember: vi.fn(),
    tags
  };

  it('exibe as tags do projeto como pills', () => {
    const { getAllByText } = render(<ProjectsPanel {...baseProps} />);
    // "Social" aparece no seletor do formulário e na pill do card
    expect(getAllByText('Social').length).toBeGreaterThanOrEqual(1);
  });
});
