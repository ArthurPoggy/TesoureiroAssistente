const { getTokenFromRequest, verifyToken } = require('../utils/auth');
const { fail } = require('../utils/response');

const requireAuth = (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    req.user = verifyToken(token);
    return next();
  } catch (error) {
    const status = error.message === 'Autenticação não configurada' ? 500 : 401;
    return fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
};

const requireAdmin = (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    const payload = verifyToken(token);
    if (payload.role !== 'admin') {
      return fail(res, 'Acesso restrito', 403);
    }
    req.user = payload;
    return next();
  } catch (error) {
    const status = error.message === 'Autenticação não configurada' ? 500 : 401;
    return fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
};

module.exports = {
  requireAuth,
  requireAdmin
};
