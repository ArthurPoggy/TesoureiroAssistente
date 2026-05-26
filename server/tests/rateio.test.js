const request = require('supertest');
const app = require('../app');
const { computeRateio } = require('../utils/rateio');
const { tokens, auth, cleanAll, insertMember, insertExpense } = require('./helpers');

describe('utils/rateio — computeRateio', () => {
  it('divide igualmente quando o valor é divisível', () => {
    const shares = computeRateio(90, [1, 2, 3]);
    expect(shares).toEqual([
      { memberId: 1, amount: 30 },
      { memberId: 2, amount: 30 },
      { memberId: 3, amount: 30 }
    ]);
  });

  it('distribui os centavos restantes entre os primeiros membros', () => {
    const shares = computeRateio(100, [1, 2, 3]);
    expect(shares.map((s) => s.amount)).toEqual([33.34, 33.33, 33.33]);
    const soma = shares.reduce((acc, s) => acc + s.amount, 0);
    expect(Math.round(soma * 100) / 100).toBe(100);
  });

  it('a soma das cotas é sempre igual ao total', () => {
    const shares = computeRateio(57.77, [1, 2, 3, 4, 5, 6, 7]);
    const somaCents = shares.reduce((acc, s) => acc + Math.round(s.amount * 100), 0);
    expect(somaCents).toBe(5777);
  });

  it('retorna lista vazia sem participantes', () => {
    expect(computeRateio(100, [])).toEqual([]);
  });
});

describe('POST /api/expenses/:id/rateio', () => {
  beforeEach(() => cleanAll());

  it('retorna 401 sem token', async () => {
    const res = await request(app).post('/api/expenses/1/rateio').send({ participantIds: [1] });
    expect(res.status).toBe(401);
  });

  it('retorna 400 sem participantes', async () => {
    const expense = insertExpense({ amount: 100 });
    const res = await request(app)
      .post(`/api/expenses/${expense.id}/rateio`)
      .set(auth(tokens.admin()))
      .send({ participantIds: [] });
    expect(res.status).toBe(400);
  });

  it('retorna 404 para despesa inexistente', async () => {
    const res = await request(app)
      .post('/api/expenses/999999/rateio')
      .set(auth(tokens.admin()))
      .send({ participantIds: [1] });
    expect(res.status).toBe(404);
  });

  it('calcula o rateio da despesa entre os participantes', async () => {
    const m1 = insertMember({ name: 'Ana' });
    const m2 = insertMember({ name: 'Bruno' });
    const expense = insertExpense({ amount: 100, title: 'Van do acampamento' });

    const res = await request(app)
      .post(`/api/expenses/${expense.id}/rateio`)
      .set(auth(tokens.admin()))
      .send({ participantIds: [m1, m2] });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(100);
    expect(res.body.perMember).toHaveLength(2);
    const soma = res.body.perMember.reduce((acc, p) => acc + p.amount, 0);
    expect(Math.round(soma * 100) / 100).toBe(100);
    expect(res.body.perMember[0]).toHaveProperty('name');
  });

  it('ignora ids duplicados de participante', async () => {
    const m1 = insertMember({ name: 'Ana' });
    const expense = insertExpense({ amount: 50 });
    const res = await request(app)
      .post(`/api/expenses/${expense.id}/rateio`)
      .set(auth(tokens.admin()))
      .send({ participantIds: [m1, m1] });
    expect(res.body.perMember).toHaveLength(1);
    expect(res.body.perMember[0].amount).toBe(50);
  });
});
