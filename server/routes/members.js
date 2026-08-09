const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail, asyncHandler } = require('../utils/response');
const { requireAuth, requireAdmin, requirePrivileged } = require('../middleware/auth');
const { isPrivilegedRequest } = require('../utils/roles');
const {
  normalizeEmail,
  normalizeCpf,
  isValidCpf,
  hashSetupToken,
  hashPassword,
  generateToken,
  generatePassword,
  createMemberUser
} = require('../utils/auth');

const router = express.Router();

const MEMBER_SUMMARY_FIELDS = 'id, name, email, nickname, cpf, role, active, must_reset_password, joined_at';

// Valida nome/email/cpf compartilhados entre criação e edição de membro,
// garantindo que não existam duplicatas de email ou cpf (opcionalmente
// ignorando o próprio registro em edições).
const validateMemberFields = async ({ name, email, cpf, excludeId }) => {
  if (!name || !email || !cpf) {
    return { error: 'Nome, email e registro são obrigatórios' };
  }
  if (!isValidCpf(cpf)) {
    return { error: 'Informe um registro válido' };
  }
  const normalizedEmail = normalizeEmail(email);
  const normalizedCpf = normalizeCpf(cpf);
  let sql = 'SELECT id FROM members WHERE (LOWER(email) = ? OR cpf = ?)';
  const params = [normalizedEmail, normalizedCpf];
  if (excludeId) {
    sql += ' AND id <> ?';
    params.push(Number(excludeId));
  }
  const existing = await queryOne(sql, params);
  if (existing) {
    return { error: 'Email ou registro já cadastrado', status: 409 };
  }
  return { normalizedEmail, normalizedCpf };
};

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const isAdminRequest = isPrivilegedRequest(req);
  const baseFields = ['id', 'name', 'email', 'nickname', 'cpf', 'joined_at'];
  const adminFields = ['role', 'active', 'must_reset_password'];
  const fields = isAdminRequest ? baseFields.concat(adminFields) : baseFields;
  let sql = `SELECT ${fields.join(', ')} FROM members`;
  const params = [];
  if (!isAdminRequest) {
    if (!req.user?.memberId) {
      return success(res, { members: [] });
    }
    sql += ' WHERE id = ?';
    params.push(req.user.memberId);
  }
  sql += ' ORDER BY name';
  const members = await query(sql, params);
  success(res, { members });
}));

router.get('/delinquent', requirePrivileged, asyncHandler(async (req, res) => {
  const { month, year, memberId } = req.query;
  const isAdminRequest = isPrivilegedRequest(req);
  const effectiveMemberId = isAdminRequest ? memberId : req.user?.memberId;
  if (!isAdminRequest && !effectiveMemberId) {
    return success(res, { members: [] });
  }
  const monthValue = month ? Number(month) : null;
  const yearValue = year ? Number(year) : null;
  let sql = `SELECT DISTINCT m.id, m.name, m.email, m.nickname, m.joined_at
     FROM members m
     LEFT JOIN payments p ON p.member_id = m.id`;
  const params = [];
  const joinFilters = [];
  if (monthValue) {
    joinFilters.push('p.month = ?');
    params.push(monthValue);
  }
  if (yearValue) {
    joinFilters.push('p.year = ?');
    params.push(yearValue);
  }
  if (joinFilters.length) {
    sql += ` AND ${joinFilters.join(' AND ')}`;
  }
  sql += ' WHERE (p.id IS NULL OR p.paid IS NOT TRUE)';
  if (effectiveMemberId) {
    sql += ' AND m.id = ?';
    params.push(Number(effectiveMemberId));
  }
  sql += ' ORDER BY m.name';
  const members = await query(sql, params);
  success(res, { members });
}));

router.post('/', requirePrivileged, asyncHandler(async (req, res) => {
  const { name, email, nickname, cpf } = req.body || {};
  const validation = await validateMemberFields({ name, email, cpf });
  if (validation.error) {
    return fail(res, validation.error, validation.status || 400);
  }
  const setupToken = generateToken();
  const tempPassword = generatePassword();
  const member = await createMemberUser({
    name,
    email: validation.normalizedEmail,
    nickname,
    cpf: validation.normalizedCpf,
    password: tempPassword,
    mustResetPassword: true,
    setupTokenHash: hashSetupToken(setupToken)
  });
  success(res, { member, setupToken });
}));

router.put('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, nickname, cpf } = req.body || {};
  const validation = await validateMemberFields({ name, email, cpf, excludeId: id });
  if (validation.error) {
    return fail(res, validation.error, validation.status || 400);
  }
  const [member] = await query(
    `UPDATE members SET name = ?, email = ?, nickname = ?, cpf = ? WHERE id = ? RETURNING ${MEMBER_SUMMARY_FIELDS}`,
    [name, validation.normalizedEmail, nickname, validation.normalizedCpf, id]
  );
  success(res, { member });
}));

router.post('/:id/invite', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const member = await queryOne(
    `SELECT ${MEMBER_SUMMARY_FIELDS} FROM members WHERE id = ?`,
    [id]
  );
  if (!member) {
    return fail(res, 'Membro não encontrado', 404);
  }
  if (!member.email) {
    return fail(res, 'Informe um email para gerar o link de acesso', 400);
  }
  const setupToken = generateToken();
  const tempPassword = generatePassword();
  const passwordHash = await hashPassword(tempPassword);
  await execute(
    'UPDATE members SET password_hash = ?, must_reset_password = 1, setup_token_hash = ?, setup_token_created_at = ? WHERE id = ?',
    [passwordHash, hashSetupToken(setupToken), new Date().toISOString(), id]
  );
  const refreshed = await queryOne(
    `SELECT ${MEMBER_SUMMARY_FIELDS} FROM members WHERE id = ?`,
    [id]
  );
  success(res, { member: refreshed || member, setupToken });
}));

router.delete('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await execute('DELETE FROM members WHERE id = ?', [id]);
  success(res);
}));

router.put('/:id/role', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};
  const allowedRoles = ['viewer', 'admin', 'diretor_financeiro'];
  if (!role || !allowedRoles.includes(role)) {
    return fail(res, 'Role inválida. Use: viewer, admin ou diretor_financeiro', 400);
  }
  if (String(id) === String(req.user?.memberId)) {
    return fail(res, 'Você não pode alterar o próprio cargo', 403);
  }
  const [member] = await query(
    `UPDATE members SET role = ? WHERE id = ? RETURNING ${MEMBER_SUMMARY_FIELDS}`,
    [role, id]
  );
  if (!member) {
    return fail(res, 'Membro não encontrado', 404);
  }
  success(res, { member });
}));

router.get('/:id/summary', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const member = await queryOne(`SELECT ${MEMBER_SUMMARY_FIELDS} FROM members WHERE id = ?`, [id]);
  if (!member) return fail(res, 'Membro não encontrado', 404);

  const paymentRow = await queryOne(
    'SELECT COUNT(*) as total, SUM(amount) as total_amount FROM payments WHERE member_id = ?',
    [id]
  );

  const lastPayment = await queryOne(
    'SELECT month, year, paid_at FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC LIMIT 1',
    [id]
  );

  const activeProjects = await query(
    `SELECT p.id, p.name FROM projects p
     JOIN member_projects mp ON mp.project_id = p.id
     WHERE mp.member_id = ? AND p.status = 'active'
     ORDER BY p.name`,
    [id]
  );

  success(res, {
    member,
    payments: {
      total: paymentRow?.total || 0,
      totalAmount: paymentRow?.total_amount || 0,
      lastPayment: lastPayment || null
    },
    activeProjects
  });
}));

module.exports = router;
