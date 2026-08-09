# Permissões e presets por role

Este documento descreve o catálogo de permissões granulares do
TesoureiroAssistente, os presets aplicados a cada role e como a
customização individual (override) funciona — tanto no backend quanto na
tela admin de gestão de permissões.

Fonte de verdade no código: `server/utils/permissions.js`
(`PERMISSIONS_CATALOG`, `ROLE_PRESETS`). Este documento deve ser atualizado
sempre que uma permissão for adicionada, removida ou tiver seu preset
alterado nesse arquivo.

## Conceitos

- **Permissão**: uma ação específica do sistema, identificada por um código
  estável (`categoria.acao`), ex: `pagamentos.criar`.
- **Preset do role**: o conjunto de permissões que um role (`admin`,
  `diretor_financeiro`, `viewer`) recebe por padrão.
- **Override**: uma customização individual guardada em
  `member_permissions`, que concede (`allowed = 1`) ou revoga
  (`allowed = 0`) uma permissão específica para um membro, sobrepondo o
  preset do seu role.
- **Permissão efetiva**: o resultado final aplicado no acesso do membro —
  preset do role com os overrides aplicados por cima. É o que os
  middlewares `requirePermission` (server/middleware/auth.js) checam a
  cada request.

Toda alteração de override (conceder ou revogar) passa por
`setMemberPermissionOverride` e sua reversão (voltar ao preset puro) por
`removeMemberPermissionOverride`, ambos em `server/utils/permissions.js`.
As duas funções:

- Só podem ser chamadas por um membro com role `admin` ativo (`actorId`).
- Bloqueiam qualquer alteração que revogaria as permissões administrativas
  do último admin ativo do sistema (erro claro, não 500).
- Gravam uma linha em `permission_audit_log` com quem alterou, o membro
  afetado, a permissão, o valor anterior e o novo.

## Tela admin de gestão de permissões

Componente: `client/src/components/admin/PermissionsMatrix.jsx`, acessível
a partir do painel de detalhes de um membro (`MemberDetailView`, visível
apenas para role `admin`, botão "Gerenciar permissões").

A tela exibe uma matriz de checkboxes agrupada por categoria. Cada linha
mostra:

- O checkbox com o estado efetivo atual da permissão para o membro.
- Um indicador **"Preset aplicado"** quando o valor atual reflete apenas o
  preset do role (nenhum override cadastrado) para uma permissão fora do
  preset padrão do role.
- Um indicador **"Customizado"** quando existe um override cadastrado para
  aquela permissão, e um botão **"Restaurar padrão"** que remove o
  override e devolve o membro ao comportamento puro do preset do seu role
  (rollback).

A tela consome diretamente as rotas HTTP:

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/api/members/:id/permissions` | Catálogo completo + preset do role + permissões efetivas + overrides cadastrados do membro |
| `PUT` | `/api/members/:id/permissions/:codigo` | Concede/revoga um override (`{ allowed: boolean }`) — delega para `setMemberPermissionOverride` |
| `DELETE` | `/api/members/:id/permissions/:codigo` | Remove o override, revertendo ao preset do role — delega para `removeMemberPermissionOverride` |

Todas as três rotas exigem role `admin` (`requireAdmin`).

## Catálogo de permissões e presets por role

`x` = concedida pelo preset do role. Um membro sem overrides cadastrados
tem exatamente as permissões marcadas para o seu role; overrides em
`member_permissions` podem conceder ou revogar qualquer uma delas
individualmente.

| Código | Categoria | Descrição | viewer | diretor_financeiro | admin |
| --- | --- | --- | :---: | :---: | :---: |
| `pagamentos.ver` | Pagamentos | Visualizar pagamentos | x | x | x |
| `pagamentos.criar` | Pagamentos | Registrar novos pagamentos | | x | x |
| `pagamentos.editar` | Pagamentos | Editar pagamentos existentes | | x | x |
| `pagamentos.excluir` | Pagamentos | Excluir pagamentos | | x | x |
| `despesas.ver` | Despesas | Visualizar despesas | x | x | x |
| `despesas.criar` | Despesas | Registrar novas despesas | | x | x |
| `despesas.editar` | Despesas | Editar despesas existentes | | x | x |
| `despesas.excluir` | Despesas | Excluir despesas | | x | x |
| `membros.ver` | Membros | Visualizar membros | x | x | x |
| `membros.gerenciar` | Membros | Criar, editar, convidar e remover membros | | x | x |
| `membros.alterar_role` | Membros | Alterar o papel (role) de um membro | | | x |
| `relatorios.ver` | Relatórios | Visualizar relatórios e extratos | x | x | x |
| `relatorios.exportar` | Relatórios | Exportar relatórios e extratos | x | x | x |
| `metas.ver` | Metas | Visualizar metas | x | x | x |
| `metas.gerenciar` | Metas | Criar, editar e excluir metas | | x | x |
| `eventos.ver` | Eventos | Visualizar eventos | x | x | x |
| `eventos.gerenciar` | Eventos | Criar, editar e excluir eventos | | x | x |
| `projetos.ver` | Projetos | Visualizar projetos | x | x | x |
| `projetos.gerenciar` | Projetos | Criar, editar, excluir projetos e gerenciar membros do projeto | | x | x |
| `configuracoes.ver` | Configurações | Visualizar configurações do sistema | | x | x |
| `configuracoes.gerenciar` | Configurações | Alterar configurações do sistema | | x | x |
| `arquivos.ver` | Arquivos | Visualizar arquivos anexados | | x | x |
| `arquivos.gerenciar` | Arquivos | Enviar e gerenciar arquivos (Google Drive) | | x | x |

O role `admin` sempre recebe o catálogo completo de permissões
(`ADMIN_PRESET`), inclusive permissões futuras adicionadas ao catálogo —
não é necessário atualizar essa coluna ao criar uma nova permissão.

## Adicionando uma nova permissão

1. Adicione a entrada em `PERMISSIONS_CATALOG` (`server/utils/permissions.js`),
   com `code`, `name` e `category`.
2. Inclua o código no(s) preset(s) de role adequado(s)
   (`VIEWER_PRESET` / `DIRETOR_FINANCEIRO_PRESET`; `admin` já herda tudo).
3. A migração idempotente em `server/db/migrations.js` insere o catálogo
   automaticamente (`INSERT OR IGNORE`) — não é necessário editar
   `server/supabase-schema.sql` manualmente para o catálogo, mas garanta
   que as tabelas `permissions`, `member_permissions` e
   `permission_audit_log` existam em ambos os arquivos caso o schema em si
   mude.
4. Atualize a tabela deste documento.
