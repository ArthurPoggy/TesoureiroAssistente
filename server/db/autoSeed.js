const path = require('path');
const { query, queryOne, execute } = require('./query');
const { hashPassword } = require('../utils/auth');

async function runAutoSeed() {
  try {
    const countRow = await queryOne('SELECT COUNT(*) as total FROM members');
    if (Number(countRow?.total) > 0) return;

    console.log('[seed] Banco vazio detectado em dev — populando dados mockados...');

    const seedData = require(path.join(__dirname, '../data/seed-data.json'));

    const memberIds = [];
    for (const m of seedData.members) {
      const passwordHash = await hashPassword(m.password);
      const [row] = await query(
        `INSERT INTO members (name, email, nickname, cpf, role, password_hash, active, must_reset_password)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0) RETURNING id`,
        [m.name, m.email, m.nickname, m.cpf.replace(/\D/g, ''), m.role, passwordHash]
      );
      memberIds.push(row.id);
    }

    const goalIds = [];
    for (const g of seedData.goals) {
      const [row] = await query(
        'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?) RETURNING id',
        [g.title, g.target_amount, g.deadline, g.description]
      );
      goalIds.push(row.id);
    }

    const eventIds = [];
    for (const e of seedData.events) {
      const [row] = await query(
        'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?) RETURNING id',
        [e.name, e.event_date, e.raised_amount, e.spent_amount, e.description]
      );
      eventIds.push(row.id);
    }

    for (const ex of seedData.expenses) {
      const eventId = ex.event_ref !== null ? eventIds[ex.event_ref] ?? null : null;
      await execute(
        'INSERT INTO expenses (title, amount, expense_date, category, notes, event_id) VALUES (?, ?, ?, ?, ?, ?)',
        [ex.title, ex.amount, ex.expense_date, ex.category, ex.notes, eventId]
      );
    }

    for (const p of seedData.payments) {
      const memberId = memberIds[p.member_index];
      if (!memberId) continue;
      const day = String(Math.floor(Math.random() * 15) + 1).padStart(2, '0');
      const paidAt = p.paid ? `${p.year}-${String(p.month).padStart(2, '0')}-${day}` : null;
      await execute(
        'INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [memberId, p.month, p.year, p.amount, p.paid ? 1 : 0, paidAt, p.notes]
      );
    }

    for (const proj of seedData.projects) {
      const [row] = await query(
        'INSERT INTO projects (name, description, status) VALUES (?, ?, ?) RETURNING id',
        [proj.name, proj.description, proj.status]
      );
      for (const idx of proj.member_indexes) {
        if (memberIds[idx]) {
          await execute(
            'INSERT OR IGNORE INTO member_projects (member_id, project_id) VALUES (?, ?)',
            [memberIds[idx], row.id]
          );
        }
      }
    }

    for (const [key, value] of Object.entries(seedData.settings)) {
      await execute(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value]
      );
    }

    const paymentsTotal = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid = 1');
    const expensesTotal = await queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');
    const balance = Number(paymentsTotal.total) - Number(expensesTotal.total);
    await execute(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      ['current_balance', String(balance)]
    );

    console.log(`[seed] Concluído: ${memberIds.length} membros, ${seedData.payments.length} pagamentos, ${seedData.projects.length} projetos.`);
  } catch (error) {
    console.error('[seed] Erro ao popular banco:', error.message);
  }
}

module.exports = { runAutoSeed };
