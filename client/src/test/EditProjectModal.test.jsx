import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditProjectModal } from '../components/projects/EditProjectModal';

const noop = () => {};
const asyncNoop = async () => {};

const defaultForm = { name: 'Acampamento de Verão', description: 'Projeto principal do ano', status: 'active' };

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

    fireEvent.click(container.querySelector('.modal-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('chama onSave ao submeter o formulário', () => {
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

  it('renderiza os campos de cronograma previsto (data_inicio / data_fim_planejada)', () => {
    const formWithSchedule = {
      ...defaultForm,
      data_inicio: '2026-01-10',
      data_fim_planejada: '2026-02-20'
    };
    render(
      <EditProjectModal
        projectForm={formWithSchedule}
        setProjectForm={noop}
        onSave={asyncNoop}
        onClose={noop}
        saving={false}
      />
    );

    expect(screen.getByDisplayValue('2026-01-10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-02-20')).toBeInTheDocument();
  });

  it('chama setProjectForm ao alterar a data prevista de término', () => {
    const setProjectForm = vi.fn();
    render(
      <EditProjectModal
        projectForm={defaultForm}
        setProjectForm={setProjectForm}
        onSave={asyncNoop}
        onClose={noop}
        saving={false}
      />
    );

    fireEvent.change(screen.getByLabelText(/data prevista de término/i), {
      target: { value: '2026-03-15' }
    });

    expect(setProjectForm).toHaveBeenCalledWith({ ...defaultForm, data_fim_planejada: '2026-03-15' });
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
