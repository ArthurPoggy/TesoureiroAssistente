import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProjectsPanel } from '../components/projects/ProjectsPanel';

// ---------------------------------------------------------------------------
// Contrato esperado desta subtask (ainda não implementado no frontend —
// testes nascem "red"):
//
// - A cada card de projeto, uma timeline horizontal com um marcador por
//   marco (milestone), identificável via
//   `screen.getByRole('list', { name: /cronograma/i })`.
// - Cada marco aparece como item de lista com estado textual/acessível:
//   "concluído", "atual" (próximo marco pendente) ou "futuro".
// - Quando `project.atrasado` é true, um indicador de atraso é exibido
//   (`screen.getByText(/atrasado/i)`).
// - admin/diretor_financeiro (canEdit=true) veem formulário para adicionar
//   marco (campo de título + data + botão "Adicionar marco") e botão para
//   remover cada marco existente.
// - viewer (canEdit=false) vê a timeline em modo somente leitura: nenhum
//   controle de adicionar/remover marco.
// ---------------------------------------------------------------------------

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};
const asyncNoop = async () => {};

const baseProject = {
  id: 1,
  name: 'Reforma da sede',
  description: 'Projeto com cronograma',
  status: 'active',
  data_fim_planejada: '2099-01-01',
  atrasado: false,
  members: [],
  milestones: [
    { id: 101, titulo: 'Levantamento de custos', data_prevista: '2020-01-01', concluido: true },
    { id: 102, titulo: 'Aprovação do orçamento', data_prevista: '2099-06-01', concluido: false },
    { id: 103, titulo: 'Entrega final', data_prevista: '2099-12-01', concluido: false }
  ]
};

const defaultProps = {
  projects: [baseProject],
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
  onAddMilestone: asyncNoop,
  onRemoveMilestone: asyncNoop,
  saving: false
};

describe('Timeline de cronograma do projeto', () => {
  describe('admin/diretor_financeiro (canEdit=true)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ canEdit: true });
    });

    it('renderiza a timeline com um item de marco por marco cadastrado', () => {
      render(<ProjectsPanel {...defaultProps} />);

      const timeline = screen.getByRole('list', { name: /cronograma/i });
      const items = within(timeline).getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('identifica marco concluído, atual (próximo pendente) e futuro', () => {
      render(<ProjectsPanel {...defaultProps} />);

      const timeline = screen.getByRole('list', { name: /cronograma/i });
      const items = within(timeline).getAllByRole('listitem');

      expect(items[0]).toHaveTextContent(/conclu/i);
      expect(items[1]).toHaveTextContent(/atual/i);
      expect(items[2]).toHaveTextContent(/futuro/i);
    });

    it('exibe indicador de atraso quando o projeto está atrasado', () => {
      const lateProject = { ...baseProject, id: 2, atrasado: true };
      render(<ProjectsPanel {...defaultProps} projects={[lateProject]} />);

      expect(screen.getByText(/atrasado/i)).toBeInTheDocument();
    });

    it('não exibe indicador de atraso quando o projeto está no prazo', () => {
      render(<ProjectsPanel {...defaultProps} />);
      expect(screen.queryByText(/atrasado/i)).not.toBeInTheDocument();
    });

    it('permite adicionar um novo marco preenchendo título e data', async () => {
      const onAddMilestone = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onAddMilestone={onAddMilestone} />);

      fireEvent.click(screen.getByRole('button', { name: /adicionar marco/i }));
      fireEvent.change(screen.getByPlaceholderText(/título do marco/i), {
        target: { value: 'Vistoria final' }
      });
      fireEvent.change(screen.getByLabelText(/data prevista/i), {
        target: { value: '2099-08-15' }
      });
      fireEvent.click(screen.getByRole('button', { name: /salvar marco/i }));

      expect(onAddMilestone).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ titulo: 'Vistoria final', data_prevista: '2099-08-15' })
      );
    });

    it('permite remover um marco existente', () => {
      const onRemoveMilestone = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onRemoveMilestone={onRemoveMilestone} />);

      const timeline = screen.getByRole('list', { name: /cronograma/i });
      const items = within(timeline).getAllByRole('listitem');
      const removeButton = within(items[0]).getByRole('button', { name: /remover marco/i });
      fireEvent.click(removeButton);

      expect(onRemoveMilestone).toHaveBeenCalledWith(1, 101);
    });
  });

  describe('viewer (canEdit=false)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ canEdit: false });
    });

    it('renderiza a timeline somente leitura, sem controle de adicionar marco', () => {
      render(<ProjectsPanel {...defaultProps} />);

      const timeline = screen.getByRole('list', { name: /cronograma/i });
      expect(within(timeline).getAllByRole('listitem')).toHaveLength(3);
      expect(screen.queryByRole('button', { name: /adicionar marco/i })).not.toBeInTheDocument();
    });

    it('não exibe botão de remover marco em nenhum item da timeline', () => {
      render(<ProjectsPanel {...defaultProps} />);

      const timeline = screen.getByRole('list', { name: /cronograma/i });
      expect(within(timeline).queryByRole('button', { name: /remover marco/i })).not.toBeInTheDocument();
    });
  });
});
