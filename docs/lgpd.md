# Conformidade com a LGPD — TesoureiroAssistente

> Documentação de tratamento de dados pessoais e conformidade com a Lei nº 13.709/2018 (LGPD).
> Data: 2026-05-26. Caráter: documentação de conformidade + plano de adequação.

## 1. Contexto

O TesoureiroAssistente é um sistema interno de tesouraria de um clã escoteiro. Ele trata
dados pessoais de membros e, portanto, está sujeito à LGPD. Este documento mapeia os dados
tratados, a base legal, os direitos dos titulares e os controles técnicos exigidos.

## 2. Dados pessoais tratados

| Dado | Onde | Sensibilidade |
|------|------|---------------|
| Nome, apelido | `members.name`, `members.nickname` | Comum |
| E-mail | `members.email` | Comum |
| CPF | `members.cpf` | Comum (identificador) |
| Registro escoteiro | `members` | Comum |
| Dados financeiros (mensalidades, pagamentos) | `payments`, `expenses` | Comum, sensível ao contexto |
| Senha (hash) | `members.password_hash` | Credencial |

Não há tratamento de dados sensíveis no sentido do art. 5º, II (saúde, biometria, etc.) no
escopo atual. **Atenção:** caso o módulo de Ficha Médica seja implementado no futuro, ele
trará dados sensíveis e exigirá controles adicionais (consentimento específico, cifragem).

## 3. Base legal e finalidade

- **Finalidade:** gestão financeira e administrativa do grupo escoteiro (controle de
  mensalidades, despesas, eventos e projetos).
- **Base legal (art. 7º):** execução de obrigações no contexto da associação/legítimo
  interesse do grupo; para menores, consentimento do responsável.
- **Minimização:** coletar apenas o necessário à finalidade declarada.

## 4. Direitos dos titulares (art. 18)

O titular pode solicitar: confirmação de tratamento, acesso, correção, anonimização/eliminação,
portabilidade e informação sobre compartilhamento. Procedimento: solicitação ao tesoureiro
responsável (encarregado/DPO), atendida em prazo razoável.

**Estado atual no sistema:**
- Acesso/correção: parcialmente atendido (membro vê e edita seus dados; admin gerencia).
- Eliminação: exclusão de membro existe (`DELETE /api/members/:id`), com cascata.
- Portabilidade: **não implementado** — ver plano de adequação.

## 5. Controles técnicos

| Controle | Estado |
|----------|--------|
| Senhas com hash (bcrypt) | Implementado |
| Acesso por papéis (admin/diretor/viewer) | Implementado |
| Dados financeiros restritos ao tesoureiro | Implementado |
| Transporte cifrado (HTTPS) | Garantido pelo deploy (Vercel) |
| Cifragem em repouso de dados sensíveis | **Pendente** (ver auditoria de segurança) |
| Registro de consentimento | **Pendente** |
| Política de retenção/eliminação | **Pendente** |

Riscos técnicos correlatos ainda pendentes de correção: `JWT_SECRET` fixo no código,
CORS aberto, ausência de rate limit/helmet e refresh token armazenado em texto puro.

## 6. Plano de adequação (próximos cards)

1. **Política de Privacidade visível ao usuário** (tela/aceite no primeiro acesso), registrando consentimento.
2. **Exportação de dados do titular** (portabilidade) — endpoint que entrega os dados do membro.
3. **Política de retenção** — definir prazo e rotina de anonimização/eliminação de inativos.
4. **Consentimento do responsável** para membros menores de idade.
5. **Cifragem em repouso** de identificadores sensíveis (CPF) e segredos.
6. **Registro de encarregado (DPO)** e canal de contato para exercício de direitos.

## 7. Encarregado (DPO)

Definir e publicar o encarregado pelo tratamento de dados (nome + canal de contato). Placeholder
até definição formal pelo grupo.
