const express = require('express');
const config = require('../config');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');
const {
  normalizeEmail,
  normalizeCpf,
  isValidCpf,
  signToken,
  hashSetupToken,
  hashPassword,
  comparePassword,
  createMemberUser
} = require('../utils/auth');

const router = express.Router();

router.get('/health', (req, res) => success(res, { status: 'running' }));

router.post('/login', async (req, res) => {
  try {
    if (!config.jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, 'Informe email e senha', 400);
    }
    const normalizedEmail = normalizeEmail(email);
    if (
      config.adminConfigured &&
      normalizedEmail === normalizeEmail(config.ADMIN_EMAIL) &&
      password === config.ADMIN_PASSWORD
    ) {
      const token = signToken({ role: 'admin', email: config.ADMIN_EMAIL, memberId: null });
      return success(res, { token, role: 'admin', email: config.ADMIN_EMAIL, memberId: null });
    }
    const member = await queryOne(
      'SELECT id, name, email, password_hash, role, active, must_reset_password FROM members WHERE LOWER(email) = ?',
      [normalizedEmail]
    );
    if (!member || member.active === 0 || member.active === false || !member.password_hash) {
      return fail(res, 'Credenciais inválidas', 401);
    }
    if (member.must_reset_password) {
      return fail(res, 'Defina sua senha pelo link de primeiro acesso', 403);
    }
    const matches = await comparePassword(password, member.password_hash);
    if (!matches) {
      return fail(res, 'Credenciais inválidas', 401);
    }
    const role = member.role || 'viewer';
    const token = signToken({ role, email: member.email, memberId: member.id, name: member.name || '' });
    return success(res, {
      token,
      role,
      email: member.email,
      name: member.name || '',
      memberId: member.id
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/register', async (req, res) => {
  try {
    if (!config.jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { name, email, password, cpf } = req.body || {};
    if (!name || !email || !password || !cpf) {
      return fail(res, 'Informe nome, email, CPF e senha', 400);
    }
    if (!isValidCpf(cpf)) {
      return fail(res, 'Informe um CPF válido', 400);
    }
    const normalizedEmail = normalizeEmail(email);
    const normalizedCpf = normalizeCpf(cpf);
    const existing = await queryOne(
      'SELECT id FROM members WHERE LOWER(email) = ? OR cpf = ?',
      [normalizedEmail, normalizedCpf]
    );
    if (existing) {
      return fail(res, 'Email ou CPF já cadastrado', 409);
    }
    const countRow = await queryOne('SELECT COUNT(*) as total FROM members');
    const isFirstMember = Number(countRow?.total || 0) === 0;
    const role = isFirstMember ? 'admin' : 'viewer';
    const member = await createMemberUser({
      name,
      email: normalizedEmail,
      password,
      cpf: normalizedCpf,
      role
    });
    if (!member) {
      return fail(res, 'Email já cadastrado', 409);
    }
    const token = signToken({ role, email: member.email, memberId: member.id, name: member.name || '' });
    return success(res, {
      token,
      role,
      memberId: member.id,
      name: member.name || '',
      email: member.email
    });
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('unique')) {
      return fail(res, 'Email já cadastrado', 409);
    }
    fail(res, error.message);
  }
});

router.post('/setup-password', async (req, res) => {
  try {
    if (!config.jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { token, password } = req.body || {};
    if (!token || !password) {
      return fail(res, 'Informe token e senha', 400);
    }
    const tokenHash = hashSetupToken(token);
    const member = await queryOne(
      'SELECT id, name, email, role, active FROM members WHERE setup_token_hash = ?',
      [tokenHash]
    );
    if (!member || member.active === 0 || member.active === false) {
      return fail(res, 'Token inválido', 400);
    }
    const passwordHash = await hashPassword(password);
    await execute(
      'UPDATE members SET password_hash = ?, must_reset_password = 0, setup_token_hash = NULL, setup_token_created_at = NULL WHERE id = ?',
      [passwordHash, member.id]
    );
    const authToken = signToken({ role: member.role || 'viewer', email: member.email, memberId: member.id, name: member.name || '' });
    return success(res, {
      token: authToken,
      role: member.role || 'viewer',
      email: member.email,
      name: member.name || '',
      memberId: member.id
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/me', requireAuth, (req, res) => {
  success(res, {
    role: req.user?.role,
    email: req.user?.email,
    name: req.user?.name || '',
    memberId: req.user?.memberId ?? null
  });
});

module.exports = router;
