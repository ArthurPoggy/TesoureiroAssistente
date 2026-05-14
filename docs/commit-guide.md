# Guia de commits — TesoureiroAssistente

Convenção de mensagens de commit do projeto, baseada em [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) com adaptações.

Aderir a este padrão facilita:

- **Histórico legível** — qualquer pessoa entende o que cada commit fez
- **Geração automática de CHANGELOG** — ferramentas como `standard-version` agrupam por tipo
- **Revisão de PR mais rápida** — o tipo do commit já contextualiza o reviewer
- **Bisect e debugging** — `git log --grep='^fix'` filtra rapidamente correções

---

## Idioma

**Português.** Mantém consistência com o histórico atual do repositório e é o idioma da equipe. Termos técnicos em inglês (camelCase, PIX, JWT) ficam em inglês mesmo.

---

## Estrutura

```
<tipo>(<escopo opcional>): <descrição curta>

[corpo opcional explicando o porquê]

[rodapé opcional com referências, breaking changes, co-authors]
```

### Regras

1. **Primeira linha (header):** no máximo **72 caracteres**
2. **Tipo:** obrigatório, sempre em **minúsculas**
3. **Escopo:** opcional, em **minúsculas**, descreve a área do código (`auth`, `payments`, `frontend`, etc.)
4. **Descrição:** começa em **minúscula**, modo **imperativo presente** ("adicionar", não "adicionado" ou "adiciona")
5. **Sem ponto final** na primeira linha
6. **Corpo (opcional):** separado por linha em branco, explica o **porquê**, não o **o quê**
7. **Rodapé (opcional):** referências a issues/cards (`Refs: #123`), breaking changes (`BREAKING CHANGE: ...`), co-autoria (`Co-Authored-By: Nome <email>`)

---

## Tipos permitidos

| Tipo | Quando usar | Exemplo |
|------|-------------|---------|
| `feat` | Nova funcionalidade visível ao usuário | `feat: adicionar exportação de extrato em PDF` |
| `fix` | Correção de bug | `fix: corrigir cálculo de saldo após estorno` |
| `docs` | Apenas documentação (README, comentários, guides) | `docs: atualizar guia de setup do Drive` |
| `refactor` | Mudança de código sem alterar comportamento | `refactor: extrair lógica de auth em middleware` |
| `style` | Formatação, espaços, lint (sem mudança lógica) | `style: padronizar indentação dos hooks` |
| `perf` | Melhoria de performance | `perf: cachear consulta de saldo no dashboard` |
| `test` | Adicionar ou ajustar testes | `test: cobrir cenário de pagamento duplicado` |
| `chore` | Manutenção (deps, configs, builds) | `chore: atualizar dependências do server` |
| `build` | Mudanças em build, deploy, CI | `build: ajustar config do Vercel para SPA` |
| `ci` | Mudanças em pipelines de CI | `ci: rodar testes em PR contra desenvolvimento` |
| `security` | Correção de vulnerabilidade ou hardening | `security: remover token hardcoded do seed` |
| `revert` | Reverter commit anterior | `revert: desfazer feat de gamificação do ranking` |

---

## Exemplos

### ✅ Boas mensagens

```
feat(payments): permitir pagamento parcial de mensalidade
```

```
fix(auth): bloquear login de membro inativo

O middleware hidrataUserFromDb continuava aceitando o JWT
mesmo após admin marcar o membro como inativo.

Refs: card Trello #41
```

```
docs: documentar setup do Supabase em produção
```

```
chore(deps): atualizar express para 5.2.1
```

```
refactor(dashboard): extrair cálculo de inadimplência para utils

Same behavior, mas separa a query SQL do componente de UI.
```

```
security: rotacionar JWT_SECRET fallback
```

```
feat: adicionar aba de projetos com associação de membros

Co-Authored-By: Diego Silva <diego@example.com>
```

### ❌ Mensagens ruins

```
a
```
*Não diz absolutamente nada.*

```
atualizações
```
*Vago. Atualizações de quê?*

```
config
```
*Sem prefixo, sem contexto, sem objeto.*

```
adicionado funcionalidade nova de pagamentos
```
*Sem prefixo. Verbo no particípio em vez de imperativo. Genérico demais.*

```
fix: corrigir bug
```
*Tem prefixo mas a descrição é vazia. Que bug?*

```
WIP
```
*Não commitar WIP em branch que vai virar PR.*

```
FEAT: ADICIONAR EXPORTAÇÃO EM PDF.
```
*Maiúsculas e ponto final indevidos.*

---

## Boas práticas

### Modo imperativo

Pense no commit como uma instrução: *"se este commit for aplicado, ele vai..."*

| Errado | Certo |
|--------|-------|
| `feat: adicionado novo botão` | `feat: adicionar novo botão` |
| `fix: corrigia validação` | `fix: corrigir validação` |
| `docs: documentação do guia` | `docs: documentar guia de setup` |

### Foco no porquê no corpo

A primeira linha responde **o quê**. O corpo responde **por quê**. Não duplique informação que já está no diff.

```
refactor(auth): trocar JWT por session cookies

Cookies httpOnly mitigam XSS e simplificam o logout (basta limpar
o cookie no servidor). JWT em localStorage continua vulnerável a
script injection mesmo com CSP.

Refs: incidente #SEC-12
```

### Atomicidade

Um commit = uma mudança lógica. Se você precisa usar "e" na descrição, provavelmente são 2 commits.

```
❌ feat: adicionar exportação e corrigir validação de CPF
✅ feat: adicionar exportação de extrato em PDF
✅ fix: validar CPF com 11 dígitos antes de salvar
```

### Co-autoria em pair programming

Use `Co-Authored-By` no rodapé (linha em branco antes):

```
feat: implementar rateio de despesas em eventos

Co-Authored-By: Tuzinho <tuzinho@example.com>
```

### Referenciar cards do Trello

Use `Refs:` no rodapé:

```
fix: corrigir login do admin na inicialização

Refs: card Trello #41
```

---

## Breaking changes

Mudanças que quebram compatibilidade (rename de rota pública, remoção de campo na API) devem ser destacadas:

```
feat(api)!: renomear campo cpf para registro_escoteiro

BREAKING CHANGE: o campo `cpf` em GET /api/members/:id foi
renomeado para `registro_escoteiro`. Atualizar consumidores.
```

O `!` após o tipo/escopo sinaliza a quebra. O bloco `BREAKING CHANGE:` no rodapé descreve a migração.

---

## Validação automática

O repositório usa **commitlint** + **husky** para validar mensagens no `commit-msg` hook. Commits fora do padrão são rejeitados localmente.

Configuração em [`commitlint.config.js`](../commitlint.config.js).

### Pular validação (não recomendado)

Apenas em emergência (ex: hotfix urgente em produção):

```bash
git commit --no-verify -m "..."
```

Use raramente e sempre justifique no PR.

---

## Geração de CHANGELOG (futuro)

A convenção é compatível com ferramentas como `standard-version` ou `release-please`, que agrupam commits por tipo e geram automaticamente o `CHANGELOG.md` em cada release.

Quando adotarmos versionamento semântico:

- `feat` → minor bump (`1.2.0` → `1.3.0`)
- `fix` → patch bump (`1.2.0` → `1.2.1`)
- `BREAKING CHANGE` → major bump (`1.2.0` → `2.0.0`)

---

## Referências

- [Conventional Commits 1.0.0 (pt-BR)](https://www.conventionalcommits.org/pt-br/v1.0.0/)
- [How to Write a Git Commit Message — Chris Beams](https://cbea.ms/git-commit/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
