// Cobre a subtask "Backend: aceitar e retornar payment_method na rota de
// despesas" (parte da tarefa "Registrar forma de pagamento da despesa").
//
// Expectativa: POST/PUT /api/expenses aceitam payment_method opcional,
// validando (quando enviado) que é um dos valores fixos aceitos; GET
// /api/expenses retorna payment_method no payload.
const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertExpense } = require('./helpers');

describe('POST/PUT /api/expenses — payment_method', () => {
  beforeEach(() => {
    cleanAll();
  });

  it('cria despesa com payment_method válido, persiste e retorna o campo', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({
        title: 'Despesa com pix',
        amount: 50,
        expenseDate: '2025-05-01',
        paymentMethod: 'pix'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expense.payment_method).toBe('pix');

    const check = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));
    const stored = check.body.expenses.find((e) => e.title === 'Despesa com pix');
    expect(stored).toBeDefined();
    expect(stored.payment_method).toBe('pix');
  });

  it('rejeita criação com payment_method fora da lista de valores aceitos', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({
        title: 'Despesa inválida',
        amount: 50,
        expenseDate: '2025-05-02',
        paymentMethod: 'boleto'
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);

    const check = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));
    expect(check.body.expenses.find((e) => e.title === 'Despesa inválida')).toBeUndefined();
  });

  it('cria despesa sem payment_method normalmente (campo opcional)', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({ title: 'Despesa sem forma de pagamento', amount: 30, expenseDate: '2025-05-03' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expense.payment_method).toBeFalsy();
  });

  it('atualiza despesa existente definindo payment_method válido', async () => {
    const expense = insertExpense({ amount: 100 });

    const res = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expense_date,
        paymentMethod: 'cartao'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expense.payment_method).toBe('cartao');
  });

  it('limpa payment_method quando a edição envia o campo vazio', async () => {
    const expense = insertExpense({ amount: 100, paymentMethod: 'pix' });

    const res = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expense_date,
        paymentMethod: ''
      });

    expect(res.status).toBe(200);
    expect(res.body.expense.payment_method).toBeNull();

    const check = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));
    const stored = check.body.expenses.find((e) => e.id === expense.id);
    expect(stored.payment_method).toBeNull();
  });

  it('rejeita atualização com payment_method fora da lista de valores aceitos', async () => {
    const expense = insertExpense({ amount: 100 });

    const res = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expense_date,
        paymentMethod: 'invalido'
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('GET /api/expenses retorna payment_method no payload de cada despesa', async () => {
    insertExpense({ amount: 20, paymentMethod: 'dinheiro' });

    const res = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.expenses[0]).toHaveProperty('payment_method');
  });
});
