# Contribuindo com o TesoureiroAssistente

Obrigado por contribuir! Este documento descreve o fluxo de trabalho do projeto: como criar branches, escrever commits, abrir Pull Requests e validar o que está pronto.

## Fluxo de trabalho

1. **Pegue um card no [Trello](https://trello.com/b/Xl9Rz8uc/tesoureiro-assistente)** antes de começar. Mova para *Em desenvolvimento*.
2. **Crie uma branch** a partir de `desenvolvimento` seguindo o padrão `feature/<descrição-kebab-case>` ou `fix/<descrição-kebab-case>`.
3. **Implemente** seguindo as convenções do projeto (ver abaixo).
4. **Commit** seguindo o [Guia de commits](docs/commit-guide.md).
5. **Abra um PR** contra `desenvolvimento` (nunca direto contra `main`).
6. **Mova o card** para *Em análise* no Trello, com o link do PR.

## Branches

- `main` — base de release. Apenas merges vindos de `desenvolvimento`.
- `desenvolvimento` — branch de integração. Todas as PRs vêm aqui.
- `feature/<descrição>` — nova funcionalidade.
- `fix/<descrição>` — correção de bug.
- `chore/<descrição>` — manutenção, deps, configs.
- `docs/<descrição>` — apenas documentação.

Use **kebab-case** na descrição da branch: `feature/padrao-identidade-visual`, `fix/login-admin-inicializacao`.

## Commits

Toda mensagem deve seguir o padrão **Conventional Commits** em português. Resumo:

```
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional]

[rodapé opcional]
```

**Tipos permitidos:** `feat`, `fix`, `docs`, `refactor`, `style`, `perf`, `test`, `chore`, `build`, `ci`, `security`, `revert`.

**Detalhes completos, exemplos e contraexemplos:** [docs/commit-guide.md](docs/commit-guide.md).

O hook `commit-msg` (commitlint + husky) valida automaticamente — commits fora do padrão são rejeitados localmente.

## Pull Requests

### Template

A descrição do PR deve conter:

- **Description** — o quê e por quê
- **Context** — tipo (feat/fix/chore), módulo/fluxo afetado, dependências
- **Trello** — link do card
- **Testing & Validation** — como foi testado
- **Evidence** — prints, vídeos ou explicação
- **Attention Points / Risks** — pontos críticos para o reviewer
- **Checklist** — code standards, testes, sem debug code, docs atualizadas

### Tamanho

PRs pequenos e focados são mergeados mais rápido. Se a tarefa for grande, considere dividir em PRs incrementais (cite essa decisão na descrição).

### Revisão

- Pelo menos **1 aprovação** antes do merge.
- Resolver **todos os comentários** ou justificar discordância.
- Builds e testes devem passar (CI quando configurado).

### Merge

Preferência por **squash merge** quando o histórico da branch tem commits intermediários ("WIP", "ajustes"). Para branches já bem estruturadas, **merge commit** preserva contexto.

## Setup local

Veja o [README](README.md#instalação) para instruções de instalação.

Resumido:

```bash
cd server && npm install
cd ../client && npm install
cd .. && npm install
npm run dev
```

## Padrões do código

- **Backend:** Express 5, JavaScript (sem TypeScript). Convenções em `server/routes/` por domínio.
- **Frontend:** React 19, hooks por feature. Componentes em PascalCase, hooks em camelCase começando com `use`.
- **CSS:** consumir tokens de `client/src/styles/variables.css`. Sem cores hardcoded. Ver [Identidade visual](docs/identidade-visual.md).
- **Banco:** schemas duais SQLite/Postgres em `server/db/migrations.js` e `server/supabase-schema.sql`. Sempre atualizar ambos.

## Reportando bugs

Abra um card no Trello na coluna *Backlog* com:

- Passos para reproduzir
- Comportamento esperado vs observado
- Print/vídeo se aplicável
- Ambiente (dev local, Vercel, navegador)

## Dúvidas

Abra uma discussion no Trello marcando os co-fundadores (Arthur, Tuzinho, Diego).
