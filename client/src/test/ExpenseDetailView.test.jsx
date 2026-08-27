import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ExpenseDetailView } from '../components/expenses/ExpenseDetailView';

const fullExpense = {
  id: 1,
  title: 'Compra de material',
  amount: 150.5,
  expense_date: '2024-02-10',
  category: 'Material',
  event_name: 'Acampamento de Inverno',
  notes: 'Comprado na papelaria do bairro.',
  tags: [{ id: 1, name: 'Urgente' }, { id: 2, name: 'Reembolsável' }],
  attachment_name: 'nota-fiscal.pdf',
  attachment_url: 'https://files.example.com/nota-fiscal.pdf'
};

describe('ExpenseDetailView', () => {
  it('renderiza todos os campos de uma despesa completa', () => {
    const { getByText } = render(<ExpenseDetailView expense={fullExpense} />);

    expect(getByText('Compra de material')).toBeInTheDocument();
    expect(getByText('R$ 150,50')).toBeInTheDocument();
    expect(getByText('10/02/2024')).toBeInTheDocument();
    expect(getByText('Material')).toBeInTheDocument();
    expect(getByText('Acampamento de Inverno')).toBeInTheDocument();
    expect(getByText('Comprado na papelaria do bairro.')).toBeInTheDocument();
    expect(getByText('Urgente')).toBeInTheDocument();
    expect(getByText('Reembolsável')).toBeInTheDocument();
    expect(getByText(/nota-fiscal\.pdf/)).toBeInTheDocument();
  });

  it('mostra estado vazio para evento, observações e anexo ausentes', () => {
    const minimalExpense = {
      id: 2,
      title: 'Lanche da reunião',
      amount: 80,
      expense_date: '2024-03-05',
      category: 'Alimentação',
      event_name: null,
      notes: '',
      tags: [],
      attachment_name: null,
      attachment_url: null
    };

    const { getByText, queryByText } = render(<ExpenseDetailView expense={minimalExpense} />);

    expect(getByText('Nenhum')).toBeInTheDocument();
    expect(queryByText('nota-fiscal.pdf')).not.toBeInTheDocument();
    expect(queryByText('Baixar', { exact: false })).not.toBeInTheDocument();
  });

  it('usa o formatador de data compartilhado, sem quebrar com valor inesperado', () => {
    const { getByText } = render(
      <ExpenseDetailView expense={{ ...fullExpense, expense_date: 'data-invalida' }} />
    );

    // Antes, a formatação local partia a string em '-' sem validar e exibia
    // "undefined/invalida/data"; o util compartilhado devolve '-'.
    expect(getByText('-')).toBeInTheDocument();
  });

  it('não renderiza nada quando a despesa é null', () => {
    const { container } = render(<ExpenseDetailView expense={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
