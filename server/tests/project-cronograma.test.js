const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertProject } = require('./helpers');

// ---------------------------------------------------------------------------
// Contrato esperado desta subtask (ainda não implementado — testes nascem "red"):
//
// - projects.data_inicio / projects.data_fim_planejada (colunas novas)
// - tabela project_milestones (project_id, titulo, data_prevista, concluido)
// - PUT    /api/projects/:id/dates                         -> edita datas do projeto
// - POST   /api/projects/:id/milestones                    -> adiciona marco
// - DELETE /api/projects/:id/milestones/:milestoneId        -> remove marco
// - PUT    /api/projects/:id/milestones/:milestoneId        -> marca marco concluído
// - GET /api/projects/ (e /:id se existir) passam a incluir "milestones" e o
//   campo calculado "atrasado" (true quando data_fim_planejada < hoje e status = 'active')
//
// Apenas admin/diretor_financeiro podem escrever; viewer só lê (403 em escrita).
// ---------------------------------------------------------------------------

const insertMilestone = (projectId, overrides = {}) => {
  const defaults = { titulo: 'Marco Teste', data_prevista: '2099-01-01', concluido: 0 };
  const m = { ...defaults, ...overrides };
  const result = global.__testDb
    .prepare(
      `INSERT INTO project_milestones (project_id, titulo, data_prevista, concluido)
       VALUES (?, ?, ?, ?)`
    )
    .run(projectId, m.titulo, m.data_prevista, m.concluido);
  return result.lastInsertRowid;
};

