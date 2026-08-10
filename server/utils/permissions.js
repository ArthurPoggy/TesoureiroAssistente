const { query, queryOne, execute } = require('../db/query');

// ---------------------------------------------------------------------------
// Catálogo de permissões
// ---------------------------------------------------------------------------
// Cada entrada corresponde a uma linha da tabela `permissions` (ver
// server/db/migrations.js e server/supabase-schema.sql). O código é o
// identificador estável usado em `member_permissions.permission_code`.
const PERMISSIONS_CATALOG = [
  { code: 'pagamentos.ver', name: 'Visualizar pagamentos', category: 'Pagamentos' },
  { code: 'pagamentos.criar', name: 'Registrar novos pagamentos', category: 'Pagamentos' },
  { code: 'pagamentos.editar', name: 'Editar pagamentos existentes', category: 'Pagamentos' },
  { code: 'pagamentos.excluir', name: 'Excluir pagamentos', category: 'Pagamentos' },

  { code: 'despesas.ver', name: 'Visualizar despesas', category: 'Despesas' },
  { code: 'despesas.criar', name: 'Registrar novas despesas', category: 'Despesas' },
  { code: 'despesas.editar', name: 'Editar despesas existentes', category: 'Despesas' },
  { code: 'despesas.excluir', name: 'Excluir despesas', category: 'Despesas' },

  { code: 'membros.ver', name: 'Visualizar membros', category: 'Membros' },
  { code: 'membros.gerenciar', name: 'Criar, editar, convidar e remover membros', category: 'Membros' },
  { code: 'membros.alterar_role', name: 'Alterar o papel (role) de um membro', category: 'Membros' },

  { code: 'relatorios.ver', name: 'Visualizar relatórios e extratos', category: 'Relatórios' },
  { code: 'relatorios.exportar', name: 'Exportar relatórios e extratos', category: 'Relatórios' },

  { code: 'metas.ver', name: 'Visualizar metas', category: 'Metas' },
  { code: 'metas.gerenciar', name: 'Criar, editar e excluir metas', category: 'Metas' },

  { code: 'eventos.ver', name: 'Visualizar eventos', category: 'Eventos' },
  { code: 'eventos.gerenciar', name: 'Criar, editar e excluir eventos', category: 'Eventos' },

  { code: 'projetos.ver', name: 'Visualizar projetos', category: 'Projetos' },
  { code: 'projetos.gerenciar', name: 'Criar, editar, excluir projetos e gerenciar membros do projeto', category: 'Projetos' },

  { code: 'configuracoes.ver', name: 'Visualizar configurações do sistema', category: 'Configurações' },
  { code: 'configuracoes.gerenciar', name: 'Alterar configurações do sistema', category: 'Configurações' },

  { code: 'arquivos.ver', name: 'Visualizar arquivos anexados', category: 'Arquivos' },
  { code: 'arquivos.gerenciar', name: 'Enviar e gerenciar arquivos (Google Drive)', category: 'Arquivos' }
];

const ALL_PERMISSION_CODES = PERMISSIONS_CATALOG.map((p) => p.code);

// ---------------------------------------------------------------------------
// Matriz role x permissão (estado atual do sistema, antes de qualquer
// customização via `member_permissions`).
//
// Reflete o que já é aplicado hoje pelos middlewares em
// server/middleware/auth.js:
//   - requireAuth       -> qualquer papel autenticado (base de leitura do viewer)
//   - requirePrivileged -> admin e diretor_financeiro (isPrivilegedRole)
//   - requireAdmin      -> somente admin (ex: PUT /members/:id/role)
//
//                        | viewer | diretor_financeiro | admin |
// ----------------------------------------------------------------
// pagamentos.ver         |   x    |          x          |   x   |
// pagamentos.criar       |        |          x          |   x   |
// pagamentos.editar      |        |          x          |   x   |
// pagamentos.excluir     |        |          x          |   x   |
// despesas.ver           |   x    |          x          |   x   |
// despesas.criar         |        |          x          |   x   |
// despesas.editar        |        |          x          |   x   |
// despesas.excluir       |        |          x          |   x   |
// membros.ver            |   x    |          x          |   x   |
// membros.gerenciar      |        |          x          |   x   |
// membros.alterar_role   |        |                      |   x   |
// relatorios.ver         |   x    |          x          |   x   |
// relatorios.exportar    |   x    |          x          |   x   |
// metas.ver              |   x    |          x          |   x   |
// metas.gerenciar        |        |          x          |   x   |
// eventos.ver            |   x    |          x          |   x   |
// eventos.gerenciar      |        |          x          |   x   |
// projetos.ver           |   x    |          x          |   x   |
// projetos.gerenciar     |        |          x          |   x   |
// configuracoes.ver      |        |          x          |   x   |
// configuracoes.gerenciar|        |          x          |   x   |
// arquivos.ver           |        |          x          |   x   |
// arquivos.gerenciar     |        |          x          |   x   |
// ---------------------------------------------------------------------------

