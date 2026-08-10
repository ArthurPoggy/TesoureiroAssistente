const { getTokenFromRequest, verifyToken } = require('../utils/auth');
const { queryOne } = require('../db/query');
const { fail } = require('../utils/response');
const { isPrivilegedRole } = require('../utils/roles');
const { getEffectivePermissions } = require('../utils/permissions');

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

const requirePrivileged = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    const payload = verifyToken(token);
    const user = await hydrateUserFromDb(payload);
    if (!isPrivilegedRole(user.role)) {
      return fail(res, 'Acesso restrito', 403);
    }
    req.user = user;
    return next();
  } catch (error) {
    const status = error.status || (error.message === 'Autenticação não configurada' ? 500 : 401);
    return fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
};

// requirePermission(codigoPermissao) calcula a permissão efetiva do usuário
// logado (preset do role + overrides de member_permissions, override sempre
// sobrescreve o preset) e responde 403 quando a permissão não está concedida.
// Deve ser usado após requireAuth, que já popula req.user.
const requirePermission = (permissionCode) => async (req, res, next) => {
  try {
    if (!req.user?.memberId) {
      return fail(res, 'Não autorizado', 401);
    }
    const effectivePermissions = await getEffectivePermissions(req.user.memberId);
    if (!effectivePermissions.includes(permissionCode)) {
      return fail(res, 'Acesso restrito', 403);
    }
    return next();
  } catch (error) {
    const status = error.status || 500;
    return fail(res, error.message || 'Erro ao verificar permissão', status);
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  requirePrivileged,
  requirePermission
};
