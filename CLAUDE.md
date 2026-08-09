# CLAUDE.md

Convenções de clean code adotadas incrementalmente no backend e no frontend do
TesoureiroAssistente. Este documento registra os padrões já aplicados nas
rotas do `server/` e nos hooks/componentes do `client/` para que novas
alterações sigam a mesma linha, em vez de reintroduzir os padrões antigos que
foram removidos (try/catch repetido, respostas de erro inconsistentes, etc.).

## Padrão de resposta de sucesso/falha (backend)

Todas as rotas usam os helpers de `server/utils/response.js` em vez de montar
`res.json(...)` manualmente:

- `success(res, payload)` — responde `{ ok: true, ...payload }`.
- `fail(res, message, status = 400)` — responde `{ ok: false, message }`.
- `asyncHandler(handler)` — envolve o handler assíncrono da rota e encaminha
  qualquer erro lançado para `fail`, evitando `try/catch` repetido em cada
  rota e evitando vazar stack trace para o cliente.

Validações de campo usam `server/utils/validation.js`:

- `requireFields(fields, message)` — retorna `message` se algum campo do mapa
  `{ nome: valor }` for falsy, ou `null` se todos estiverem preenchidos.
- `validateNonNegativeAmount(amount, message)` — retorna `message` quando o
  valor não é numérico ou é negativo (usado em `payments` e `expenses`, onde
  valores monetários negativos ou não numéricos não fazem sentido de
  negócio).

Toda rota nova que recebe entrada do cliente deve validar com esses helpers
antes de tocar o banco, e retornar erros via `fail(res, mensagem)` — nunca
lançar exceções cruas nem montar objetos de erro ad-hoc.

## Padrão de fetch/erro nos hooks (frontend)

Os hooks de dados (`usePayments`, `useExpenses`, `useMembers`, ...) usam o
util compartilhado `client/src/utils/hookRequests.js`:

```js
export async function runRequest(handleError, asyncFn) {
  try {
    return await asyncFn();
  } catch (error) {
    handleError(error);
    return undefined;
  }
}
```

Isso substitui o padrão repetido `try { await apiFetch(...) } catch (error) {
handleError(error); }` que existia em cada função dos hooks. Toda nova
chamada de API dentro de um hook deve passar por `runRequest`, mantendo o
tratamento de erro centralizado e a interface pública do hook (o que ele
expõe para os componentes) inalterada.

## Critério de extração para `utils/`

Uma função/trecho de lógica deve ser extraído para `server/utils/` ou
`client/src/utils/` quando pelo menos um destes critérios se aplica:

1. **Duplicação real** — a mesma lógica (não só a mesma "forma") aparece em
   2 ou mais rotas/hooks/componentes.
2. **Regra de negócio isolável** — a lógica não depende de `req`/`res`
   diretamente (backend) nem de estado de componente (frontend), podendo
   ser testada isoladamente sem montar toda a rota/tela.
3. **Convenção que deve ser reforçada** — ex.: formato de resposta
   (success/fail), validação de campos obrigatórios, tratamento de erro de
   fetch. Centralizar evita que uma rota/hook novo reintroduza o padrão
   antigo por engano.

Lógica específica de uma única rota/componente, sem reuso nem regra de
negócio isolável, permanece no arquivo onde é usada — extração prematura
adiciona indireção sem benefício.

## Limite de tamanho de função

Funções (handlers de rota, funções de componente, helpers) devem ter no
máximo **50 linhas**. Ao ultrapassar esse limite:

- Extraia blocos de validação para `utils/` (ver critério acima).
- Extraia sub-renderizações de componentes React grandes em componentes
  menores no mesmo arquivo (ex.: `TagSelector`/`TagPills` dentro de
  `ExpensesPanel.jsx`) quando o JSX não é reutilizado em outro lugar, ou em
  um arquivo próprio quando passa a ser.
- Prefira nomear a função extraída pelo que ela faz (`validatePaymentForm`,
  `handleSubmit`) em vez de deixar lógica anônima inline em props como
  `onSubmit={(e) => { ... }}`.

## Dados pessoais sensíveis (LGPD)

Identificadores sensíveis (CPF/Registro Escoteiro) nunca são exibidos em
texto puro na UI, mesmo quando o rótulo visível foi trocado para "Registro
Escoteiro" (ver `docs/lgpd.md`, item 5). Use `maskCpf` de
`client/src/utils/formatters.js` em todo componente que renderiza o valor
(`MembersPanel`, `MemberDetailView`, ...) — não remova a máscara para
"alinhar" um componente a outro que porventura esteja exibindo o valor sem
proteção; o correto é aplicar a máscara nos dois lugares.

## Outras convenções de código morto/legibilidade

- Sem `console.log`/`debugger` em código de produção — usar apenas em testes
  quando necessário, e remover antes de commitar.
- Sem indentação inconsistente/copiada de outro editor: todo bloco novo deve
  respeitar a indentação de 2 espaços do restante do arquivo.
- Nomes de variáveis e funções descrevem o que contêm/fazem
  (`validatePaymentForm`, não `check` ou `fn`); evitar abreviações que não
  sejam óbvias no domínio do projeto (ex.: `cpf`, `pix` são aceitáveis por
  serem termos de domínio já usados em toda a base).