const VIEWER_PRESET = [
  'pagamentos.ver',
  'despesas.ver',
  'membros.ver',
  'relatorios.ver',
  'relatorios.exportar',
  'metas.ver',
  'eventos.ver',
  'projetos.ver'
];

const DIRETOR_FINANCEIRO_PRESET = [
  'pagamentos.ver',
  'pagamentos.criar',
  'pagamentos.editar',
  'pagamentos.excluir',
  'despesas.ver',
  'despesas.criar',
  'despesas.editar',
  'despesas.excluir',
  'membros.ver',
  'membros.gerenciar',
  'relatorios.ver',
  'relatorios.exportar',
  'metas.ver',
  'metas.gerenciar',
  'eventos.ver',
  'eventos.gerenciar',
  'projetos.ver',
  'projetos.gerenciar',
  'configuracoes.ver',
  'configuracoes.gerenciar',
  'arquivos.ver',
  'arquivos.gerenciar'
];

// Admin sempre tem o catálogo completo (inclusive permissões futuras).
const ADMIN_PRESET = [...ALL_PERMISSION_CODES];

const ROLE_PRESETS = {
  admin: ADMIN_PRESET,
  diretor_financeiro: DIRETOR_FINANCEIRO_PRESET,
  viewer: VIEWER_PRESET
};

const getPresetForRole = (role) => ROLE_PRESETS[role] || ROLE_PRESETS.viewer;

// ---------------------------------------------------------------------------
// Permissões efetivas de um membro = preset do papel atual, com os
// overrides de `member_permissions` aplicados por cima (allowed=1 adiciona,
// allowed=0 remove). Um membro sem nenhuma linha em member_permissions
// simplesmente herda o preset do seu role.
// ---------------------------------------------------------------------------
const getEffectivePermissions = async (memberId) => {
  const member = await queryOne('SELECT role FROM members WHERE id = ?', [memberId]);
  const role = member?.role || 'viewer';
  const effective = new Set(getPresetForRole(role));

  const overrides = await query(
    'SELECT permission_code, allowed FROM member_permissions WHERE member_id = ?',
    [memberId]
  );
  overrides.forEach(({ permission_code, allowed }) => {
    if (Number(allowed) === 1) {
      effective.add(permission_code);
    } else {
      effective.delete(permission_code);
    }
  });

  return Array.from(effective);
};

