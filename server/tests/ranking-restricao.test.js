const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertPayment } = require('./helpers');

beforeEach(() => cleanAll());

// Garante que a restrição do ranking/inadimplência ao tesoureiro (admin ou
// diretor_financeiro) realmente impede o viewer de ver QUALQUER dado — não
// basta retornar 403, o corpo não pode vazar nomes nem o array de ranking.
describe('Restrição do ranking — sem vazamento de dados para viewer', () => {
  test('GET /api/ranking: 403 para viewer não retorna o array de ranking', async () => {
    const m1 = insertMember({ name: 'Alice' });
    insertPayment(m1, { month: 1, year: 2025 });

    const res = await request(app)
      .get('/api/ranking')
      .set(auth(tokens.viewer()));

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
    expect(res.body.ranking).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Alice');
  });

  test('GET /api/members/delinquent: 403 para viewer não retorna membros', async () => {
    insertMember({ name: 'Devedor' });

    const res = await request(app)
      .get('/api/members/delinquent?month=1&year=2025')
      .set(auth(tokens.viewer()));

    expect(res.status).toBe(403);
    expect(res.body.members).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Devedor');
  });

  test('ambos os papéis privilegiados (admin e diretor) recebem o mesmo acesso', async () => {
    const m1 = insertMember({ name: 'Alice' });
    insertPayment(m1, { month: 1, year: 2025 });

    const adminRes = await request(app).get('/api/ranking').set(auth(tokens.admin()));
    const diretorRes = await request(app).get('/api/ranking').set(auth(tokens.diretor()));

    expect(adminRes.status).toBe(200);
    expect(diretorRes.status).toBe(200);
    expect(Array.isArray(adminRes.body.ranking)).toBe(true);
    expect(Array.isArray(diretorRes.body.ranking)).toBe(true);
  });
});
