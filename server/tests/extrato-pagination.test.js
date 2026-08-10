const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertExpense } = require('./helpers');

describe('GET /api/extrato — paginação', () => {
  beforeEach(() => {
    cleanAll();
  });

  it('pagina entries ordenadas por data, mantendo summary sobre o conjunto completo', async () => {
    const dates = ['2024-01-05', '2024-01-10', '2024-01-15', '2024-01-20', '2024-01-25'];
    dates.forEach((expense_date, index) => {
      insertExpense({ title: `Despesa ${index + 1}`, amount: 10 * (index + 1), expense_date });
    });

    const page1 = await request(app)
      .get('/api/extrato')
      .query({ type: 'despesa', page: 1, pageSize: 2 })
      .set(auth(tokens.admin()));

    expect(page1.status).toBe(200);
    expect(page1.body.ok).toBe(true);
    expect(page1.body.total).toBe(5);
    expect(page1.body.page).toBe(1);
    expect(page1.body.pageSize).toBe(2);
    expect(page1.body.entries).toHaveLength(2);
    expect(page1.body.entries.map((e) => e.date)).toEqual(['2024-01-05', '2024-01-10']);

    const page2 = await request(app)
      .get('/api/extrato')
      .query({ type: 'despesa', page: 2, pageSize: 2 })
      .set(auth(tokens.admin()));

    expect(page2.body.total).toBe(5);
    expect(page2.body.page).toBe(2);
    expect(page2.body.entries).toHaveLength(2);
    expect(page2.body.entries.map((e) => e.date)).toEqual(['2024-01-15', '2024-01-20']);

    // Summary representa o extrato inteiro filtrado, não apenas a página exibida.
    expect(page1.body.summary).toEqual(page2.body.summary);
    expect(page1.body.summary.count).toBe(5);
    expect(page1.body.summary.totalExpense).toBe(10 + 20 + 30 + 40 + 50);
  });
});
