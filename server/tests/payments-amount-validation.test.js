const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertPayment } = require('./helpers');

describe('POST/PUT /api/payments — validação de valores', () => {
  beforeEach(() => {
    cleanAll();
  });

  it('rejeita criação de pagamento com valor negativo', async () => {
    const memberId = insertMember();
    const res = await request(app)
      .post('/api/payments')
      .set(auth(tokens.admin()))
      .send({ memberId, month: 3, year: 2025, amount: -50, paid: true });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);

    const check = await request(app)
      .get('/api/payments')
      .query({ memberId, month: 3, year: 2025 })
      .set(auth(tokens.admin()));
    expect(check.body.payments.find((p) => p.member_id === memberId)).toBeUndefined();
  });

  it('rejeita criação de pagamento com valor não numérico', async () => {
    const memberId = insertMember();
    const res = await request(app)
      .post('/api/payments')
      .set(auth(tokens.admin()))
      .send({ memberId, month: 4, year: 2025, amount: 'abc', paid: true });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejeita atualização de pagamento existente com valor negativo', async () => {
    const memberId = insertMember();
    const paymentId = insertPayment(memberId, { amount: 100 });

    const res = await request(app)
      .put(`/api/payments/${paymentId}`)
      .set(auth(tokens.admin()))
      .send({ amount: -10, paid: true });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);

    const unchanged = await request(app)
      .get(`/api/payments/history/${memberId}`)
      .set(auth(tokens.admin()));
    const stored = unchanged.body.payments.find((p) => p.id === paymentId);
    expect(Number(stored.amount)).toBe(100);
  });
});
