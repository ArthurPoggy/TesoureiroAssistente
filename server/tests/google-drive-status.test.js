const request = require('supertest');
const app = require('../app');
const { getDriveStatus } = require('../utils/google-drive');
const { tokens, auth } = require('./helpers');

const GOOGLE_ENV_KEYS = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_CLIENT_EMAIL',
  'GOOGLE_PRIVATE_KEY'
];

let savedEnv;

beforeEach(() => {
  savedEnv = {};
  GOOGLE_ENV_KEYS.forEach((k) => { savedEnv[k] = process.env[k]; delete process.env[k]; });
});

afterEach(() => {
  GOOGLE_ENV_KEYS.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
});

describe('getDriveStatus', () => {
  it('retorna mode "none" quando nenhuma credencial está configurada', async () => {
    const status = await getDriveStatus();
    expect(status.mode).toBe('none');
    expect(status.hasServiceAccount).toBe(false);
    expect(status.configured).toBe(false);
  });

  it('detecta service account via GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY', async () => {
    process.env.GOOGLE_CLIENT_EMAIL = 'bot@projeto.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----';
    const status = await getDriveStatus();
    expect(status.hasServiceAccount).toBe(true);
    expect(status.mode).toBe('service_account');
    // A pasta tem default no config, então a integração fica "configurada".
    expect(status.configured).toBe(true);
  });

  it('detecta service account via GOOGLE_SERVICE_ACCOUNT_JSON', async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: 'bot@x.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----'
    });
    const status = await getDriveStatus();
    expect(status.hasServiceAccount).toBe(true);
    expect(status.mode).toBe('service_account');
  });
});

describe('GET /api/google-drive/status', () => {
  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/google-drive/status');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para viewer (não privilegiado)', async () => {
    const res = await request(app)
      .get('/api/google-drive/status')
      .set(auth(tokens.viewer()));
    expect(res.status).toBe(403);
  });

  it('retorna o status com a forma esperada para admin', async () => {
    const res = await request(app)
      .get('/api/google-drive/status')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('connected');
    expect(res.body).toHaveProperty('source');
    expect(res.body).toHaveProperty('mode');
    expect(res.body).toHaveProperty('hasFolder');
    expect(['none', 'service_account', 'oauth']).toContain(res.body.mode);
  });
});
