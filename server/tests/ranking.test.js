const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertPayment } = require('./helpers');

beforeEach(() => cleanAll());

// ---------------------------------------------------------------------------
// GET /api/ranking
// ---------------------------------------------------------------------------
describe('GET /api/ranking', () => {
  test('401 sem token', async () => {
    const res = await request(app).get('/api/ranking');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('403 viewer não pode acessar o ranking', async () => {
    const res = await request(app)
      .get('/api/ranking')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('200 admin acessa ranking', async () => {
    const res = await request(app)
      .get('/api/ranking')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.ranking).toBeInstanceOf(Array);
  });

  test('200 diretor_financeiro acessa ranking', async () => {
    const res = await request(app)
      .get('/api/ranking')
      .set(auth(tokens.diretor()));
    expect(res.status).toBe(200);
    expect(res.body.ranking).toBeInstanceOf(Array);
  });

  test('ranking retorna membros ordenados por pagamentos', async () => {
    const m1 = insertMember({ name: 'Alice' });
    const m2 = insertMember({ name: 'Bob' });
    insertPayment(m1, { month: 1, year: 2025 });
    insertPayment(m1, { month: 2, year: 2025 });
    insertPayment(m1, { month: 3, year: 2025 });
    insertPayment(m2, { month: 1, year: 2025 });

    const res = await request(app)
      .get('/api/ranking')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.ranking[0].name).toBe('Alice');
    expect(res.body.ranking[0].payments).toBe(3);
    expect(res.body.ranking[1].name).toBe('Bob');
    expect(res.body.ranking[1].payments).toBe(1);
  });

  test('ranking filtra por ano quando informado', async () => {
    const m1 = insertMember({ name: 'Carlos' });
    insertPayment(m1, { month: 1, year: 2024 });
    insertPayment(m1, { month: 1, year: 2025 });

    const res = await request(app)
      .get('/api/ranking?year=2025')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    const entry = res.body.ranking.find((r) => r.name === 'Carlos');
    expect(entry.payments).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// GET /api/members/delinquent
// ---------------------------------------------------------------------------
describe('GET /api/members/delinquent', () => {
  test('401 sem token', async () => {
    const res = await request(app).get('/api/members/delinquent');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('403 viewer não pode acessar inadimplentes', async () => {
    const res = await request(app)
      .get('/api/members/delinquent')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('200 admin acessa lista de inadimplentes', async () => {
    const res = await request(app)
      .get('/api/members/delinquent')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.members).toBeInstanceOf(Array);
  });

  test('200 diretor_financeiro acessa lista de inadimplentes', async () => {
    const res = await request(app)
      .get('/api/members/delinquent')
      .set(auth(tokens.diretor()));
    expect(res.status).toBe(200);
    expect(res.body.members).toBeInstanceOf(Array);
  });

  test('membro sem pagamento aparece como inadimplente', async () => {
    insertMember({ name: 'Devedor' });

    const res = await request(app)
      .get('/api/members/delinquent?month=1&year=2025')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.members.some((m) => m.name === 'Devedor')).toBe(true);
  });

  test('membro que pagou não aparece como inadimplente no mesmo mês', async () => {
    const id = insertMember({ name: 'Pontual' });
    insertPayment(id, { month: 1, year: 2025, paid: 1 });

    const res = await request(app)
      .get('/api/members/delinquent?month=1&year=2025')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.members.some((m) => m.name === 'Pontual')).toBe(false);
  });
});
