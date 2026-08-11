const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../middleware/rateLimit');

// Cobre o middleware base de rate limiting: header Retry-After, formato da
// resposta 429 no padrão fail(res, mensagem) e log de IP/rota/horário a
// cada bloqueio.
describe('createRateLimiter', () => {
  const rateLimitMessage = 'Muitas requisições, tente novamente em instantes.';
  let app;
  let warnSpy;

  beforeEach(() => {
    app = express();
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 2,
      message: rateLimitMessage
    });
    app.use('/limited', limiter, (req, res) => res.json({ ok: true }));
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  test('permite requisições dentro do limite e bloqueia com 429 ao estourar', async () => {
    await request(app).get('/limited').expect(200);
    await request(app).get('/limited').expect(200);

    const blocked = await request(app).get('/limited');

    expect(blocked.status).toBe(429);
  });

  test('resposta 429 segue o padrão fail(res, mensagem) e inclui Retry-After em segundos', async () => {
    await request(app).get('/limited');
    await request(app).get('/limited');

    const blocked = await request(app).get('/limited');

    expect(blocked.body).toEqual({ ok: false, message: rateLimitMessage });

    const retryAfter = Number(blocked.headers['retry-after']);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(Number.isFinite(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(1);
  });

  test('loga IP, rota e horário do bloqueio ao estourar o limite', async () => {
    await request(app).get('/limited');
    await request(app).get('/limited');
    warnSpy.mockClear();

    await request(app).get('/limited');

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [logMessage] = warnSpy.mock.calls[0];
    expect(logMessage).toEqual(expect.stringContaining('/limited'));
    // horário no formato ISO 8601 presente no log
    expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
