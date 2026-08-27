import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cobre a subtask "Consistência de alinhamento e quebra de texto (Título,
// Categoria, Tags, Ações)":
//
// (a) a célula de Ações com os botões "Editar"/"Remover" precisa quebrar de
//     forma controlada (flex-wrap) em vez de depender do wrap "cru" de
//     <button> inline-block, que pode estourar a largura da coluna fixa
//     (.col-actions) definida pela subtask anterior.
// (b) uma tag isolada muito longa dentro de .tag-pills não pode estourar a
//     largura da coluna Tags — o pill precisa poder quebrar/encolher dentro
//     do limite da célula, e não só depender de flex-wrap no container (que
//     não ajuda quando é um único pill maior que a coluna).

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesDir = path.resolve(__dirname, '..', 'styles');

function readCss(file) {
  // Comentários são removidos para que o texto antes de cada `{` seja só o
  // seletor da regra — um comentário logo acima da regra entraria no
  // seletor e o extrator abaixo não o reconheceria.
  return fs.readFileSync(path.join(stylesDir, file), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

// Extrai o corpo de todas as regras cujo seletor bate exatamente (ignorando
// espaços) com `selector`.
function extractRuleBodiesForSelector(css, selector) {
  const normalizedTarget = selector.replace(/\s+/g, ' ').trim();
  const bodies = [];
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const normalizedSelector = match[1].replace(/\s+/g, ' ').trim();
    if (normalizedSelector === normalizedTarget) {
      bodies.push(match[2]);
    }
  }
  return bodies;
}

function combinedBodyFor(css, selector) {
  return extractRuleBodiesForSelector(css, selector).join('\n');
}

const baseProps = {
  expenseForm: {
    title: '', amount: '', expenseDate: '', category: '', eventId: '',
    notes: '', tagIds: [], attachmentName: '', attachmentFile: null
  },
  setExpenseForm: vi.fn(),
  editingExpenseId: null,
  fileInputKey: 'key',
  events: [],
  tags: [],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

const expenses = [
  {
    id: 1,
    expense_date: '2026-08-09',
    title: 'Compra de material',
    amount: 150,
    category: 'Material',
    notes: '',
    tags: [{ id: 1, name: 'Manutenção de equipamentos eletrônicos do acampamento' }]
  }
];

describe('ExpensesPanel — quebra controlada de Ações e Tags', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('a célula de Ações usa a classe col-actions (mesma classe do colgroup) para permitir tratamento de flex-wrap via CSS', () => {
    const { container } = render(
      <ExpensesPanel {...baseProps} expenses={expenses} />
    );

    const actionsCell = container.querySelector('table.expenses-table tbody td.col-actions');
    expect(
      actionsCell,
      'a <td> de Ações deveria ter className="col-actions" para que a regra CSS de flex-wrap alcance os botões, não só a largura do <col>'
    ).not.toBeNull();
  });

  it('tables.css: .expenses-table td.col-actions organiza os botões em flex-wrap com espaçamento, evitando quebra "crua"', () => {
    const css = readCss('tables.css');
    const body = combinedBodyFor(css, '.expenses-table td.col-actions');

    expect(body, '.expenses-table td.col-actions não encontrada em tables.css').not.toBe('');
    expect(body).toMatch(/display\s*:\s*flex/);
    expect(body).toMatch(/flex-wrap\s*:\s*wrap/);
    expect(body).toMatch(/gap\s*:/);
  });

  it('tables.css: a largura da coluna de ações alcança o <col> e não recebe display', () => {
    const css = readCss('tables.css');
    const colBody = combinedBodyFor(css, '.expenses-table col.col-actions');

    expect(colBody, '.expenses-table col.col-actions não encontrada em tables.css').not.toBe('');
    expect(colBody).toMatch(/width\s*:\s*\d+%/);
    // Um <col> com `display` diferente de table-column deixa de definir a
    // coluna, e a largura fixa acima passa a não valer: a regra de flex
    // precisa mirar o <td>, nunca um seletor que alcance os dois.
    expect(colBody).not.toMatch(/display\s*:/);
  });

  it('tables.css: .expenses-table .tag-pill pode quebrar/encolher dentro da coluna Tags (uma única tag longa não deve estourar a largura fixa da coluna)', () => {
    const css = readCss('tables.css');
    const body = combinedBodyFor(css, '.expenses-table .tag-pill');

    expect(
      body,
      '.expenses-table .tag-pill não encontrada em tables.css — sem essa regra, .tag-pill herda white-space: nowrap de tags.css e uma tag longa estoura a coluna'
    ).not.toBe('');
    expect(body).toMatch(/white-space\s*:\s*normal/);
    expect(body).toMatch(/overflow-wrap\s*:\s*(break-word|anywhere)/);
    expect(body).toMatch(/max-width\s*:\s*100%/);
  });
});
