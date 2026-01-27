const { getTokenFromRequest, verifyToken } = require('../utils/auth');
const { queryOne } = require('../db/query');
const { fail } = require('../utils/response');

const hydrateUserFromDb = async (payload) => {
  if (!payload?.memberId) {
    return payload;
  }
  try {
    const member = await queryOne(
      'SELECT id, name, email, role, active FROM members WHERE id = ?',
      [payload.memberId]
    );
    if (!member || member.active === 0 || member.active === false) {
      const error = new Error('Não autorizado');
      error.status = 401;
      throw error;
    }
    return {
      ...payload,
      role: member.role || 'viewer',
      name: member.name || payload.name || '',
      email: member.email || payload.email || '',
      memberId: member.id
    };
  } catch (error) {
    if (!error.status) {
      error.status = 500;
    }
    throw error;
  }
};

const requireAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    const payload = verifyToken(token);
    req.user = await hydrateUserFromDb(payload);
    return next();
  } catch (error) {
    const status = error.status || (error.message === 'Autenticação não configurada' ? 500 : 401);
    return fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    const payload = verifyToken(token);
    const user = await hydrateUserFromDb(payload);
    if (user.role !== 'admin') {
      return fail(res, 'Acesso restrito', 403);
    }
    req.user = user;
    return next();
  } catch (error) {
    const status = error.status || (error.message === 'Autenticação não configurada' ? 500 : 401);
    return fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
};

module.exports = {
  requireAuth,
  requireAdmin
};
