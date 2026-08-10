import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExpensesPanel } from '../components/expenses/ExpensesPanel';

// Validação visual final (subtask "Validação visual final e documentação do
// PR"): garante que a Caixa de Despesas segue o mesmo padrão estrutural de
// cabeçalho e agrupamento usado pelos outros painéis de detalhe do sistema
// (ex.: ProjectsPanel) — section.panel > .panel-header com h2 + parágrafo de
// apoio — e que o bloco de anexo permanece agrupado visualmente separado do
// restante do formulário, em vez de labels soltos misturados aos demais
// campos. É um teste de invariante (hardening): deve nascer verde e
// funciona como guarda de regressão para as correções das subtasks 1-3.

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

const defaultProps = {
  expenses: [],
  expenseForm: {
    title: '',
    amount: '',
    expenseDate: '',
    category: '',
    eventId: '',
    notes: '',
    tagIds: [],
    attachmentName: '',
    attachmentFile: null
  },
  setExpenseForm: noop,
  editingExpenseId: null,
  fileInputKey: 0,
  events: [],
  tags: [],
  onSubmit: noop,
  onDelete: noop,
  onEdit: noop,
  onReset: noop
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectsPanelPath = path.resolve(
  __dirname,
  '..',
  'components',
  'projects',
  'ProjectsPanel.jsx'
);

describe('ExpensesPanel — paridade visual com os demais painéis de detalhe', () => {
  it('usa a mesma estrutura de cabeçalho (section.panel > .panel-header > h2 + p) que ProjectsPanel', () => {
    useAuth.mockReturnValue({ canEdit: true });
    const { container } = render(<ExpensesPanel {...defaultProps} />);

    const section = container.querySelector('section.panel');
    expect(section, 'a caixa de despesas deve usar a classe "panel" como os demais painéis').not.toBeNull();

    const header = section.querySelector(':scope > .panel-header');
    expect(header, 'deve existir um .panel-header direto dentro de section.panel').not.toBeNull();
    expect(header.querySelector('h2')).not.toBeNull();
    expect(header.querySelector('p')).not.toBeNull();

    // Confirma que o padrão observado no componente renderizado também
    // existe, textualmente, no painel de referência (ProjectsPanel), para
    // que uma futura mudança em apenas um dos dois seja pega pelo teste.
    const projectsSource = fs.readFileSync(projectsPanelPath, 'utf-8');
    expect(projectsSource).toMatch(/<section className="panel">\s*<div className="panel-header">\s*<h2>/);
  });

  it('mantém os campos de anexo agrupados em um bloco visualmente separado do restante do formulário', () => {
    useAuth.mockReturnValue({ canEdit: true });
    render(<ExpensesPanel {...defaultProps} />);

    const attachmentNameInput = screen.getByLabelText(/nome do anexo/i);
    const attachmentFileInput = screen.getByLabelText(/anexo \(arquivo\)/i);
    const observacoesInput = screen.getByLabelText(/observações/i);

    const attachmentsBlock = attachmentNameInput.closest('.attachments-block');
    expect(attachmentsBlock, 'os campos de anexo devem estar dentro de um .attachments-block').not.toBeNull();
    expect(attachmentsBlock.contains(attachmentFileInput)).toBe(true);

    // Campos que não são de anexo (ex.: Observações) não devem estar dentro
    // do mesmo bloco — o agrupamento é exclusivo dos campos de anexo.
    expect(attachmentsBlock.contains(observacoesInput)).toBe(false);
  });
});
