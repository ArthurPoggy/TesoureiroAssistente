const jwt = require('jsonwebtoken');
const express = require('express');
const request = require('supertest');
const { queryOne } = require('../db/query');
const { requireAuth } = require('../middleware/auth');
const { insertMember, cleanAll } = require('./helpers');

const SECRET = 'test-secret-key-for-jest';
const signFor = (memberId) => jwt.sign({ memberId }, SECRET, { expiresIn: '1h' });

let requirePermission;
try {
  // Contrato esperado pela subtask "Middleware requirePermission com resolução
  // preset+override e audit log": server/middleware/auth.js deve exportar
  // requirePermission(codigoPermissao).
  ({ requirePermission } = require('../middleware/auth'));
} catch (e) {
  requirePermission = null;
}

let permissionsUtil;
try {
  permissionsUtil = require('../utils/permissions');
} catch (e) {
  permissionsUtil = null;
}

beforeEach(() => {
  cleanAll();
  global.__testDb.prepare('DELETE FROM member_permissions').run();
  try {
    global.__testDb.prepare('DELETE FROM permission_audit_log').run();
  } catch (e) {
    // tabela ainda não existe: parte do estado "red" esperado desta subtask.
  }
});

function buildAppWithProtectedRoute(permissionCode) {
  const app = express();
  app.use(express.json());
  app.get('/protegido', requireAuth, requirePermission(permissionCode), (req, res) => {
    res.status(200).json({ ok: true });
  });
  // handler de erro simples, equivalente ao usado pelas rotas reais
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  });
  return app;
}

// ---------------------------------------------------------------------------
// requirePermission: 403 quando a permissão específica não está concedida
// ---------------------------------------------------------------------------
describe('requirePermission (preset + override)', () => {
  test('usuário sem a permissão específica recebe 403 em rota protegida', async () => {
    expect(requirePermission).not.toBeNull();
    const memberId = insertMember({ role: 'viewer' });
    const app = buildAppWithProtectedRoute('membros.gerenciar'); // fora do preset de viewer

    const res = await request(app)
      .get('/protegido')
      .set('Authorization', `Bearer ${signFor(memberId)}`);

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('override concedendo a permissão libera acesso mesmo fora do preset do role', async () => {
    expect(requirePermission).not.toBeNull();
    const memberId = insertMember({ role: 'viewer' });
    global.__testDb
      .prepare(
        'INSERT INTO member_permissions (member_id, permission_code, allowed, origem) VALUES (?, ?, 1, ?)'
      )
      .run(memberId, 'membros.gerenciar', 'manual');

    const app = buildAppWithProtectedRoute('membros.gerenciar');
    const res = await request(app)
      .get('/protegido')
      .set('Authorization', `Bearer ${signFor(memberId)}`);

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Alteração de permissão -> linha no audit log
// ---------------------------------------------------------------------------
describe('auditoria de alteração de permissões', () => {
  test('conceder um override registra uma linha em permission_audit_log', async () => {
    expect(permissionsUtil).not.toBeNull();
    expect(typeof permissionsUtil.setMemberPermissionOverride).toBe('function');

    const adminId = insertMember({ role: 'admin' });
    const targetId = insertMember({ role: 'viewer' });

    await permissionsUtil.setMemberPermissionOverride({
      actorId: adminId,
      memberId: targetId,
      code: 'pagamentos.criar',
      allowed: 1
    });

    const logRow = await queryOne(
      'SELECT * FROM permission_audit_log WHERE member_id = ? AND permission_code = ?',
      [targetId, 'pagamentos.criar']
    );

    expect(logRow).toBeTruthy();
    expect(String(logRow.changed_by ?? logRow.actor_id)).toBe(String(adminId));
    expect(Number(logRow.new_value ?? logRow.novo_valor)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Regra de negócio: nunca remover admin do último admin ativo
// ---------------------------------------------------------------------------
describe('proteção do último admin ativo', () => {
  test('tentar revogar permissão administrativa do único admin ativo é bloqueado com erro claro', async () => {
    expect(permissionsUtil).not.toBeNull();
    expect(typeof permissionsUtil.setMemberPermissionOverride).toBe('function');

    const onlyAdminId = insertMember({ role: 'admin' });

    await expect(
      permissionsUtil.setMemberPermissionOverride({
        actorId: onlyAdminId,
        memberId: onlyAdminId,
        code: 'configuracoes.gerenciar',
        allowed: 0
      })
    ).rejects.toMatchObject({
      status: expect.any(Number)
    });

    // Garante que o bloqueio não é um 500 genérico de erro inesperado.
    try {
      await permissionsUtil.setMemberPermissionOverride({
        actorId: onlyAdminId,
        memberId: onlyAdminId,
        code: 'configuracoes.gerenciar',
        allowed: 0
      });
    } catch (error) {
      expect(error.status).not.toBe(500);
    }

    // Nenhum registro de auditoria deve ter sido criado para a tentativa bloqueada.
    const logRow = await queryOne(
      'SELECT * FROM permission_audit_log WHERE member_id = ? AND permission_code = ?',
      [onlyAdminId, 'configuracoes.gerenciar']
    );
    expect(logRow).toBeFalsy();
  });

  test('apenas admin pode chamar o serviço que altera permissões de outros membros', async () => {
    expect(permissionsUtil).not.toBeNull();
    const viewerActorId = insertMember({ role: 'viewer' });
    const targetId = insertMember({ role: 'viewer' });

    await expect(
      permissionsUtil.setMemberPermissionOverride({
        actorId: viewerActorId,
        memberId: targetId,
        code: 'pagamentos.criar',
        allowed: 1
      })
    ).rejects.toMatchObject({ status: 403 });
  });
});
