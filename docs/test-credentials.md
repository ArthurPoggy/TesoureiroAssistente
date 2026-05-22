# Perfis de Teste

Rode o endpoint abaixo para criar os perfis no banco local:

```
POST http://localhost:4000/api/seed/test-users
```

Nenhum token necessário. Bloqueado em `NODE_ENV=production`.

## Credenciais

| Role               | Email                      | Senha   |
|--------------------|----------------------------|---------|
| admin              | admin_teste@clan.com       | test123 |
| diretor_financeiro | diretor_teste@clan.com     | test123 |
| viewer             | viewer_teste@clan.com      | test123 |

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
