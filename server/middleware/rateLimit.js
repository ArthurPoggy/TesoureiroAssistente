const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;
const { fail } = require('../utils/response');

// Loga IP, rota e horário do bloqueio sempre que um cliente estoura o limite
// configurado, para permitir auditoria/monitoramento de abuso.
const logRateLimitHit = (req) => {
  console.warn(
    `[rate-limit] IP=${req.ip} rota=${req.originalUrl} horario=${new Date().toISOString()}`
  );
};

// Responde 429 no padrão fail(res, mensagem) e inclui o header Retry-After
// (em segundos) com o tempo até a janela liberar novamente.
const buildRateLimitHandler = (message, windowMs) => (req, res) => {
  res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
  logRateLimitHit(req);
  fail(res, message, 429);
};

// Factory de rate limiter reutilizável, construída sobre express-rate-limit.
// keyGenerator usa req.ip (normalizado por ipKeyGenerator, seguro para IPv6),
// que reflete o IP real do cliente quando app.set('trust proxy', ...) está
// configurado no app (necessário atrás do proxy da Vercel).
const createRateLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip),
    handler: buildRateLimitHandler(message, windowMs)
  });

module.exports = {
  createRateLimiter
};
