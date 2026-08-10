const request = require('supertest');
const app = require('../app');
const { tokens, auth, db } = require('./helpers');

// Cobre a padronização do tratamento de erros/validação nas rotas de metas e
// eventos: assim como já ocorre em payments/expenses, o PUT deve validar os
// mesmos campos obrigatórios do POST e retornar { ok: false, message }
// em vez de deixar vazar o erro cru de constraint do banco (NOT NULL).

const insertGoal = (overrides = {}) => {
  const defaults = { title: 'Meta teste', target_amount: 1000, deadline: '2025-12-31' };
  const g = { ...defaults, ...overrides };
  const result = db()
    .prepare('INSERT INTO goals (title, target_amount, deadline) VALUES (?, ?, ?)')
    .run(g.title, g.target_amount, g.deadline);
  return result.lastInsertRowid;
};

const insertEvent = (overrides = {}) => {
  const defaults = { name: 'Evento teste', event_date: '2025-06-01' };
  const e = { ...defaults, ...overrides };
  const result = db()
    .prepare('INSERT INTO events (name, event_date) VALUES (?, ?)')
    .run(e.name, e.event_date);
  return result.lastInsertRowid;
};

describe('Padronização de respostas de erro — metas e eventos', () => {
  beforeEach(() => {
    db().prepare('DELETE FROM goals').run();
    db().prepare('DELETE FROM events').run();
  });

  it('PUT /api/goals/:id sem title/targetAmount retorna a mesma mensagem de validação do POST (não erro cru de banco)', async () => {
    const goalId = insertGoal();

    const postRes = await request(app)
      .post('/api/goals')
      .set(auth(tokens.admin()))
      .send({ deadline: '2025-12-31' });

    const putRes = await request(app)
      .put(`/api/goals/${goalId}`)
      .set(auth(tokens.admin()))
      .send({ deadline: '2026-01-01' });

    expect(postRes.status).toBe(400);
    expect(putRes.status).toBe(400);
    expect(putRes.body).toEqual({ ok: false, message: expect.any(String) });
    expect(putRes.body.message).not.toMatch(/constraint|SQLITE|sqlite/i);
    expect(putRes.body.message).toBe(postRes.body.message);
  });

  it('PUT /api/events/:id sem name/eventDate retorna a mesma mensagem de validação do POST (não erro cru de banco)', async () => {
    const eventId = insertEvent();

    const postRes = await request(app)
      .post('/api/events')
      .set(auth(tokens.admin()))
      .send({ description: 'sem campos obrigatórios' });

    const putRes = await request(app)
      .put(`/api/events/${eventId}`)
      .set(auth(tokens.admin()))
      .send({ description: 'atualização sem campos obrigatórios' });

    expect(postRes.status).toBe(400);
    expect(putRes.status).toBe(400);
    expect(putRes.body).toEqual({ ok: false, message: expect.any(String) });
    expect(putRes.body.message).not.toMatch(/constraint|SQLITE|sqlite/i);
    expect(putRes.body.message).toBe(postRes.body.message);
  });
});
