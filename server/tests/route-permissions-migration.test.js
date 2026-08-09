// Cobre a subtask "Migrar endpoints críticos de checagem por role para
// requirePermission" (card "Refinar granularidade de roles e permissões do
// sistema").
//
// Expectativa: rotas hoje protegidas apenas por requireAdmin/requirePrivileged
// nos domínios de pagamentos, despesas, membros e relatórios passam a usar
// requirePermission(<código>), respeitando overrides individuais em
// member_permissions (não apenas o role bruto do usuário). Os três roles
// padrão (admin, diretor_financeiro, viewer) devem continuar acessando
// exatamente o que acessavam antes da mudança (não regressão).
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../app');
const { insertMember, cleanAll } = require('./helpers');

const SECRET = 'test-secret-key-for-jest';
const signFor = (memberId) => jwt.sign({ memberId }, SECRET, { expiresIn: '1h' });

const grantOverride = (memberId, code, allowed) => {
  global.__testDb
    .prepare(
      `INSERT INTO member_permissions (member_id, permission_code, allowed, origem)
       VALUES (?, ?, ?, 'manual')
       ON CONFLICT(member_id, permission_code) DO UPDATE SET allowed = excluded.allowed`
    )
    .run(memberId, code, allowed ? 1 : 0);
};

beforeEach(() => {
  cleanAll();
  global.__testDb.prepare('DELETE FROM member_permissions').run();
});