const makeError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ---------------------------------------------------------------------------
// Altera (concede ou revoga) o override de uma permissão de um membro.
//
// Regras de negócio:
//  - Somente um usuário com role admin pode alterar permissões de outros
//    membros (actorId precisa corresponder a um membro admin ativo).
//  - Nunca é possível revogar as permissões administrativas do último admin
//    ativo do sistema: se o membro alvo for admin e for o único admin ativo,
//    qualquer revogação (allowed = 0) é bloqueada com um erro claro (não 500).
//  - Toda alteração bem-sucedida gera uma linha em permission_audit_log com
//    quem alterou, o membro afetado, a permissão, o valor anterior e o novo.
// ---------------------------------------------------------------------------
const setMemberPermissionOverride = async ({ actorId, memberId, code, allowed, origem = 'manual' }) => {
  const actor = await queryOne('SELECT id, role, active FROM members WHERE id = ?', [actorId]);
  if (!actor || actor.role !== 'admin' || Number(actor.active) === 0) {
    throw makeError('Apenas administradores podem alterar permissões de outros membros.', 403);
  }

  const target = await queryOne('SELECT id, role, active FROM members WHERE id = ?', [memberId]);
  if (!target) {
    throw makeError('Membro não encontrado.', 404);
  }

  const newValue = Number(allowed) ? 1 : 0;

  if (newValue === 0 && target.role === 'admin') {
    const activeAdmins = await query(
      "SELECT id FROM members WHERE role = 'admin' AND active = 1"
    );
    if (activeAdmins.length <= 1 && activeAdmins.some((admin) => Number(admin.id) === Number(memberId))) {
      throw makeError(
        'Não é possível revogar permissões administrativas do último admin ativo do sistema.',
        400
      );
    }
  }

  const existingOverride = await queryOne(
    'SELECT allowed FROM member_permissions WHERE member_id = ? AND permission_code = ?',
    [memberId, code]
  );
  const previousValue = existingOverride
    ? Number(existingOverride.allowed)
    : (getPresetForRole(target.role).includes(code) ? 1 : 0);

  if (existingOverride) {
    await execute(
      'UPDATE member_permissions SET allowed = ?, origem = ? WHERE member_id = ? AND permission_code = ?',
      [newValue, origem, memberId, code]
    );
  } else {
    await execute(
      'INSERT INTO member_permissions (member_id, permission_code, allowed, origem) VALUES (?, ?, ?, ?)',
      [memberId, code, newValue, origem]
    );
  }

  await execute(
    `INSERT INTO permission_audit_log (member_id, permission_code, previous_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [memberId, code, previousValue, newValue, actorId]
  );

  return { memberId, code, allowed: newValue, previousValue };
};

// ---------------------------------------------------------------------------
// Remove o override de uma permissão de um membro, revertendo-o para o
// comportamento puro do preset do seu role (rollback/"restaurar padrão").
//
// Segue as mesmas regras de negócio de setMemberPermissionOverride: só admin
// pode alterar, a revogação do último admin ativo é bloqueada, e toda
// alteração efetiva gera uma linha em permission_audit_log.
// ---------------------------------------------------------------------------
const removeMemberPermissionOverride = async ({ actorId, memberId, code }) => {
  const actor = await queryOne('SELECT id, role, active FROM members WHERE id = ?', [actorId]);
  if (!actor || actor.role !== 'admin' || Number(actor.active) === 0) {
    throw makeError('Apenas administradores podem alterar permissões de outros membros.', 403);
  }

  const target = await queryOne('SELECT id, role, active FROM members WHERE id = ?', [memberId]);
  if (!target) {
    throw makeError('Membro não encontrado.', 404);
  }

  const existingOverride = await queryOne(
    'SELECT allowed FROM member_permissions WHERE member_id = ? AND permission_code = ?',
    [memberId, code]
  );
  if (!existingOverride) {
    // Nada para reverter: o membro já segue o preset do seu role.
    return { memberId, code, reverted: false };
  }

  const previousValue = Number(existingOverride.allowed);
  const presetValue = getPresetForRole(target.role).includes(code) ? 1 : 0;

  // Se remover o override fizer o membro perder efetivamente a permissão
  // (override concedia algo que o preset não cobre), aplica-se a mesma
  // proteção do último admin ativo usada em setMemberPermissionOverride.
  if (previousValue === 1 && presetValue === 0 && target.role === 'admin') {
    const activeAdmins = await query(
      "SELECT id FROM members WHERE role = 'admin' AND active = 1"
    );
    if (activeAdmins.length <= 1 && activeAdmins.some((admin) => Number(admin.id) === Number(memberId))) {
      throw makeError(
        'Não é possível revogar permissões administrativas do último admin ativo do sistema.',
        400
      );
    }
  }

  await execute(
    'DELETE FROM member_permissions WHERE member_id = ? AND permission_code = ?',
    [memberId, code]
  );

  await execute(
    `INSERT INTO permission_audit_log (member_id, permission_code, previous_value, new_value, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [memberId, code, previousValue, presetValue, actorId]
  );

  return { memberId, code, allowed: presetValue, previousValue, reverted: true };
};

module.exports = {
  PERMISSIONS_CATALOG,
  ALL_PERMISSION_CODES,
  ROLE_PRESETS,
  getPresetForRole,
  getEffectivePermissions,
  setMemberPermissionOverride,
  removeMemberPermissionOverride
};
