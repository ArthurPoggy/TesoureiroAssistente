const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertPayment, insertProject, linkMemberProject } = require('./helpers');

beforeEach(() => cleanAll());

// ---------------------------------------------------------------------------
// GET /api/members/:id/summary
// ---------------------------------------------------------------------------
describe('GET /api/members/:id/summary', () => {
  test('401 sem token', async () => {
    const id = insertMember();
    const res = await request(app).get(`/api/members/${id}/summary`);
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('403 viewer não pode acessar', async () => {
    const id = insertMember();
    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('404 membro inexistente', async () => {
    const res = await request(app)
      .get('/api/members/9999/summary')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(404);
  });

  test('200 admin acessa summary', async () => {
    const id = insertMember({ name: 'Guilherme' });
    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.member.name).toBe('Guilherme');
  });

  test('200 diretor_financeiro pode acessar', async () => {
    const id = insertMember({ name: 'Rafael' });
    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.diretor()));
    expect(res.status).toBe(200);
    expect(res.body.member.name).toBe('Rafael');
  });

  test('dados pessoais retornados corretamente', async () => {
    const id = insertMember({ name: 'Fernanda', nickname: 'Fer', email: 'fer@test.com' });
    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));

    const { member } = res.body;
    expect(member.name).toBe('Fernanda');
    expect(member.nickname).toBe('Fer');
    expect(member.email).toBe('fer@test.com');
    expect(member).toHaveProperty('active');
    expect(member).toHaveProperty('role');
    expect(member).toHaveProperty('joined_at');
  });

  // -------------------------------------------------------------------------
  // Pagamentos
  // -------------------------------------------------------------------------
  test('total de pagamentos é zero quando membro não tem pagamentos', async () => {
    const id = insertMember();
    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.payments.total).toBe(0);
    expect(res.body.payments.totalAmount).toBe(0);
    expect(res.body.payments.lastPayment).toBeNull();
  });

  test('total de pagamentos reflete registros no banco', async () => {
    const id = insertMember();
    insertPayment(id, { month: 1, year: 2025, amount: 100 });
    insertPayment(id, { month: 2, year: 2025, amount: 120 });
    insertPayment(id, { month: 3, year: 2025, amount: 80 });

    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.payments.total).toBe(3);
    expect(res.body.payments.totalAmount).toBeCloseTo(300);
  });

  test('lastPayment aponta para o pagamento mais recente', async () => {
    const id = insertMember();
    insertPayment(id, { month: 1, year: 2024, amount: 100 });
    insertPayment(id, { month: 6, year: 2025, amount: 100 });
    insertPayment(id, { month: 3, year: 2025, amount: 100 });

    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.payments.lastPayment.year).toBe(2025);
    expect(res.body.payments.lastPayment.month).toBe(6);
  });

  test('pagamentos de outros membros não contaminam o total', async () => {
    const id1 = insertMember({ name: 'Membro A' });
    const id2 = insertMember({ name: 'Membro B' });
    insertPayment(id1, { month: 1, year: 2025, amount: 200 });
    insertPayment(id2, { month: 1, year: 2025, amount: 500 });

    const res = await request(app)
      .get(`/api/members/${id1}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.payments.total).toBe(1);
    expect(res.body.payments.totalAmount).toBeCloseTo(200);
  });

  // -------------------------------------------------------------------------
  // Projetos ativos
  // -------------------------------------------------------------------------
  test('activeProjects é lista vazia quando membro não está em nenhum projeto', async () => {
    const id = insertMember();
    insertProject({ name: 'Projeto Sem Membro', status: 'active' });

    const res = await request(app)
      .get(`/api/members/${id}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.activeProjects).toEqual([]);
  });

  test('retorna projetos ativos do membro', async () => {
    const memberId = insertMember({ name: 'Lucas' });
    const projectId = insertProject({ name: 'Projeto Ativo', status: 'active' });
    linkMemberProject(memberId, projectId);

    const res = await request(app)
      .get(`/api/members/${memberId}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.activeProjects).toHaveLength(1);
    expect(res.body.activeProjects[0].name).toBe('Projeto Ativo');
  });

  test('projetos inativos não aparecem em activeProjects', async () => {
    const memberId = insertMember();
    const activeId = insertProject({ name: 'Ativo', status: 'active' });
    const inactiveId = insertProject({ name: 'Inativo', status: 'inactive' });
    linkMemberProject(memberId, activeId);
    linkMemberProject(memberId, inactiveId);

    const res = await request(app)
      .get(`/api/members/${memberId}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.activeProjects).toHaveLength(1);
    expect(res.body.activeProjects[0].name).toBe('Ativo');
  });

  test('membro pode estar em múltiplos projetos ativos', async () => {
    const memberId = insertMember();
    const p1 = insertProject({ name: 'Projeto 1', status: 'active' });
    const p2 = insertProject({ name: 'Projeto 2', status: 'active' });
    const p3 = insertProject({ name: 'Projeto 3', status: 'active' });
    linkMemberProject(memberId, p1);
    linkMemberProject(memberId, p2);
    linkMemberProject(memberId, p3);

    const res = await request(app)
      .get(`/api/members/${memberId}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.activeProjects).toHaveLength(3);
  });

  test('projetos de outros membros não aparecem no summary', async () => {
    const m1 = insertMember({ name: 'Beatriz' });
    const m2 = insertMember({ name: 'Outro' });
    const p1 = insertProject({ name: 'Projeto de Beatriz', status: 'active' });
    const p2 = insertProject({ name: 'Projeto do Outro', status: 'active' });
    linkMemberProject(m1, p1);
    linkMemberProject(m2, p2);

    const res = await request(app)
      .get(`/api/members/${m1}/summary`)
      .set(auth(tokens.admin()));

    expect(res.body.activeProjects).toHaveLength(1);
    expect(res.body.activeProjects[0].name).toBe('Projeto de Beatriz');
  });

  // -------------------------------------------------------------------------
  // Combinação: dados completos
  // -------------------------------------------------------------------------
  test('summary completo retorna member + payments + activeProjects juntos', async () => {
    const memberId = insertMember({ name: 'Completo' });
    insertPayment(memberId, { month: 1, year: 2025, amount: 150 });
    insertPayment(memberId, { month: 2, year: 2025, amount: 150 });
    const projectId = insertProject({ name: 'Projeto Completo', status: 'active' });
    linkMemberProject(memberId, projectId);

    const res = await request(app)
      .get(`/api/members/${memberId}/summary`)
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.member.name).toBe('Completo');
    expect(res.body.payments.total).toBe(2);
    expect(res.body.payments.totalAmount).toBeCloseTo(300);
    expect(res.body.activeProjects).toHaveLength(1);
    expect(res.body.activeProjects[0].name).toBe('Projeto Completo');
  });
});
