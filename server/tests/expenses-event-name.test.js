const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, db } = require('./helpers');

// Cobre o vínculo despesa -> evento: a caixa de detalhes da despesa
// (ExpenseDetailView.jsx) lê `expense.event_name`, então as rotas de
// expenses precisam retornar esse campo (via JOIN com events) sempre que a
// despesa tiver `event_id` preenchido. Sem isso, "Evento vinculado" aparece
// como "Nenhum" mesmo quando a despesa está de fato vinculada a um evento.

const insertEvent = (overrides = {}) => {
  const defaults = { name: 'Acampamento de inverno', event_date: '2025-06-01' };
  const e = { ...defaults, ...overrides };
  const result = db()
    .prepare('INSERT INTO events (name, event_date) VALUES (?, ?)')
    .run(e.name, e.event_date);
  return result.lastInsertRowid;
};

describe('GET/POST/PUT /api/expenses — nome do evento vinculado', () => {
  beforeEach(() => {
    cleanAll();
    db().prepare('DELETE FROM events').run();
  });

  it('GET /api/expenses retorna event_name para despesa com event_id preenchido', async () => {
    const eventId = insertEvent({ name: 'Acampamento de inverno' });
    db()
      .prepare(
        `INSERT INTO expenses (title, amount, expense_date, event_id)
         VALUES (?, ?, ?, ?)`
      )
      .run('Despesa com evento', 150, '2025-06-02', eventId);

    const res = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    const found = res.body.expenses.find((e) => e.title === 'Despesa com evento');
    expect(found).toBeDefined();
    expect(found.event_name).toBe('Acampamento de inverno');
  });

  it('POST /api/expenses retorna event_name da despesa recém-criada quando eventId é informado', async () => {
    const eventId = insertEvent({ name: 'Feira beneficente' });

    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({
        title: 'Despesa nova com evento',
        amount: 80,
        expenseDate: '2025-07-01',
        eventId
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expense.event_name).toBe('Feira beneficente');
  });

  it('PUT /api/expenses/:id retorna event_name atualizado da despesa', async () => {
    const eventId = insertEvent({ name: 'Bazar solidário' });
    const created = db()
      .prepare(
        `INSERT INTO expenses (title, amount, expense_date)
         VALUES (?, ?, ?) RETURNING *`
      )
      .get('Despesa a vincular', 60, '2025-08-01');

    const res = await request(app)
      .put(`/api/expenses/${created.id}`)
      .set(auth(tokens.admin()))
      .send({
        title: 'Despesa a vincular',
        amount: 60,
        expenseDate: '2025-08-01',
        eventId
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.expense.event_name).toBe('Bazar solidário');
  });
});
