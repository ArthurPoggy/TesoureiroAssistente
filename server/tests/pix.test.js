const request = require('supertest');
const app = require('../app');
const { crc16, buildPixPayload } = require('../utils/pix');
const { tokens, auth, cleanAll, insertMember, insertPayment } = require('./helpers');

const setSetting = (key, value) => {
  global.__testDb
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
};

const clearSetting = (key) => {
  global.__testDb.prepare('DELETE FROM settings WHERE key = ?').run(key);
};

describe('utils/pix — buildPixPayload', () => {
  it('crc16 bate com o vetor canônico CCITT-FALSE (29B1)', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('gera payload com CRC final consistente', () => {
    const payload = buildPixPayload({
      pixKey: 'teste@exemplo.com',
      merchantName: 'Cla Sao Jorge',
      merchantCity: 'Sao Paulo',
      amount: 100,
      txid: 'MENS1'
    });
    const body = payload.slice(0, -4);
    expect(payload.slice(-4)).toBe(crc16(body));
    expect(payload.startsWith('000201')).toBe(true);
  });

  it('inclui o valor formatado com duas casas decimais', () => {
    const payload = buildPixPayload({ pixKey: 'chave', amount: 99.5 });
    expect(payload).toContain('540599.50');
  });

  it('omite o campo de valor quando não há valor positivo', () => {
    const payload = buildPixPayload({ pixKey: 'chave', amount: 0 });
    expect(payload).not.toContain('5406');
    expect(payload).not.toMatch(/54\d{2}0\.00/);
  });

  it('remove acentos do nome e da cidade do recebedor', () => {
    const payload = buildPixPayload({
      pixKey: 'chave',
      merchantName: 'João Coração',
      merchantCity: 'Brasília',
      amount: 10
    });
    expect(payload).toContain('Joao Coracao');
    expect(payload).toContain('Brasilia');
  });

  it('lança erro quando a chave PIX está ausente', () => {
    expect(() => buildPixPayload({ amount: 10 })).toThrow();
  });
});

describe('GET /api/payments/:id/pix', () => {
  beforeEach(() => {
    cleanAll();
    clearSetting('pix_key');
    clearSetting('pix_receiver');
    clearSetting('pix_city');
  });

  afterAll(() => {
    clearSetting('pix_key');
    clearSetting('pix_receiver');
    clearSetting('pix_city');
  });

  it('retorna 401 sem token', async () => {
    const res = await request(app).get('/api/payments/1/pix');
    expect(res.status).toBe(401);
  });

  it('retorna 404 para pagamento inexistente', async () => {
    setSetting('pix_key', 'chave@pix.com');
    const res = await request(app)
      .get('/api/payments/999999/pix')
      .set(auth(tokens.admin()));
    expect(res.status).toBe(404);
  });

  it('retorna 422 quando a chave PIX não está configurada', async () => {
    const memberId = insertMember();
    const paymentId = insertPayment(memberId, { amount: 150 });
    const res = await request(app)
      .get(`/api/payments/${paymentId}/pix`)
      .set(auth(tokens.admin()));
    expect(res.status).toBe(422);
  });

  it('gera o BR Code com o valor do pagamento', async () => {
    setSetting('pix_key', 'chave@pix.com');
    setSetting('pix_receiver', 'Cla Sao Jorge');
    setSetting('pix_city', 'Sao Paulo');
    const memberId = insertMember();
    const paymentId = insertPayment(memberId, { amount: 150 });

    const res = await request(app)
      .get(`/api/payments/${paymentId}/pix`)
      .set(auth(tokens.admin()));

    expect(res.status).toBe(200);
    expect(res.body.amount).toBe(150);
    expect(res.body.pixKey).toBe('chave@pix.com');
    expect(typeof res.body.brcode).toBe('string');
    expect(res.body.brcode).toContain('5406150.00');
    expect(res.body.brcode).toContain('br.gov.bcb.pix');
    const body = res.body.brcode.slice(0, -4);
    expect(res.body.brcode.slice(-4)).toBe(crc16(body));
  });
});
