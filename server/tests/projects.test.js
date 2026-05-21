const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertMember, insertProject } = require('./helpers');

beforeEach(() => cleanAll());

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------
describe('GET /api/projects', () => {
  test('401 sem token', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  test('200 com token válido — retorna lista vazia', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.projects).toEqual([]);
  });

  test('200 viewer também pode listar', async () => {
    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeInstanceOf(Array);
  });

  test('200 retorna projetos com campo members', async () => {
    insertProject({ name: 'Alpha', status: 'active' });
    insertProject({ name: 'Beta', status: 'inactive' });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.projects[0]).toHaveProperty('members');
    expect(res.body.projects[0].members).toBeInstanceOf(Array);
  });

  test('200 retorna membros vinculados ao projeto', async () => {
    const projectId = insertProject({ name: 'Com Membro' });
    const memberId = insertMember({ name: 'Guilherme' });
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, projectId);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === projectId);
    expect(project.members).toHaveLength(1);
    expect(project.members[0].member_id).toBe(memberId);
    expect(project.members[0].name).toBe('Guilherme');
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects
// ---------------------------------------------------------------------------
describe('POST /api/projects', () => {
  test('401 sem token', async () => {
    const res = await request(app).post('/api/projects').send({ name: 'Novo' });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode criar', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(tokens.viewer()))
      .send({ name: 'Novo' });
    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  test('400 sem nome', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(tokens.admin()))
      .send({ description: 'sem nome' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/obrigatório/i);
  });

  test('200 admin cria projeto com status padrão active', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(tokens.admin()))
      .send({ name: 'Projeto Alpha', description: 'Desc Alpha' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.project.name).toBe('Projeto Alpha');
    expect(res.body.project.status).toBe('active');
    expect(res.body.project.members).toEqual([]);
  });

  test('200 diretor_financeiro pode criar', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(tokens.diretor()))
      .send({ name: 'Projeto Diretor', status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.project.status).toBe('inactive');
  });

  test('200 cria projeto com status inactive', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(tokens.admin()))
      .send({ name: 'Pausado', status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.project.status).toBe('inactive');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id
// ---------------------------------------------------------------------------
describe('PUT /api/projects/:id', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const res = await request(app).put(`/api/projects/${id}`).send({ name: 'X' });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode editar', async () => {
    const id = insertProject();
    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.viewer()))
      .send({ name: 'X' });
    expect(res.status).toBe(403);
  });

  test('400 sem nome', async () => {
    const id = insertProject();
    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.admin()))
      .send({ description: 'sem nome' });
    expect(res.status).toBe(400);
  });

  test('200 atualiza nome e status', async () => {
    const id = insertProject({ name: 'Original', status: 'active' });

    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.admin()))
      .send({ name: 'Atualizado', description: 'Nova desc', status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Atualizado');
    expect(res.body.project.status).toBe('inactive');
    expect(res.body.project.description).toBe('Nova desc');
  });

  test('200 diretor_financeiro pode editar', async () => {
    const id = insertProject({ name: 'Para editar' });

    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.diretor()))
      .send({ name: 'Editado pelo diretor', status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Editado pelo diretor');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id
// ---------------------------------------------------------------------------
describe('DELETE /api/projects/:id', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const res = await request(app).delete(`/api/projects/${id}`);
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode remover', async () => {
    const id = insertProject();
    const res = await request(app)
      .delete(`/api/projects/${id}`)
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
  });

  test('200 admin remove projeto', async () => {
    const id = insertProject({ name: 'Para remover' });

    const res = await request(app)
      .delete(`/api/projects/${id}`)
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('projeto é removido do banco após DELETE', async () => {
    const id = insertProject({ name: 'Será removido' });

    await request(app)
      .delete(`/api/projects/${id}`)
      .set(auth(tokens.admin()));

    const row = global.__testDb
      .prepare('SELECT id FROM projects WHERE id = ?')
      .get(id);
    expect(row).toBeUndefined();
  });

  test('DELETE em cascata remove vínculos member_projects', async () => {
    const projectId = insertProject();
    const memberId = insertMember();
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, projectId);

    await request(app)
      .delete(`/api/projects/${projectId}`)
      .set(auth(tokens.admin()));

    const links = global.__testDb
      .prepare('SELECT id FROM member_projects WHERE project_id = ?')
      .all(projectId);
    expect(links).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// POST /api/projects/:id/members
// ---------------------------------------------------------------------------
describe('POST /api/projects/:id/members', () => {
  test('401 sem token', async () => {
    const id = insertProject();
    const memberId = insertMember();
    const res = await request(app)
      .post(`/api/projects/${id}/members`)
      .send({ memberId });
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode vincular membro', async () => {
    const id = insertProject();
    const memberId = insertMember();
    const res = await request(app)
      .post(`/api/projects/${id}/members`)
      .set(auth(tokens.viewer()))
      .send({ memberId });
    expect(res.status).toBe(403);
  });

  test('400 sem memberId', async () => {
    const id = insertProject();
    const res = await request(app)
      .post(`/api/projects/${id}/members`)
      .set(auth(tokens.admin()))
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/membro/i);
  });

  test('200 admin vincula membro ao projeto', async () => {
    const projectId = insertProject();
    const memberId = insertMember({ name: 'Guilherme' });

    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(tokens.admin()))
      .send({ memberId });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const link = global.__testDb
      .prepare('SELECT id FROM member_projects WHERE project_id = ? AND member_id = ?')
      .get(projectId, memberId);
    expect(link).toBeDefined();
  });

  test('200 inserção duplicada é ignorada (INSERT OR IGNORE)', async () => {
    const projectId = insertProject();
    const memberId = insertMember();

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(tokens.admin()))
      .send({ memberId });

    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(tokens.admin()))
      .send({ memberId });

    expect(res.status).toBe(200);

    const links = global.__testDb
      .prepare('SELECT id FROM member_projects WHERE project_id = ? AND member_id = ?')
      .all(projectId, memberId);
    expect(links).toHaveLength(1);
  });

  test('200 GET /projects reflete membro vinculado', async () => {
    const projectId = insertProject({ name: 'Com Link' });
    const memberId = insertMember({ name: 'Rafael' });

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(tokens.admin()))
      .send({ memberId });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === projectId);
    expect(project.members.map((m) => m.member_id)).toContain(memberId);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id/members/:memberId
// ---------------------------------------------------------------------------
describe('DELETE /api/projects/:id/members/:memberId', () => {
  test('401 sem token', async () => {
    const projectId = insertProject();
    const memberId = insertMember();
    const res = await request(app).delete(
      `/api/projects/${projectId}/members/${memberId}`
    );
    expect(res.status).toBe(401);
  });

  test('403 viewer não pode desvincular', async () => {
    const projectId = insertProject();
    const memberId = insertMember();
    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/${memberId}`)
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
  });

  test('200 admin desvincula membro', async () => {
    const projectId = insertProject();
    const memberId = insertMember();
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, projectId);

    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/${memberId}`)
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const link = global.__testDb
      .prepare('SELECT id FROM member_projects WHERE project_id = ? AND member_id = ?')
      .get(projectId, memberId);
    expect(link).toBeUndefined();
  });

  test('200 remover vínculo inexistente não gera erro', async () => {
    const projectId = insertProject();
    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/9999`)
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Regras de negócio — status ativo/inativo
// ---------------------------------------------------------------------------
describe('Regra de negócio: projeto ativo vs inativo', () => {
  test('projeto inativo não aparece como ativo na listagem', async () => {
    const projectId = insertProject({ name: 'Pausado', status: 'inactive' });
    const memberId = insertMember({ name: 'Lucas' });
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, projectId);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects.find((p) => p.id === projectId);
    expect(project.status).toBe('inactive');
    expect(project.members).toHaveLength(1);
  });

  test('membro pode estar em múltiplos projetos ativos simultaneamente', async () => {
    const memberId = insertMember({ name: 'Fernanda' });
    const p1 = insertProject({ name: 'Projeto 1', status: 'active' });
    const p2 = insertProject({ name: 'Projeto 2', status: 'active' });
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, p1);
    global.__testDb
      .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
      .run(memberId, p2);

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const activeWithMember = res.body.projects.filter(
      (p) => p.status === 'active' && p.members.some((m) => m.member_id === memberId)
    );
    expect(activeWithMember).toHaveLength(2);
  });

  test('membro sem nenhum projeto retorna lista vazia de projetos', async () => {
    insertMember({ name: 'Beatriz' });
    insertProject({ name: 'Projeto sem membros', status: 'active' });

    const res = await request(app)
      .get('/api/projects')
      .set(auth(tokens.admin()));

    const project = res.body.projects[0];
    expect(project.members).toHaveLength(0);
  });

  test('trocar projeto de active para inactive é persistido corretamente', async () => {
    const id = insertProject({ name: 'Vai pausar', status: 'active' });

    await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.admin()))
      .send({ name: 'Vai pausar', status: 'inactive' });

    const row = global.__testDb
      .prepare('SELECT status FROM projects WHERE id = ?')
      .get(id);
    expect(row.status).toBe('inactive');
  });
});
