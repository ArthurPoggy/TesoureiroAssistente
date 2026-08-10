const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertPayment, insertExpense } = require('./helpers');

// Cobre a padronização do tratamento de erros/validação nas rotas críticas
// (auth, payments, expenses): toda resposta de erro deve ter o formato
// { ok: false, message } e as validações de campos obrigatórios aplicadas
// no POST devem valer também no PUT dos mesmos recursos.

describe('Padronização de respostas de erro — rotas críticas', () => {
  beforeEach(() => cleanAll());

  it('POST /api/auth/login com campos ausentes retorna formato padrão de erro', async () => {
    const res = await request(app).post('/api/login').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, message: expect.any(String) });
  });

  it('PUT /api/payments/:id sem amount retorna a mesma mensagem de validação do POST (não erro cru de banco)', async () => {
    const memberId = insertMember({ name: 'Carlos' });
    const paymentId = insertPayment(memberId, { amount: 100 });

    const postRes = await request(app)
      .post('/api/payments')
      .set(auth(tokens.admin()))
      .send({ month: 1, year: 2025 });

    const putRes = await request(app)
      .put(`/api/payments/${paymentId}`)
      .set(auth(tokens.admin()))
      .send({ paid: true, notes: 'sem valor informado' });

    expect(putRes.status).toBe(400);
    expect(putRes.body).toEqual({ ok: false, message: expect.any(String) });
    expect(putRes.body.message).not.toMatch(/constraint|SQLITE|sqlite/i);
    expect(putRes.body.message).toBe(postRes.body.message);
  });

  it('PUT /api/expenses/:id sem title/amount/expenseDate retorna a mesma mensagem de validação do POST (não erro cru de banco)', async () => {
    const expense = insertExpense({ title: 'Original', amount: 50 });

    const postRes = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({ notes: 'sem campos obrigatórios' });

    const putRes = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({ notes: 'atualização sem campos obrigatórios' });

    expect(putRes.status).toBe(400);
    expect(putRes.body).toEqual({ ok: false, message: expect.any(String) });
    expect(putRes.body.message).not.toMatch(/constraint|SQLITE|sqlite/i);
    expect(putRes.body.message).toBe(postRes.body.message);
  });

  it('todas as respostas de erro das rotas críticas seguem o mesmo formato { ok: false, message }', async () => {
    const cases = [
      () => request(app).post('/api/register').send({}),
      () => request(app).post('/api/payments').set(auth(tokens.admin())).send({}),
      () => request(app).post('/api/expenses').set(auth(tokens.admin())).send({}),
      () => request(app).get('/api/payments/999999/pix').set(auth(tokens.admin())),
      () => request(app).delete('/api/expenses/999999').set(auth(tokens.viewer())),
    ];

    for (const makeRequest of cases) {
      const res = await makeRequest();
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(Object.keys(res.body).sort()).toEqual(['message', 'ok']);
      expect(res.body.ok).toBe(false);
      expect(typeof res.body.message).toBe('string');
    }
  });
});
