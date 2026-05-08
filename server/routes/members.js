const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
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

router.get('/', requireAuth, async (req, res) => {
  try {
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
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name, email, nickname, cpf } = req.body || {};
    if (!name || !email || !cpf) {
      return fail(res, 'Nome, email e registro são obrigatórios');
    }
    if (!isValidCpf(cpf)) {
      return fail(res, 'Informe um registro válido');
    }
    const normalizedEmail = normalizeEmail(email);
    const normalizedCpf = normalizeCpf(cpf);
    const existing = await queryOne(
      'SELECT id FROM members WHERE LOWER(email) = ? OR cpf = ?',
      [normalizedEmail, normalizedCpf]
    );
    if (existing) {
      return fail(res, 'Email ou registro já cadastrado', 409);
    }
    const setupToken = generateToken();
    const tempPassword = generatePassword();
    const member = await createMemberUser({
      name,
      email: normalizedEmail,
      nickname,
      cpf: normalizedCpf,
      password: tempPassword,
      mustResetPassword: true,
      setupTokenHash: hashSetupToken(setupToken)
    });
    success(res, { member, setupToken });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, nickname, cpf } = req.body || {};
    if (!name || !email || !cpf) {
      return fail(res, 'Nome, email e registro são obrigatórios', 400);
    }
    if (!isValidCpf(cpf)) {
      return fail(res, 'Informe um registro válido', 400);
    }
    const normalizedEmail = normalizeEmail(email);
    const normalizedCpf = normalizeCpf(cpf);
    const existing = await queryOne(
      'SELECT id FROM members WHERE (LOWER(email) = ? OR cpf = ?) AND id <> ?',
      [normalizedEmail, normalizedCpf, Number(id)]
    );
    if (existing) {
      return fail(res, 'Email ou registro já cadastrado', 409);
    }
    const [member] = await query(
      'UPDATE members SET name = ?, email = ?, nickname = ?, cpf = ? WHERE id = ? RETURNING id, name, email, nickname, cpf, role, active, must_reset_password, joined_at',
      [name, normalizedEmail, nickname, normalizedCpf, id]
    );
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/:id/invite', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const member = await queryOne(
      'SELECT id, name, email, nickname, cpf, role, active, must_reset_password, joined_at FROM members WHERE id = ?',
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
      'SELECT id, name, email, nickname, cpf, role, active, must_reset_password, joined_at FROM members WHERE id = ?',
      [id]
    );
    success(res, { member: refreshed || member, setupToken });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM members WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id/role', requireAdmin, async (req, res) => {
  try {
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
      'UPDATE members SET role = ? WHERE id = ? RETURNING id, name, email, nickname, cpf, role, active, must_reset_password, joined_at',
      [role, id]
    );
    if (!member) {
      return fail(res, 'Membro não encontrado', 404);
    }
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/:id/summary', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const member = await queryOne(
      'SELECT id, name, email, nickname, cpf, role, active, must_reset_password, joined_at FROM members WHERE id = ?',
      [id]
    );
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
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/delinquent', requireAuth, async (req, res) => {
  try {
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
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
