const { migrations } = require('../db/migrations');
const { query, queryOne } = require('../db/query');
const { insertMember, cleanAll } = require('./helpers');

let permissions;
try {
  // Módulo esperado pela subtask "Modelar schema de permissões e presets de role":
  // deve exportar o catálogo de permissões, os presets por role e uma função
  // para calcular as permissões efetivas de um membro (preset + overrides).
  permissions = require('../utils/permissions');
} catch (e) {
  permissions = null;
}

beforeEach(() => cleanAll());

// ---------------------------------------------------------------------------
// Schema: tabelas permissions e member_permissions
// ---------------------------------------------------------------------------
describe('schema de permissões (permissions / member_permissions)', () => {
  test('migração cria a tabela permissions com o catálogo de permissões', async () => {
    const rows = await query('SELECT code, name, category FROM permissions');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty('code');
    expect(rows[0]).toHaveProperty('name');
    expect(rows[0]).toHaveProperty('category');
  });

  test('migração é idempotente: rodar as migrações duas vezes não duplica o catálogo de permissões', async () => {
    const before = await query('SELECT code FROM permissions');
    const countBefore = before.length;
    expect(countBefore).toBeGreaterThan(0);

    // Simula uma segunda aplicação das migrações sobre o banco já existente.
    migrations.forEach((sql) => {
      try {
        global.__testDb.prepare(sql).run();
      } catch (e) {
        if (!/duplicate column|already exists/i.test(e.message)) {
          throw e;
        }
      }
    });

    const after = await query('SELECT code FROM permissions');
    expect(after.length).toBe(countBefore);

    const codes = after.map((r) => r.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  test('member_permissions aceita overrides sem exigir customização prévia', async () => {
    const memberId = insertMember({ role: 'viewer' });
    await execInsertOverride(memberId, 'pagamentos.criar', 1, 'manual');

    const row = await queryOne(
      'SELECT member_id, permission_code, allowed, origem FROM member_permissions WHERE member_id = ? AND permission_code = ?',
      [memberId, 'pagamentos.criar']
    );
    expect(row).toBeTruthy();
    expect(Number(row.allowed)).toBe(1);
  });
});

async function execInsertOverride(memberId, code, allowed, origem) {
  const { execute } = require('../db/query');
  await execute(
    'INSERT INTO member_permissions (member_id, permission_code, allowed, origem) VALUES (?, ?, ?, ?)',
    [memberId, code, allowed, origem]
  );
}

// ---------------------------------------------------------------------------
// Presets de role e permissões efetivas
// ---------------------------------------------------------------------------
describe('presets de role e permissões efetivas', () => {
  test('server/utils/permissions.js existe e expõe os presets por role', () => {
    expect(permissions).not.toBeNull();
    expect(permissions.ROLE_PRESETS).toBeTruthy();
    expect(Array.isArray(permissions.ROLE_PRESETS.admin)).toBe(true);
    expect(Array.isArray(permissions.ROLE_PRESETS.diretor_financeiro)).toBe(true);
    expect(Array.isArray(permissions.ROLE_PRESETS.viewer)).toBe(true);
  });

  test('admin sem overrides tem acesso a todas as permissões do catálogo (preset)', async () => {
    expect(permissions).not.toBeNull();
    const memberId = insertMember({ role: 'admin' });
    const catalog = await query('SELECT code FROM permissions');

    const effective = await permissions.getEffectivePermissions(memberId);
    const effectiveCodes = new Set(effective);

    catalog.forEach(({ code }) => {
      expect(effectiveCodes.has(code)).toBe(true);
    });
  });

  test('viewer sem overrides só tem permissões de leitura, conforme preset', async () => {
    expect(permissions).not.toBeNull();
    const memberId = insertMember({ role: 'viewer' });

    const effective = await permissions.getEffectivePermissions(memberId);
    const preset = permissions.ROLE_PRESETS.viewer;

    expect(new Set(effective)).toEqual(new Set(preset));
    // Viewer não deve ter nenhuma permissão de escrita típica de diretor/admin.
    expect(effective).not.toEqual(expect.arrayContaining(['pagamentos.criar']));
  });

  test('diretor_financeiro sem overrides tem exatamente o preset financeiro', async () => {
    expect(permissions).not.toBeNull();
    const memberId = insertMember({ role: 'diretor_financeiro' });

    const effective = await permissions.getEffectivePermissions(memberId);
    const preset = permissions.ROLE_PRESETS.diretor_financeiro;

    expect(new Set(effective)).toEqual(new Set(preset));
  });
});
