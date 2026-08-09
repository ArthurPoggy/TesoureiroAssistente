# Auditoria de Segurança — TesoureiroAssistente

> Investigação de vulnerabilidades no backend e frontend, orientada pelo OWASP Top 10.
> Data: 2026-05-26. Escopo: `server/` e `client/`. Esta é uma auditoria de levantamento —
> as correções priorizadas devem virar cards próprios.

## Resumo executivo

O sistema adota boas práticas relevantes: autenticação JWT com middleware de papéis,
consultas parametrizadas (sem concatenação de input em SQL), restrição de ranking/inadimplência
ao tesoureiro e validação de upload de avatar por *magic bytes*. Os principais riscos
encontrados são de **configuração** (segredo com fallback e CORS permissivo) e ausência de
*hardening* de borda (rate limiting, headers de segurança).

| # | Severidade | Achado | Local |
|---|------------|--------|-------|
| 1 | **Alta** | `JWT_SECRET` com fallback hardcoded | `server/config/index.js:12` |
| 2 | Média | CORS liberado para qualquer origem | `server/app.js:23` |
| 3 | Média | Sem rate limiting em rotas sensíveis (login, setup-password) | `server/app.js`, `server/routes/auth.js` |
| 4 | Baixa | Ausência de headers de segurança (helmet) | `server/app.js` |
| 5 | Baixa | Refresh token do Drive armazenado em texto puro em `settings` | `server/routes/google-drive.js:131` |

## Achados detalhados

### 1. JWT_SECRET com fallback hardcoded — **Alta**
`server/config/index.js:12` define `JWT_SECRET: process.env.JWT_SECRET || 'tesoureiroassistente-secret'`.
Se a variável de ambiente não for configurada em produção, o sistema usa um segredo público
(versionado no repositório), permitindo que qualquer pessoa **forje tokens** com role `admin`.
Há um aviso em `server/index.js:7`, mas o fallback ainda é aplicado.

**Recomendação:** remover o fallback e abortar o boot se `JWT_SECRET` não estiver definido
(*fail fast*). Os testes já injetam `JWT_SECRET` via `jest.setup.js`, então não quebram.
Mapeamento OWASP: A02 (Cryptographic Failures) / A05 (Security Misconfiguration).

### 2. CORS liberado para qualquer origem — **Média**
`server/app.js:23` usa `app.use(cors())`, que reflete qualquer `Origin`. Como a autenticação
usa JWT no header `Authorization` (não cookies), o risco de CSRF é baixo, mas a API fica
exposta a chamadas de qualquer site.

**Recomendação:** restringir `origin` a uma allowlist via `CORS_ORIGINS` no ambiente.
Mapeamento OWASP: A05 (Security Misconfiguration).

### 3. Sem rate limiting em rotas sensíveis — **Média**
Login e fluxo de definição de senha não têm limitação de tentativas, viabilizando
*brute force* / *credential stuffing*.

**Recomendação:** aplicar `express-rate-limit` nas rotas de `auth` (ex.: 5–10 req/min por IP).
Mapeamento OWASP: A07 (Identification and Authentication Failures).

### 4. Ausência de headers de segurança — **Baixa**
Não há `helmet`. Faltam cabeçalhos como `X-Content-Type-Options`, `X-Frame-Options` e CSP.

**Recomendação:** adicionar `helmet()` no `app.js`.
Mapeamento OWASP: A05 (Security Misconfiguration).

### 5. Refresh token do Drive em texto puro — **Baixa**
`server/routes/google-drive.js:131` salva o `google_refresh_token` na tabela `settings` sem
cifragem. Em caso de vazamento do banco, o token concede acesso ao Drive configurado.

**Recomendação:** cifrar em repouso (ex.: AES com chave em env) ou manter apenas em variável
de ambiente. Mapeamento OWASP: A02 (Cryptographic Failures).

## Pontos positivos observados

- **Injeção de SQL:** consultas usam *placeholders* (`?`) — não há concatenação de input em SQL.
- **Controle de acesso:** middleware `requireAuth`/`requirePrivileged`/`requireAdmin` aplicado nas rotas;
  ranking e inadimplência restritos ao tesoureiro (com testes que verificam ausência de vazamento no 403).
- **Upload:** avatar validado por *magic bytes* no backend; tipo de arquivo validado no upload de histórico.
- **Tokens com expiração:** JWT emitido com `expiresIn` (12h).

## Próximos passos sugeridos (cards de correção)

1. Tornar `JWT_SECRET` obrigatório (remover fallback) — **prioridade alta**.
2. Allowlist de CORS por ambiente.
3. Rate limiting em `auth`.
4. `helmet` no `app.js`.
5. Cifrar refresh token do Drive em repouso.
