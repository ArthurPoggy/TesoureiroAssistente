const path = require('path');
const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requirePrivileged } = require('../middleware/auth');
const { hashPassword } = require('../utils/auth');

const router = express.Router();

const SEED_DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'test123';
const { createMemberUser, normalizeEmail } = require('../utils/auth');

const TEST_USER_PASSWORD = process.env.SEED_TEST_PASSWORD || 'test123';

const TEST_PROFILES = [
  { name: 'Admin Teste',   email: 'admin_teste@clan.com',   cpf: 'TEST-ADMIN',   role: 'admin' },
  { name: 'Diretor Teste', email: 'diretor_teste@clan.com', cpf: 'TEST-DIRETOR', role: 'diretor_financeiro' },
  { name: 'Viewer Teste',  email: 'viewer_teste@clan.com',  cpf: 'TEST-VIEWER',  role: 'viewer' }
];

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const countRow = await queryOne('SELECT COUNT(*) as total FROM members');
    if (Number(countRow?.total) > 0) {
      return fail(res, 'Base já possui dados. Limpe o banco antes de rodar o seed.');
    }

    const seedData = require(path.join(__dirname, '../data/seed-data.json'));

    // Membros
    const memberIds = [];
    for (const m of seedData.members) {
      const passwordHash = await hashPassword(SEED_DEFAULT_PASSWORD);
      const [row] = await query(
        `INSERT INTO members (name, email, nickname, cpf, role, password_hash, active, must_reset_password)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0) RETURNING id`,
        [m.name, m.email, m.nickname, m.cpf.replace(/\D/g, ''), m.role, passwordHash]
      );
      memberIds.push(row.id);
    }

    // Metas
    const goalIds = [];
    for (const g of seedData.goals) {
      const [row] = await query(
        'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?) RETURNING id',
        [g.title, g.target_amount, g.deadline, g.description]
      );
      goalIds.push(row.id);
    }

    // Eventos
    const eventIds = [];
    for (const e of seedData.events) {
      const [row] = await query(
        'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?) RETURNING id',
        [e.name, e.event_date, e.raised_amount, e.spent_amount, e.description]
      );
      eventIds.push(row.id);
    }

    // Despesas
    for (const ex of seedData.expenses) {
      const eventId = ex.event_ref !== null ? eventIds[ex.event_ref] ?? null : null;
      await execute(
        'INSERT INTO expenses (title, amount, expense_date, category, notes, event_id) VALUES (?, ?, ?, ?, ?, ?)',
        [ex.title, ex.amount, ex.expense_date, ex.category, ex.notes, eventId]
      );
    }

    // Pagamentos
    for (const p of seedData.payments) {
      const memberId = memberIds[p.member_index];
      if (!memberId) continue;
      const paidAt = p.paid ? `${p.year}-${String(p.month).padStart(2, '0')}-${String(Math.floor(Math.random() * 15) + 1).padStart(2, '0')}` : null;
      await execute(
        'INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [memberId, p.month, p.year, p.amount, p.paid ? 1 : 0, paidAt, p.notes]
      );
    }

    // Projetos
    for (const proj of seedData.projects) {
      const [row] = await query(
        'INSERT INTO projects (name, description, status) VALUES (?, ?, ?) RETURNING id',
        [proj.name, proj.description, proj.status]
      );
      for (const memberIndex of proj.member_indexes) {
        const memberId = memberIds[memberIndex];
        if (!memberId) continue;
        await execute(
          'INSERT OR IGNORE INTO member_projects (member_id, project_id) VALUES (?, ?)',
          [memberId, row.id]
        );
      }
    }

    // Configurações
    const settings = seedData.settings;
    for (const [key, value] of Object.entries(settings)) {
      await execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value]
      );
    }

    // Atualizar saldo atual
    const paymentsTotal = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid = 1');
    const expensesTotal = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');
    const balance = Number(paymentsTotal.total) - Number(expensesTotal.total);
    await execute(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['current_balance', String(balance)]
    );

    success(res, {
      message: 'Base populada com sucesso!',
      summary: {
        members: memberIds.length,
        goals: goalIds.length,
        events: eventIds.length,
        expenses: seedData.expenses.length,
        payments: seedData.payments.length,
        projects: seedData.projects.length
      }
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/test-users', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return fail(res, 'Não disponível em produção', 403);
  }
  try {
    const created = [];
    const existing = [];

    for (const profile of TEST_PROFILES) {
      const found = await queryOne(
        'SELECT id, role FROM members WHERE LOWER(email) = ?',
        [normalizeEmail(profile.email)]
      );
      if (found) {
        existing.push({ email: profile.email, role: profile.role });
      } else {
        await createMemberUser({
          name: profile.name,
          email: normalizeEmail(profile.email),
          cpf: profile.cpf,
          password: TEST_USER_PASSWORD,
          role: profile.role
        });
        created.push({ email: profile.email, role: profile.role });
      }
    }

    const credentials = TEST_PROFILES.map((p) => ({
      role: p.role,
      email: p.email,
      password: TEST_USER_PASSWORD
    }));

    return success(res, { created, existing, credentials });
  } catch (error) {
    return fail(res, error.message);
  }
});

module.exports = router;
