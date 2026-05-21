const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertTag, insertExpense, db } = require('./helpers');

beforeEach(() => cleanAll());

describe('GET /api/tags', () => {
  it('retorna lista de tags para usuário autenticado', async () => {
    const res = await request(app)
      .get('/api/tags')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tags)).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/tags');
    expect(res.status).toBe(401);
  });

  it('inclui as tags pré-seeded', async () => {
    const res = await request(app)
      .get('/api/tags')
      .set(auth(tokens.viewer()));
    const names = res.body.tags.map((t) => t.name);
    expect(names).toContain('Equipamentos');
    expect(names).toContain('Comida');
    expect(names).toContain('Acampamento');
  });

  it('retorna tags em ordem alfabética', async () => {
    const res = await request(app)
      .get('/api/tags')
      .set(auth(tokens.viewer()));
    const names = res.body.tags.map((t) => t.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });
});

describe('POST /api/tags', () => {
  it('cria nova tag (admin)', async () => {
    const res = await request(app)
      .post('/api/tags')
      .set(auth(tokens.admin()))
      .send({ name: 'Nova Tag Teste' });
    expect(res.status).toBe(200);
    expect(res.body.tag.name).toBe('Nova Tag Teste');
  });

  it('cria nova tag (diretor_financeiro)', async () => {
    const res = await request(app)
      .post('/api/tags')
      .set(auth(tokens.diretor()))
      .send({ name: 'Tag Diretor' });
    expect(res.status).toBe(200);
    expect(res.body.tag.name).toBe('Tag Diretor');
  });

  it('retorna 403 para viewer', async () => {
    const res = await request(app)
      .post('/api/tags')
      .set(auth(tokens.viewer()))
      .send({ name: 'Tag Viewer' });
    expect(res.status).toBe(403);
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app)
      .post('/api/tags')
      .send({ name: 'Tag Anon' });
    expect(res.status).toBe(401);
  });

  it('retorna 400 se nome ausente', async () => {
    const res = await request(app)
      .post('/api/tags')
      .set(auth(tokens.admin()))
      .send({});
    expect(res.status).toBe(400);
  });

  it('retorna tag existente sem erro em caso de duplicata (case insensitive)', async () => {
    await request(app)
      .post('/api/tags')
      .set(auth(tokens.admin()))
      .send({ name: 'Duplicada' });
    const res = await request(app)
      .post('/api/tags')
      .set(auth(tokens.admin()))
      .send({ name: 'duplicada' });
    expect(res.status).toBe(200);
    expect(res.body.tag.name.toLowerCase()).toBe('duplicada');
  });
});

describe('DELETE /api/tags/:id', () => {
  it('remove tag existente (admin)', async () => {
    const tag = insertTag('Tag Para Remover');
    const res = await request(app)
      .delete(`/api/tags/${tag.id}`)
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    const found = db().prepare('SELECT * FROM tags WHERE id = ?').get(tag.id);
    expect(found).toBeUndefined();
  });

  it('retorna 403 para viewer', async () => {
    const tag = insertTag('Tag Viewer Delete');
    const res = await request(app)
      .delete(`/api/tags/${tag.id}`)
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
  });

  it('retorna 401 sem token', async () => {
    const tag = insertTag('Tag Anon Delete');
    const res = await request(app)
      .delete(`/api/tags/${tag.id}`)
      .set({});
    expect(res.status).toBe(401);
  });
});

describe('Tags em despesas', () => {
  it('POST /api/expenses inclui tagIds e retorna tags no objeto', async () => {
    const tag = insertTag('Tag Despesa');
    const res = await request(app)
      .post('/api/expenses')
      .set(auth(tokens.admin()))
      .send({
        title: 'Despesa com tag',
        amount: 50,
        expenseDate: '2024-03-01',
        tagIds: [tag.id]
      });
    expect(res.status).toBe(200);
    expect(res.body.expense.tags).toBeDefined();
    expect(res.body.expense.tags.map((t) => t.id)).toContain(tag.id);
  });

  it('GET /api/expenses retorna array tags em cada despesa', async () => {
    const expense = insertExpense({ title: 'Despesa com get' });
    const tag = insertTag('TagGet');
    db().prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)').run(expense.id, tag.id);

    const res = await request(app)
      .get('/api/expenses')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(200);
    const found = res.body.expenses.find((e) => e.id === expense.id);
    expect(found).toBeDefined();
    expect(Array.isArray(found.tags)).toBe(true);
    expect(found.tags.map((t) => t.id)).toContain(tag.id);
  });

  it('PUT /api/expenses/:id atualiza tags', async () => {
    const expense = insertExpense({ title: 'Despesa update tags' });
    const tag1 = insertTag('TagUpdate1');
    const tag2 = insertTag('TagUpdate2');
    db().prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)').run(expense.id, tag1.id);

    const res = await request(app)
      .put(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()))
      .send({
        title: expense.title,
        amount: expense.amount,
        expenseDate: expense.expense_date,
        tagIds: [tag2.id]
      });
    expect(res.status).toBe(200);
    const tagIds = res.body.expense.tags.map((t) => t.id);
    expect(tagIds).not.toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);
  });

  it('DELETE /api/expenses/:id remove expense_tags via cascade', async () => {
    const expense = insertExpense({ title: 'Despesa cascade' });
    const tag = insertTag('TagCascade');
    db().prepare('INSERT INTO expense_tags (expense_id, tag_id) VALUES (?, ?)').run(expense.id, tag.id);

    await request(app)
      .delete(`/api/expenses/${expense.id}`)
      .set(auth(tokens.admin()));

    const links = db().prepare('SELECT * FROM expense_tags WHERE expense_id = ?').all(expense.id);
    expect(links).toHaveLength(0);
  });
});
