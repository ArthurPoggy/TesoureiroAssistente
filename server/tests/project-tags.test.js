const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertTag } = require('./helpers');

beforeEach(() => cleanAll());

const createProject = (body) =>
  request(app).post('/api/projects').set(auth(tokens.admin())).send(body);

describe('Tags em projetos', () => {
  it('cria projeto com tags e as retorna', async () => {
    const t1 = insertTag('Social');
    const t2 = insertTag('Comunidade');
    const res = await createProject({ name: 'Projeto A', tagIds: [t1.id, t2.id] });
    expect(res.status).toBe(200);
    const names = res.body.project.tags.map((t) => t.name).sort();
    expect(names).toEqual(['Comunidade', 'Social']);
  });

  it('cria projeto sem tags retorna lista vazia', async () => {
    const res = await createProject({ name: 'Projeto sem tags' });
    expect(res.status).toBe(200);
    expect(res.body.project.tags).toEqual([]);
  });

  it('GET /api/projects inclui as tags de cada projeto', async () => {
    const t1 = insertTag('Fundraising');
    await createProject({ name: 'Projeto B', tagIds: [t1.id] });
    const res = await request(app).get('/api/projects').set(auth(tokens.viewer()));
    expect(res.status).toBe(200);
    const projeto = res.body.projects.find((p) => p.name === 'Projeto B');
    expect(projeto.tags.map((t) => t.name)).toContain('Fundraising');
  });

  it('atualiza as tags de um projeto (substitui as anteriores)', async () => {
    const t1 = insertTag('Antiga');
    const t2 = insertTag('Nova');
    const created = await createProject({ name: 'Projeto C', tagIds: [t1.id] });
    const id = created.body.project.id;

    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.admin()))
      .send({ name: 'Projeto C', tagIds: [t2.id] });

    expect(res.status).toBe(200);
    const names = res.body.project.tags.map((t) => t.name);
    expect(names).toEqual(['Nova']);
  });

  it('remove todas as tags ao enviar lista vazia', async () => {
    const t1 = insertTag('Temp');
    const created = await createProject({ name: 'Projeto D', tagIds: [t1.id] });
    const id = created.body.project.id;
    const res = await request(app)
      .put(`/api/projects/${id}`)
      .set(auth(tokens.admin()))
      .send({ name: 'Projeto D', tagIds: [] });
    expect(res.body.project.tags).toEqual([]);
  });

  it('ignora ids de tag duplicados', async () => {
    const t1 = insertTag('Unica');
    const res = await createProject({ name: 'Projeto E', tagIds: [t1.id, t1.id] });
    expect(res.body.project.tags).toHaveLength(1);
  });
});
