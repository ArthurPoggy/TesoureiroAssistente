const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertExpense } = require('./helpers');

describe('POST/PUT /api/expenses — validação de valores', () => {
  beforeEach(() => {
    cleanAll();
  });

  it('rejeita criação de despesa com valor negativo', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({ title: 'Despesa inválida', amount: -50, expenseDate: '2025-03-01' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);

    const check = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));
    expect(check.body.expenses.find((e) => e.title === 'Despesa inválida')).toBeUndefined();
  });

  it('rejeita criação de despesa com valor não numérico', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({ title: 'Despesa inválida', amount: 'abc', expenseDate: '2025-04-01' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('rejeita atualização de despesa existente com valor negativo', async () => {
    const expense = insertExpense({ amount: 100 });

    const res = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({ title: expense.title, amount: -10, expenseDate: expense.expense_date });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);

    const unchanged = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));
    const stored = unchanged.body.expenses.find((e) => e.id === expense.id);
    expect(Number(stored.amount)).toBe(100);
  });
});
