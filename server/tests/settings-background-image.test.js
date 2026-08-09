const request = require('supertest');
const app = require('../app');
const { tokens, auth } = require('./helpers');

// PNG mínimo válido (1x1 pixel transparente), usado como arquivo de imagem em memória.
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const validPngBuffer = () => Buffer.from(TINY_PNG_BASE64, 'base64');

const clearBackgroundSettings = () => {
  ['login_background_url', 'login_background_version', 'dashboard_background_url', 'dashboard_background_version']
    .forEach((key) => {
      global.__testDb.prepare('DELETE FROM settings WHERE key = ?').run(key);
    });
};

describe('POST /api/settings/background-image', () => {
  beforeEach(() => {
    clearBackgroundSettings();
  });

  afterAll(() => {
    clearBackgroundSettings();
  });

  it('permite que um admin envie uma imagem válida (PNG) para o login e ela é persistida', async () => {
    const uploadRes = await request(app)
      .post('/api/settings/background-image')
      .set(auth(tokens.admin()))
      .field('target', 'login')
      .attach('image', validPngBuffer(), { filename: 'fundo-login.png', contentType: 'image/png' });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.ok).toBe(true);
    expect(typeof uploadRes.body.url).toBe('string');
    expect(uploadRes.body.url.length).toBeGreaterThan(0);

    const publicRes = await request(app).get('/api/settings/public');
    expect(publicRes.status).toBe(200);
    expect(publicRes.body.loginBackgroundUrl).toContain(uploadRes.body.url.split('?')[0]);
    // versionado para cache-busting: URL deve carregar algum indicador de versão
    expect(publicRes.body.loginBackgroundUrl).toMatch(/[?&](v|version)=/);
  });

  it('bloqueia upload de usuário que não é admin (403)', async () => {
    const res = await request(app)
      .post('/api/settings/background-image')
      .set(auth(tokens.diretor()))
      .field('target', 'dashboard')
      .attach('image', validPngBuffer(), { filename: 'fundo.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('rejeita arquivo com formato inválido (ex: PDF) com mensagem clara', async () => {
    const res = await request(app)
      .post('/api/settings/background-image')
      .set(auth(tokens.admin()))
      .field('target', 'login')
      .attach('image', Buffer.from('%PDF-1.4 fake pdf content'), {
        filename: 'documento.pdf',
        contentType: 'application/pdf'
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  it('rejeita arquivo maior que 5MB com mensagem clara', async () => {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const res = await request(app)
      .post('/api/settings/background-image')
      .set(auth(tokens.admin()))
      .field('target', 'dashboard')
      .attach('image', oversizedBuffer, { filename: 'grande.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('GET /api/settings/public — imagens de fundo', () => {
  beforeEach(() => {
    clearBackgroundSettings();
  });

  afterAll(() => {
    clearBackgroundSettings();
  });

  it('não exige autenticação (tela de login é deslogada)', async () => {
    const res = await request(app).get('/api/settings/public');
    expect(res.status).toBe(200);
  });

  it('retorna null/vazio para as imagens de fundo quando nenhuma foi configurada', async () => {
    const res = await request(app).get('/api/settings/public');
    expect(res.status).toBe(200);
    expect(res.body.loginBackgroundUrl == null || res.body.loginBackgroundUrl === '').toBe(true);
    expect(res.body.dashboardBackgroundUrl == null || res.body.dashboardBackgroundUrl === '').toBe(true);
  });

  it('NÃO expõe chave PIX e aviso interno do tesoureiro a requisições sem autenticação', async () => {
    const upsertSetting = (key, value) => {
      global.__testDb
        .prepare(
          `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        )
        .run(key, value);
    };
    upsertSetting('pix_key', 'chave-pix-secreta@clan.com');
    upsertSetting('pix_receiver', 'Tesoureiro Fulano de Tal');
    upsertSetting('pix_city', 'Cidade Sigilosa');
    upsertSetting('dashboard_note', 'Aviso interno: reserva de caixa não divulgada aos membros');

    const res = await request(app).get('/api/settings/public');

    expect(res.status).toBe(200);
    // A rota é pública (sem requireAuth) para atender à LoginScreen, que só
    // precisa de loginBackgroundUrl. Ela não pode vazar dados sensíveis da
    // organização (chave PIX, recebedor, cidade e aviso interno) para
    // qualquer requisição não autenticada.
    expect(res.body.pixKey).toBeUndefined();
    expect(res.body.pixReceiver).toBeUndefined();
    expect(res.body.pixCity).toBeUndefined();
    expect(res.body.dashboardNote).toBeUndefined();
  });
});
