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
