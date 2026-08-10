const success = (res, payload = {}) => res.json({ ok: true, ...payload });

const fail = (res, message, status = 400) => res.status(status).json({ ok: false, message });

// Envolve um handler assíncrono de rota, encaminhando qualquer erro lançado
// para o formato padrão de falha ({ ok: false, message }) em vez de deixar
// vazar o handler de erro default do Express (que expõe stack/mensagem crua).
const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    fail(res, error.message);
  }
};

module.exports = {
  success,
  fail,
  asyncHandler
};