beforeEach(() => {
  cleanAll();
  // A tabela ainda não existe no schema atual — tolera a ausência para não
  // quebrar outras suítes que compartilham este banco de testes.
  try {
    global.__testDb.prepare('DELETE FROM project_milestones').run();
  } catch (error) {
    // tabela ainda não criada: esperado até a subtask ser implementada
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects — marcos e campo calculado "atrasado"
// ---------------------------------------------------------------------------
describe('GET /api/projects — cronograma', () => {
  test('projeto retorna campo milestones (array)', async () => {
    const id = insertProject({ name: 'Com cronograma' });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === id);
    expect(project).toHaveProperty('milestones');
    expect(project.milestones).toBeInstanceOf(Array);
  });

  test('marcos cadastrados aparecem na listagem do projeto', async () => {
    const id = insertProject({ name: 'Com marcos' });
    insertMilestone(id, { titulo: 'Primeira reunião', data_prevista: '2099-05-01' });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === id);
    expect(project.milestones).toHaveLength(1);
    expect(project.milestones[0]).toMatchObject({
      titulo: 'Primeira reunião',
      data_prevista: '2099-05-01',
    });
  });

  test('projeto ativo com data_fim_planejada no passado é marcado como atrasado', async () => {
    const id = insertProject({ name: 'Atrasado', status: 'active' });
    global.__testDb
      .prepare('UPDATE projects SET data_fim_planejada = ? WHERE id = ?')
      .run('2020-01-01', id);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === id);
    expect(project.atrasado).toBe(true);
  });

  test('projeto ativo com data_fim_planejada no futuro não é atrasado', async () => {
    const id = insertProject({ name: 'No prazo', status: 'active' });
    global.__testDb
      .prepare('UPDATE projects SET data_fim_planejada = ? WHERE id = ?')
      .run('2099-01-01', id);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === id);
    expect(project.atrasado).toBe(false);
  });

  test('projeto inativo com data_fim_planejada no passado não é considerado atrasado', async () => {
    const id = insertProject({ name: 'Pausado no passado', status: 'inactive' });
    global.__testDb
      .prepare('UPDATE projects SET data_fim_planejada = ? WHERE id = ?')
      .run('2020-01-01', id);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === id);
    expect(project.atrasado).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id/dates
// ---------------------------------------------------------------------------
describe('PUT /api/projects/:id/dates', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const res = await request(app)
      .put(`/api/projects/${id}/dates`)
      .send({ data_inicio: '2026-01-01', data_fim_planejada: '2026-06-01' });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode editar datas', async () => {
    const id = insertProject();
    const res = await request(app)
      .put(`/api/projects/${id}/dates`)
      .set(auth(tokens.viewer()))
      .send({ data_inicio: '2026-01-01', data_fim_planejada: '2026-06-01' });
    expect(res.status).toBe(403);
  });

  test('200 admin edita data_inicio e data_fim_planejada', async () => {
    const id = insertProject({ name: 'Com datas' });

    const res = await request(app)
      .put(`/api/projects/${id}/dates`)
      .set(auth(tokens.admin()))
      .send({ data_inicio: '2026-01-01', data_fim_planejada: '2026-06-01' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const row = global.__testDb
      .prepare('SELECT data_inicio, data_fim_planejada FROM projects WHERE id = ?')
      .get(id);
    expect(row.data_inicio).toBe('2026-01-01');
    expect(row.data_fim_planejada).toBe('2026-06-01');
  });

  test('200 diretor_financeiro pode editar datas', async () => {
    const id = insertProject({ name: 'Diretor edita datas' });

    const res = await request(app)
      .put(`/api/projects/${id}/dates`)
      .set(auth(tokens.diretor()))
      .send({ data_inicio: '2026-02-01', data_fim_planejada: '2026-07-01' });

    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/milestones — adicionar marco
// ---------------------------------------------------------------------------
describe('POST /api/projects/:id/milestones', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const res = await request(app)
      .post(`/api/projects/${id}/milestones`)
      .send({ titulo: 'Marco', data_prevista: '2026-05-01' });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode adicionar marco', async () => {
    const id = insertProject();
    const res = await request(app)
      .post(`/api/projects/${id}/milestones`)
      .set(auth(tokens.viewer()))
      .send({ titulo: 'Marco', data_prevista: '2026-05-01' });
    expect(res.status).toBe(403);
  });

  test('400 sem título', async () => {
    const id = insertProject();
    const res = await request(app)
      .post(`/api/projects/${id}/milestones`)
      .set(auth(tokens.admin()))
      .send({ data_prevista: '2026-05-01' });
    expect(res.status).toBe(400);
  });

  test('200 admin adiciona marco ao projeto', async () => {
    const id = insertProject({ name: 'Projeto com marco novo' });

    const res = await request(app)
      .post(`/api/projects/${id}/milestones`)
      .set(auth(tokens.admin()))
      .send({ titulo: 'Reunião de abertura', data_prevista: '2026-05-01' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.milestone).toMatchObject({
      titulo: 'Reunião de abertura',
      data_prevista: '2026-05-01',
      concluido: false,
    });

    const row = global.__testDb
      .prepare('SELECT * FROM project_milestones WHERE project_id = ?')
      .get(id);
    expect(row).toBeDefined();
    expect(row.titulo).toBe('Reunião de abertura');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id/milestones/:milestoneId — remover marco
// ---------------------------------------------------------------------------
describe('DELETE /api/projects/:id/milestones/:milestoneId', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id);
    const res = await request(app).delete(
      `/api/projects/${id}/milestones/${milestoneId}`
    );
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode remover marco', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id);
    const res = await request(app)
      .delete(`/api/projects/${id}/milestones/${milestoneId}`)
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
  });

  test('200 admin remove marco existente', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id, { titulo: 'Será removido' });

    const res = await request(app)
      .delete(`/api/projects/${id}/milestones/${milestoneId}`)
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const row = global.__testDb
      .prepare('SELECT id FROM project_milestones WHERE id = ?')
      .get(milestoneId);
    expect(row).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id/milestones/:milestoneId — marcar marco como concluído
// ---------------------------------------------------------------------------
describe('PUT /api/projects/:id/milestones/:milestoneId — concluir marco', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id);
    const res = await request(app)
      .put(`/api/projects/${id}/milestones/${milestoneId}`)
      .send({ concluido: true });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode marcar marco como concluído', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id);
    const res = await request(app)
      .put(`/api/projects/${id}/milestones/${milestoneId}`)
      .set(auth(tokens.viewer()))
      .send({ concluido: true });
    expect(res.status).toBe(403);
  });

  test('200 admin marca marco como concluído e persiste', async () => {
    const id = insertProject();
    const milestoneId = insertMilestone(id, { titulo: 'A concluir', concluido: 0 });

    const res = await request(app)
      .put(`/api/projects/${id}/milestones/${milestoneId}`)
      .set(auth(tokens.admin()))
      .send({ concluido: true });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const row = global.__testDb
      .prepare('SELECT concluido FROM project_milestones WHERE id = ?')
      .get(milestoneId);
    expect(Boolean(row.concluido)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Viewer — apenas leitura
// ---------------------------------------------------------------------------
describe('Viewer só lê cronograma', () => {
  test('200 viewer consegue listar projetos com milestones e atrasado', async () => {
    const id = insertProject({ name: 'Leitura viewer', status: 'active' });
    insertMilestone(id, { titulo: 'Marco visível' });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.viewer()));

    expect(res.status).toBe(200);
    const project = res.body.projects.find((p) => p.id === id);
    expect(project).toHaveProperty('milestones');
    expect(project).toHaveProperty('atrasado');
  });
});
