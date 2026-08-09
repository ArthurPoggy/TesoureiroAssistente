# Perfis de Teste

Rode o endpoint abaixo para criar os perfis no banco local:

```
POST http://localhost:4000/api/seed/test-users
```

Nenhum token necessário. Bloqueado em `NODE_ENV=production`.

## Credenciais

| Role               | Email                      | Senha                                  |
|--------------------|----------------------------|-----------------------------------------|
| admin              | admin_teste@clan.com       | ver `SEED_DEFAULT_PASSWORD` / resposta   |
| diretor_financeiro | diretor_teste@clan.com     | ver `SEED_TEST_PASSWORD` / resposta      |
| viewer             | viewer_teste@clan.com      | ver `SEED_TEST_PASSWORD` / resposta      |

> Não há mais senha padrão fixa no código. Defina `SEED_DEFAULT_PASSWORD` (usada no
> `POST /api/seed`) e `SEED_TEST_PASSWORD` (usada no `POST /api/seed/test-users`) no
> seu `.env` local antes de rodar o seed. Se essas variáveis não forem definidas, o
> servidor gera uma senha aleatória por processo e a devolve no campo `credentials`
> da própria resposta do endpoint — leia-a ali, não fique procurando um valor fixo.
> Para os specs de e2e, exporte `E2E_DIRETOR_PASSWORD` com o mesmo valor usado em
> `SEED_TEST_PASSWORD`.
>
> O valor anterior (`test123`), exposto em commits antigos dos specs de e2e, e o
> valor de transição (`teste-2026-clan`), que chegou a ser um padrão fixo no
> código-fonte, foram ambos rotacionados/removidos e não devem mais ser usados em
> nenhum ambiente.

## O que cada role pode fazer

| Ação                        | admin | diretor_financeiro | viewer |
|-----------------------------|:-----:|:------------------:|:------:|
| Ver dashboard               | ✓     | ✓                  | ✓      |
| Registrar pagamentos        | ✓     | ✓                  | ✗      |
| Gerenciar membros           | ✓     | ✓                  | ✗      |
| Registrar despesas/eventos  | ✓     | ✓                  | ✗      |
| Configurações do sistema    | ✓     | ✗                  | ✗      |
| Extrato financeiro          | ✓     | ✗                  | ✗      |

## Idempotência

O endpoint é seguro para chamar múltiplas vezes. Perfis já existentes são ignorados;
o response sempre lista todos os perfis e suas credenciais.
