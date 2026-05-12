const request = require('supertest');

// Configura variáveis antes de qualquer require do app
process.env.JWT_SECRET = 'test-secret-login-admin';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'admin-test-pass';

const app = require('../app');

describe('POST /api/login — admin via variável de ambiente', () => {
  it('retorna token com role admin quando as credenciais estão corretas', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'admin-test-pass' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      role: 'admin',
      email: 'admin@test.com',
      memberId: null
    });
    expect(res.body.token).toBeTruthy();
  });

  it('retorna 401 quando a senha do admin está errada', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('retorna 401 quando o email não existe no sistema', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'naoexiste@test.com', password: 'qualquer' });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });

  it('retorna 400 quando email não é informado', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ password: 'admin-test-pass' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('retorna 400 quando senha não é informada', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it('aceita email do admin em maiúsculas (case-insensitive)', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'ADMIN@TEST.COM', password: 'admin-test-pass' });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });
});

describe('POST /api/login — admin sem ADMIN_PASSWORD configurada', () => {
  let originalPassword;

  beforeEach(() => {
    originalPassword = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    jest.resetModules();
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = originalPassword;
    jest.resetModules();
  });

  it('retorna 500 com mensagem clara quando ADMIN_PASSWORD não está definida', async () => {
    process.env.JWT_SECRET = 'test-secret-login-admin';
    process.env.ADMIN_EMAIL = 'admin@test.com';

    const freshApp = require('../app');
    const res = await request(freshApp)
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'qualquer' });

    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/ADMIN_PASSWORD/i);
  });
});
