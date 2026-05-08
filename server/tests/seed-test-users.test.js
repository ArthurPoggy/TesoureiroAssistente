const request = require('supertest');
const { execute } = require('../db/query');

process.env.JWT_SECRET = 'test-secret-seed';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'admin-test-pass';

const app = require('../app');

const TEST_EMAILS = [
  'admin_teste@clan.com',
  'diretor_teste@clan.com',
  'viewer_teste@clan.com'
];
const TEST_ROLES = ['admin', 'diretor_financeiro', 'viewer'];

const cleanupTestUsers = () =>
  execute(`DELETE FROM members WHERE LOWER(email) IN (${TEST_EMAILS.map(() => '?').join(',')})`, TEST_EMAILS);

describe('POST /api/seed/test-users — criação de perfis de teste', () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  it('retorna 200 e cria os 3 perfis na primeira chamada', async () => {
    const res = await request(app).post('/api/seed/test-users');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.created).toHaveLength(3);
    expect(res.body.existing).toHaveLength(0);
  });

  it('retorna credenciais dos 3 perfis no response', async () => {
    const res = await request(app).post('/api/seed/test-users');

    expect(res.body.credentials).toHaveLength(3);
    const emails = res.body.credentials.map((c) => c.email);
    TEST_EMAILS.forEach((email) => expect(emails).toContain(email));
  });

  it('retorna as 3 roles nas credenciais', async () => {
    const res = await request(app).post('/api/seed/test-users');

    const roles = res.body.credentials.map((c) => c.role);
    TEST_ROLES.forEach((role) => expect(roles).toContain(role));
  });

  it('retorna senha nos dados de credenciais', async () => {
    const res = await request(app).post('/api/seed/test-users');

    res.body.credentials.forEach((cred) => {
      expect(cred.password).toBeTruthy();
    });
  });

  it('é idempotente: segunda chamada move perfis para existing sem erro', async () => {
    await request(app).post('/api/seed/test-users');
    const res = await request(app).post('/api/seed/test-users');

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.created).toHaveLength(0);
    expect(res.body.existing).toHaveLength(3);
    expect(res.body.credentials).toHaveLength(3);
  });
});

describe('POST /api/seed/test-users — bloqueio em produção', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('retorna 403 quando NODE_ENV é production', async () => {
    process.env.JWT_SECRET = 'test-secret-seed';
    process.env.ADMIN_EMAIL = 'admin@test.com';
    process.env.ADMIN_PASSWORD = 'admin-test-pass';

    const freshApp = require('../app');
    const res = await request(freshApp).post('/api/seed/test-users');

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });
});

describe('POST /api/seed/test-users — login com perfis criados', () => {
  beforeAll(async () => {
    await request(app).post('/api/seed/test-users');
  });

  it('admin_teste consegue fazer login e recebe role admin', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin_teste@clan.com', password: 'test123' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.token).toBeTruthy();
  });

  it('diretor_teste consegue fazer login e recebe role diretor_financeiro', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'diretor_teste@clan.com', password: 'test123' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('diretor_financeiro');
    expect(res.body.token).toBeTruthy();
  });

  it('viewer_teste consegue fazer login e recebe role viewer', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'viewer_teste@clan.com', password: 'test123' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('viewer');
    expect(res.body.token).toBeTruthy();
  });

  it('senha errada retorna 401 para perfil de teste', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin_teste@clan.com', password: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});
