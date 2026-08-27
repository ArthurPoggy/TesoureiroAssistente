import { useState } from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

const { ExpensesPanel } = await import('../components/expenses/ExpensesPanel');

const tags = [
  { id: 1, name: 'Acampamento' },
  { id: 2, name: 'Material' }
];

const baseProps = {
  expenseForm: {
    title: '', amount: '', expenseDate: '', category: '', eventId: '',
    notes: '', tagIds: [], attachmentName: '', attachmentFile: null
  },
  setExpenseForm: vi.fn(),
  editingExpenseId: null,
  fileInputKey: 'key',
  events: [],
  tags,
  expenses: [],
  onSubmit: vi.fn(),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onReset: vi.fn()
};

describe('ExpensesPanel — criação inline de tag', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ canEdit: true });
  });

  it('exibe o campo de nova tag apenas para quem pode editar', () => {
    const { getByPlaceholderText } = render(
      <ExpensesPanel {...baseProps} onCreateTag={vi.fn()} />
    );
    expect(getByPlaceholderText('Nova tag')).toBeInTheDocument();
    cleanup();

    mockUseAuth.mockReturnValue({ canEdit: false });
    const { queryByPlaceholderText } = render(
      <ExpensesPanel {...baseProps} onCreateTag={vi.fn()} />
    );
    expect(queryByPlaceholderText('Nova tag')).not.toBeInTheDocument();
  });

  it('digitar um nome e submeter chama onCreateTag com o nome informado', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('Transporte'));
  });

  it('nome vazio ou apenas espaços não dispara onCreateTag', () => {
    const onCreateTag = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: '   ' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    expect(onCreateTag).not.toHaveBeenCalled();
  });

  it('a tag criada é adicionada à seleção via onChange/setExpenseForm', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const setExpenseForm = vi.fn();
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} setExpenseForm={setExpenseForm} />
    );

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => {
      expect(setExpenseForm).toHaveBeenCalledWith(
        expect.objectContaining({ tagIds: expect.arrayContaining([3]) })
      );
    });
  });

  it('limpa o campo de texto após a criação bem-sucedida', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    const input = getByPlaceholderText('Nova tag');
    fireEvent.change(input, { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => expect(input.value).toBe(''));
  });

  it('desabilita o botão e o input durante a submissão, evitando duplo clique', async () => {
    let resolveCreate;
    const onCreateTag = vi.fn(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    const input = getByPlaceholderText('Nova tag');
    const button = getByRole('button', { name: 'Nova tag' });

    fireEvent.change(input, { target: { value: 'Transporte' } });
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(input).toBeDisabled();

    fireEvent.click(button);
    expect(onCreateTag).toHaveBeenCalledTimes(1);

    resolveCreate({ id: 3, name: 'Transporte' });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('pressionar Enter no campo "Nova tag" cria a tag e intercepta o Enter (preventDefault)', async () => {
    // O input de "Nova tag" fica dentro do <form> de despesa, cujo único
    // botão type="submit" é "Salvar despesa"/"Atualizar". Sem um handler de
    // Enter dedicado, a tecla é capturada pelo submit nativo do formulário
    // (que descarta o texto digitado) em vez de acionar a criação da tag.
    //
    // jsdom não implementa o submit implícito de formulário ao pressionar
    // Enter (https://github.com/jsdom/jsdom/issues/1937), então observar
    // `onSubmit` não seria uma prova válida do bug: essa asserção passaria
    // mesmo sem nenhum handler de Enter no campo de tag. A prova conclusiva
    // é o retorno de `fireEvent`, que reflete diretamente se o evento de
    // teclado (cancelable) teve `preventDefault()` chamado por algum
    // handler React anexado ao input — independente do jsdom acionar ou
    // não o submit nativo. Sem handler de Enter dedicado, dispatchEvent
    // retorna `true` (nada chamou preventDefault); com o fix, retorna
    // `false`.
    const onCreateTag = vi.fn().mockResolvedValue({ id: 3, name: 'Transporte' });
    const { getByPlaceholderText } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    const input = getByPlaceholderText('Nova tag');
    fireEvent.change(input, { target: { value: 'Transporte' } });
    const eventDefaultNotPrevented = fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('Transporte'));
    expect(eventDefaultNotPrevented).toBe(false);
  });

  it.each([[null], [undefined]])('mantém o texto digitado quando a criação da tag falha (retorno %s)', async (retornoDeFalha) => {
    // useTags.createTag passa por runRequest, que nunca propaga exceção: em
    // caso de erro (rede, 500, etc.) ele chama handleError e resolve sem tag
    // — `null` pelo contrato do hook, `undefined` se algum chamador repassar
    // o retorno cru de runRequest. NewTagField.handleCreate não deve limpar o
    // campo em nenhum dos dois: o usuário precisa poder tentar de novo sem
    // redigitar o nome.
    const onCreateTag = vi.fn().mockResolvedValue(retornoDeFalha);
    const { getByPlaceholderText, getByRole } = render(
      <ExpensesPanel {...baseProps} onCreateTag={onCreateTag} />
    );

    const input = getByPlaceholderText('Nova tag');
    fireEvent.change(input, { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('Transporte'));
    expect(input.value).toBe('Transporte');
  });

  it('fluxo ponta a ponta: tag nova aparece na lista de tags selecionáveis já marcada como selecionada', async () => {
    // Simula o comportamento real de ExpensesPage/useTags: onCreateTag
    // devolve a tag criada, o componente pai adiciona à lista de `tags` e
    // TagSelector re-renderiza com a tag nova disponível como chip.
    function StatefulWrapper() {
      const [tagList, setTagList] = useState(tags);
      const [expenseForm, setExpenseForm] = useState(baseProps.expenseForm);

      const onCreateTag = async (name) => {
        const createdTag = { id: 99, name };
        setTagList((prev) => [...prev, createdTag]);
        return createdTag;
      };

      return (
        <ExpensesPanel
          {...baseProps}
          tags={tagList}
          expenseForm={expenseForm}
          setExpenseForm={setExpenseForm}
          onCreateTag={onCreateTag}
        />
      );
    }

    const { getByPlaceholderText, getByRole, getByText } = render(<StatefulWrapper />);

    fireEvent.change(getByPlaceholderText('Nova tag'), { target: { value: 'Transporte' } });
    fireEvent.click(getByRole('button', { name: 'Nova tag' }));

    await waitFor(() => {
      const chip = getByText('Transporte');
      expect(chip).toBeInTheDocument();
      expect(chip.className).toContain('tag-chip--selected');
    });
  });
});