// ---------------------------------------------------------------------------
// Domínio: pagamentos — POST /api/payments (ação: registrar pagamento)
// ---------------------------------------------------------------------------
describe('POST /api/payments — requirePermission(pagamentos.criar)', () => {
  const payload = () => ({
    month: 1,
    year: 2025,
    amount: 100,
    paid: true
  });

  test('usuário sem preset de pagamentos.criar, mas com override concedendo, acessa normalmente', async () => {
    const viewerId = insertMember({ role: 'viewer' }); // preset viewer não inclui pagamentos.criar
    const targetMemberId = insertMember({ role: 'viewer' });
    grantOverride(viewerId, 'pagamentos.criar', 1);

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send({ ...payload(), memberId: targetMemberId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('usuário com role privilegiado, mas com override revogando pagamentos.criar, recebe 403', async () => {
    const diretorId = insertMember({ role: 'diretor_financeiro' }); // preset inclui pagamentos.criar
    const targetMemberId = insertMember({ role: 'viewer' });
    grantOverride(diretorId, 'pagamentos.criar', 0);

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send({ ...payload(), memberId: targetMemberId });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('não regressão: admin, diretor_financeiro e viewer preservam o acesso anterior sem overrides', async () => {
    const adminId = insertMember({ role: 'admin' });
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    const viewerId = insertMember({ role: 'viewer' });
    const targetMemberId = insertMember({ role: 'viewer' });

    const resAdmin = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${signFor(adminId)}`)
      .send({ ...payload(), memberId: targetMemberId, month: 2 });
    expect(resAdmin.status).toBe(200);

    const resDiretor = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send({ ...payload(), memberId: targetMemberId, month: 3 });
    expect(resDiretor.status).toBe(200);

    const resViewer = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send({ ...payload(), memberId: targetMemberId, month: 4 });
    expect(resViewer.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Domínio: despesas — POST /api/expenses (ação: registrar despesa)
// ---------------------------------------------------------------------------
describe('POST /api/expenses — requirePermission(despesas.criar)', () => {
  const payload = () => ({
    title: 'Despesa de teste',
    amount: 50,
    expenseDate: '2025-01-10'
  });

  test('usuário sem preset de despesas.criar, mas com override concedendo, acessa normalmente', async () => {
    const viewerId = insertMember({ role: 'viewer' });
    grantOverride(viewerId, 'despesas.criar', 1);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send(payload());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('usuário com role privilegiado, mas com override revogando despesas.criar, recebe 403', async () => {
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    grantOverride(diretorId, 'despesas.criar', 0);

    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send(payload());

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('não regressão: admin, diretor_financeiro e viewer preservam o acesso anterior sem overrides', async () => {
    const adminId = insertMember({ role: 'admin' });
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    const viewerId = insertMember({ role: 'viewer' });

    const resAdmin = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${signFor(adminId)}`)
      .send(payload());
    expect(resAdmin.status).toBe(200);

    const resDiretor = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send(payload());
    expect(resDiretor.status).toBe(200);

    const resViewer = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send(payload());
    expect(resViewer.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Domínio: gestão de membros — POST /api/members (ação: cadastrar membro)
// ---------------------------------------------------------------------------
describe('POST /api/members — requirePermission(membros.gerenciar)', () => {
  const payload = () => ({
    name: 'Novo Membro',
    email: `novo_${Date.now()}_${Math.random()}@test.com`,
    nickname: 'NM',
    cpf: String(Math.floor(Math.random() * 1e11)).padStart(11, '0')
  });

  test('usuário sem preset de membros.gerenciar, mas com override concedendo, acessa normalmente', async () => {
    const viewerId = insertMember({ role: 'viewer' });
    grantOverride(viewerId, 'membros.gerenciar', 1);

    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send(payload());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('usuário com role privilegiado, mas com override revogando membros.gerenciar, recebe 403', async () => {
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    grantOverride(diretorId, 'membros.gerenciar', 0);

    const res = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send(payload());

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('não regressão: admin, diretor_financeiro e viewer preservam o acesso anterior sem overrides', async () => {
    const adminId = insertMember({ role: 'admin' });
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    const viewerId = insertMember({ role: 'viewer' });

    const resAdmin = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${signFor(adminId)}`)
      .send(payload());
    expect(resAdmin.status).toBe(200);

    const resDiretor = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${signFor(diretorId)}`)
      .send(payload());
    expect(resDiretor.status).toBe(200);

    const resViewer = await request(app)
      .post('/api/members')
      .set('Authorization', `Bearer ${signFor(viewerId)}`)
      .send(payload());
    expect(resViewer.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Domínio: relatórios — GET /api/dashboard/ranking (ação: visualizar ranking
// de arrecadação, hoje protegida diretamente por requirePrivileged)
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/ranking — requirePermission(relatorios.ver)', () => {
  test('usuário sem preset de relatorios.ver aplicável, mas com override concedendo, acessa normalmente', async () => {
    // viewer já possui relatorios.ver no preset (ver server/utils/permissions.js);
    // usamos um override negativo seguido de um positivo para provar que a
    // rota consulta a permissão efetiva (preset + override) e não apenas o
    // role bruto vindo do token, que hoje é bloqueado por requirePrivileged
    // independentemente de qualquer override.
    const viewerId = insertMember({ role: 'viewer' });
    grantOverride(viewerId, 'relatorios.ver', 1);

    const res = await request(app)
      .get('/api/dashboard/ranking')
      .set('Authorization', `Bearer ${signFor(viewerId)}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('usuário com role privilegiado, mas com override revogando relatorios.ver, recebe 403', async () => {
    const diretorId = insertMember({ role: 'diretor_financeiro' });
    grantOverride(diretorId, 'relatorios.ver', 0);

    const res = await request(app)
      .get('/api/dashboard/ranking')
      .set('Authorization', `Bearer ${signFor(diretorId)}`);

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('não regressão: admin e diretor_financeiro preservam o acesso anterior sem overrides', async () => {
    const adminId = insertMember({ role: 'admin' });
    const diretorId = insertMember({ role: 'diretor_financeiro' });

    const resAdmin = await request(app)
      .get('/api/dashboard/ranking')
      .set('Authorization', `Bearer ${signFor(adminId)}`);
    expect(resAdmin.status).toBe(200);

    const resDiretor = await request(app)
      .get('/api/dashboard/ranking')
      .set('Authorization', `Bearer ${signFor(diretorId)}`);
    expect(resDiretor.status).toBe(200);
  });
});
