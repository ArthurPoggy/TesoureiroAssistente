const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { Pool, types } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const NUMERIC_OID = 1700;
const BIGINT_OID = 20;
types.setTypeParser(NUMERIC_OID, (value) => (value === null ? null : Number(value)));
types.setTypeParser(BIGINT_OID, (value) => (value === null ? null : Number(value)));

const PORT = process.env.PORT || 4000;
const app = express();
const isVercel = Boolean(process.env.VERCEL);
const useSupabase = Boolean(process.env.SUPABASE_DB_URL);

app.use(cors());
app.use(express.json());

let sqliteDb;
let pgPool;

if (useSupabase) {
  if (!globalThis.__tesoureiroPgPool) {
    globalThis.__tesoureiroPgPool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }
  pgPool = globalThis.__tesoureiroPgPool;
} else {
  const Database = require('better-sqlite3');
  // On Vercel we only have write access to /tmp, locally we keep the DB under ./data
  const dataDir = process.env.DATA_DIR || path.join(isVercel ? '/tmp' : __dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'tesoureiro.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('foreign_keys = ON');
}

const migrations = [
  `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      nickname TEXT,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      deadline TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      raised_amount REAL DEFAULT 0,
      spent_amount REAL DEFAULT 0,
      description TEXT
    )`,
  `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 1,
      paid_at TEXT,
      notes TEXT,
      goal_id INTEGER,
      UNIQUE(member_id, month, year),
      FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE,
      FOREIGN KEY(goal_id) REFERENCES goals(id) ON DELETE SET NULL
    )`,
  `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      category TEXT,
      notes TEXT,
      event_id INTEGER,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
    )`,
  `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      active INTEGER NOT NULL DEFAULT 1,
      must_reset_password INTEGER NOT NULL DEFAULT 0,
      setup_token_hash TEXT,
      setup_token_created_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  `ALTER TABLE users ADD COLUMN must_reset_password INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN setup_token_hash TEXT`,
  `ALTER TABLE users ADD COLUMN setup_token_created_at TEXT`
];

if (!useSupabase) {
  const runMigration = (sql) => {
    try {
      sqliteDb.prepare(sql).run();
    } catch (error) {
      if (/duplicate column|already exists/i.test(error.message)) {
        return;
      }
      throw error;
    }
  };
  migrations.forEach(runMigration);
}

const convertPlaceholders = (sql) => {
  if (!useSupabase) return sql;
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
};

const query = async (sql, params = []) => {
  if (useSupabase) {
    const text = convertPlaceholders(sql);
    const { rows } = await pgPool.query(text, params);
    return rows;
  }
  const stmt = sqliteDb.prepare(sql);
  return stmt.all(...params);
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0];
};

const execute = async (sql, params = []) => {
  if (useSupabase) {
    const text = convertPlaceholders(sql);
    await pgPool.query(text, params);
    return;
  }
  sqliteDb.prepare(sql).run(...params);
};

const success = (res, payload = {}) => res.json({ ok: true, ...payload });
const fail = (res, message, status = 400) => res.status(status).json({ ok: false, message });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'tesoureiroassistente-secret';
const adminConfigured = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
const jwtConfigured = Boolean(JWT_SECRET);

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

const verifyToken = (token) => {
  if (!jwtConfigured) {
    throw new Error('Autenticação não configurada');
  }
  return jwt.verify(token, JWT_SECRET);
};

const hashSetupToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createViewerUser = async ({ name, email, password, mustResetPassword = false, setupTokenHash = null }) => {
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await query(
    `INSERT INTO users (name, email, password_hash, role, active, must_reset_password, setup_token_hash, setup_token_created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id, name, email, role, active, must_reset_password, created_at`,
    [
      name || '',
      email,
      passwordHash,
      'viewer',
      1,
      mustResetPassword ? 1 : 0,
      setupTokenHash,
      setupTokenHash ? new Date().toISOString() : null
    ]
  );
  return user;
};

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

app.get('/api/health', (req, res) => success(res, { status: 'running' }));

app.post('/api/login', async (req, res) => {
  try {
    if (!jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, 'Informe email e senha', 400);
    }
    if (adminConfigured && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ role: 'admin', email }, JWT_SECRET, { expiresIn: '12h' });
      return success(res, { token, role: 'admin' });
    }
    const user = await queryOne(
      'SELECT id, name, email, password_hash, role, active, must_reset_password FROM users WHERE email = ?',
      [email]
    );
    if (!user || user.active === 0 || user.active === false) {
      return fail(res, 'Credenciais inválidas', 401);
    }
    if (user.must_reset_password) {
      return fail(res, 'Defina sua senha pelo link de primeiro acesso', 403);
    }
    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return fail(res, 'Credenciais inválidas', 401);
    }
    const role = user.role || 'viewer';
    const token = jwt.sign(
      { role, email: user.email, userId: user.id, name: user.name || '' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return success(res, { token, role });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/register', async (req, res) => {
  try {
    if (!jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return fail(res, 'Informe email e senha', 400);
    }
    const user = await createViewerUser({ name, email, password });
    if (!user) {
      return fail(res, 'Email já cadastrado', 409);
    }
    const token = jwt.sign(
      { role: 'viewer', email: user.email, userId: user.id, name: user.name || '' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return success(res, { token, role: 'viewer' });
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('unique')) {
      return fail(res, 'Email já cadastrado', 409);
    }
    fail(res, error.message);
  }
});

app.post('/api/setup-password', async (req, res) => {
  try {
    if (!jwtConfigured) {
      return fail(res, 'Autenticação não configurada', 500);
    }
    const { token, password } = req.body || {};
    if (!token || !password) {
      return fail(res, 'Informe token e senha', 400);
    }
    const tokenHash = hashSetupToken(token);
    const user = await queryOne(
      'SELECT id, name, email, role, active FROM users WHERE setup_token_hash = ?',
      [tokenHash]
    );
    if (!user || user.active === 0 || user.active === false) {
      return fail(res, 'Token inválido', 400);
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await execute(
      'UPDATE users SET password_hash = ?, must_reset_password = 0, setup_token_hash = NULL, setup_token_created_at = NULL WHERE id = ?',
      [passwordHash, user.id]
    );
    const authToken = jwt.sign(
      { role: user.role || 'viewer', email: user.email, userId: user.id, name: user.name || '' },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return success(res, { token: authToken, role: user.role || 'viewer', email: user.email, name: user.name || '' });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/me', (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return fail(res, 'Não autorizado', 401);
    }
    const payload = verifyToken(token);
    success(res, { role: payload.role, email: payload.email, name: payload.name || '' });
  } catch (error) {
    const status = error.message === 'Autenticação não configurada' ? 500 : 401;
    fail(res, error.message === 'Autenticação não configurada' ? error.message : 'Não autorizado', status);
  }
});

// Users (viewers) --------------------------------------------
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, active, must_reset_password, created_at FROM users ORDER BY created_at DESC'
    );
    success(res, { users });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!email) {
      return fail(res, 'Informe email', 400);
    }
    const setupToken = crypto.randomBytes(24).toString('hex');
    const tempPassword = crypto.randomBytes(18).toString('base64url');
    const user = await createViewerUser({
      name,
      email,
      password: tempPassword,
      mustResetPassword: true,
      setupTokenHash: hashSetupToken(setupToken)
    });
    if (!user) {
      return fail(res, 'Email já cadastrado', 409);
    }
    success(res, { user, setupToken });
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes('unique')) {
      return fail(res, 'Email já cadastrado', 409);
    }
    fail(res, error.message);
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM users WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Members -----------------------------------------------------
app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const members = await query('SELECT * FROM members ORDER BY name');
    success(res, { members });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/members', requireAdmin, async (req, res) => {
  try {
    const { name, email, nickname } = req.body;
    if (!name) {
      return fail(res, 'Nome é obrigatório');
    }
    const [member] = await query(
      'INSERT INTO members (name, email, nickname) VALUES (?, ?, ?) RETURNING *',
      [name, email, nickname]
    );
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/members/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, nickname } = req.body;
    const [member] = await query(
      'UPDATE members SET name = ?, email = ?, nickname = ? WHERE id = ? RETURNING *',
      [name, email, nickname, id]
    );
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/members/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM members WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Payments ----------------------------------------------------
app.get('/api/payments', requireAuth, async (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    let sql = `
      SELECT p.*, m.name AS member_name
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE 1 = 1
    `;
    const params = [];
    if (month) {
      sql += ' AND p.month = ?';
      params.push(Number(month));
    }
    if (year) {
      sql += ' AND p.year = ?';
      params.push(Number(year));
    }
    if (memberId) {
      sql += ' AND p.member_id = ?';
      params.push(Number(memberId));
    }
    sql += ' ORDER BY p.year DESC, p.month DESC';
    const payments = await query(sql, params);
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/payments/history/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const payments = await query(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC',
      [memberId]
    );
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/payments', requireAdmin, async (req, res) => {
  try {
    const { memberId, month, year, amount, paid, paidAt, notes, goalId } = req.body;
    if (!memberId || !month || !year || !amount) {
      return fail(res, 'Campos obrigatórios não preenchidos');
    }
    const paidValue = Boolean(paid);
    const [payment] = await query(
      `
      INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes, goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id, month, year) DO UPDATE SET
        amount = excluded.amount,
        paid = excluded.paid,
        paid_at = excluded.paid_at,
        notes = excluded.notes,
        goal_id = excluded.goal_id
      RETURNING *
    `,
      [memberId, month, year, amount, paidValue, paidAt, notes, goalId || null]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/payments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid, paidAt, notes, goalId } = req.body;
    const paidValue = Boolean(paid);
    const [payment] = await query(
      'UPDATE payments SET amount = ?, paid = ?, paid_at = ?, notes = ?, goal_id = ? WHERE id = ? RETURNING *',
      [amount, paidValue, paidAt, notes, goalId || null, id]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/payments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM payments WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/payments/:id/receipt', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await queryOne(
      `SELECT p.*, m.name AS member_name, m.email 
       FROM payments p 
       JOIN members m ON m.id = p.member_id 
       WHERE p.id = ?`,
      [id]
    );
    if (!payment) {
      return fail(res, 'Pagamento não encontrado', 404);
    }

    const doc = new PDFDocument();
    const filename = `recibo-${payment.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('Recibo de Pagamento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Membro: ${payment.member_name}`);
    doc.text(`Email: ${payment.email || 'não informado'}`);
    doc.text(`Referente: ${payment.month}/${payment.year}`);
    doc.text(`Valor: R$ ${payment.amount.toFixed(2)}`);
    doc.text(`Status: ${payment.paid ? 'Pago' : 'Pendente'}`);
    doc.text(`Data de pagamento: ${payment.paid_at || 'não informado'}`);
    if (payment.notes) {
      doc.moveDown();
      doc.text(`Observações: ${payment.notes}`);
    }
    doc.moveDown();
    doc.text('Obrigado pela contribuição!', { align: 'center' });
    doc.end();
  } catch (error) {
    fail(res, error.message);
  }
});

// Goals -------------------------------------------------------
app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    const goals = await query('SELECT * FROM goals ORDER BY deadline');
    const totalsRows = await query(
      'SELECT goal_id, SUM(amount) as total FROM payments WHERE goal_id IS NOT NULL GROUP BY goal_id'
    );
    const goalTotals = totalsRows.reduce(
      (acc, curr) => ({ ...acc, [curr.goal_id]: Number(curr.total) || 0 }),
      {}
    );
    const enriched = goals.map((goal) => ({
      ...goal,
      raised: goalTotals[goal.id] || 0,
      progress: goal.target_amount ? Math.min(100, ((goalTotals[goal.id] || 0) / goal.target_amount) * 100) : 0
    }));
    success(res, { goals: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/goals', requireAdmin, async (req, res) => {
  try {
    const { title, targetAmount, deadline, description } = req.body;
    if (!title || !targetAmount) {
      return fail(res, 'Título e valor alvo são obrigatórios');
    }
    const [goal] = await query(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?) RETURNING *',
      [title, targetAmount, deadline, description]
    );
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/goals/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetAmount, deadline, description } = req.body;
    const [goal] = await query(
      'UPDATE goals SET title = ?, target_amount = ?, deadline = ?, description = ? WHERE id = ? RETURNING *',
      [title, targetAmount, deadline, description, id]
    );
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/goals/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM goals WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Expenses ----------------------------------------------------
app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses ORDER BY expense_date DESC');
    success(res, { expenses });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/expenses', requireAdmin, async (req, res) => {
  try {
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    if (!title || !amount || !expenseDate) {
      return fail(res, 'Título, valor e data são obrigatórios');
    }
    const [expense] = await query(
      'INSERT INTO expenses (title, amount, expense_date, category, notes, event_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
      [title, amount, expenseDate, category, notes, eventId || null]
    );
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/expenses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    const [expense] = await query(
      'UPDATE expenses SET title = ?, amount = ?, expense_date = ?, category = ?, notes = ?, event_id = ? WHERE id = ? RETURNING *',
      [title, amount, expenseDate, category, notes, eventId || null, id]
    );
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/expenses/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM expenses WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Events ------------------------------------------------------
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const events = await query('SELECT * FROM events ORDER BY event_date DESC');
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/events', requireAdmin, async (req, res) => {
  try {
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    if (!name || !eventDate) {
      return fail(res, 'Nome e data do evento são obrigatórios');
    }
    const [event] = await query(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, eventDate, raisedAmount || 0, spentAmount || 0, description]
    );
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/events/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    const [event] = await query(
      'UPDATE events SET name = ?, event_date = ?, raised_amount = ?, spent_amount = ?, description = ? WHERE id = ? RETURNING *',
      [name, eventDate, raisedAmount || 0, spentAmount || 0, description, id]
    );
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/events/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM events WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Reports & dashboard ----------------------------------------
const sumPayments = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid';
  const params = [];
  if (filters.year) {
    sql += ' AND year = ?';
    params.push(filters.year);
  }
  if (filters.month) {
    sql += ' AND month = ?';
    params.push(filters.month);
  }
  if (filters.memberId) {
    sql += ' AND member_id = ?';
    params.push(filters.memberId);
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

const sumExpenses = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1 = 1';
  const params = [];
  if (filters.year) {
    sql += useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
    params.push(filters.year);
  }
  if (filters.month) {
    sql += useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
    params.push(useSupabase ? filters.month : String(filters.month).padStart(2, '0'));
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

app.get('/api/reports/monthly', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    const total = await sumPayments({ month: Number(month), year: Number(year) });
    success(res, { month: Number(month), year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/reports/annual', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return fail(res, 'Informe o ano');
    }
    const total = await sumPayments({ year: Number(year) });
    success(res, { year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/reports/balance', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? Number(year) : undefined;
    const [totalRaised, totalExpenses] = await Promise.all([
      sumPayments({ year: yearNum }),
      sumExpenses({ year: yearNum })
    ]);
    success(res, { totalRaised, totalExpenses, balance: totalRaised - totalExpenses });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/members/delinquent', requireAuth, async (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    let sql = `SELECT m.*
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id AND p.month = ? AND p.year = ?
       WHERE (p.id IS NULL OR p.paid IS NOT TRUE)`;
    const params = [Number(month), Number(year)];
    if (memberId) {
      sql += ' AND m.id = ?';
      params.push(Number(memberId));
    }
    sql += ' ORDER BY m.name';
    const members = await query(sql, params);
    success(res, { members });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/ranking', requireAuth, async (req, res) => {
  try {
    const { year, memberId } = req.query;
    const params = [];
    let filter = '';
    if (year) {
      filter = 'AND p.year = ?';
      params.push(Number(year));
    }
    if (memberId) {
      filter = `${filter} AND m.id = ?`;
      params.push(Number(memberId));
    }
    const ranking = await query(
      `SELECT m.name, COUNT(p.id) AS payments
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id AND p.paid ${filter}
       GROUP BY m.id
       ORDER BY payments DESC, m.name ASC`,
      params
    );
    success(res, { ranking });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/dashboard', requireAuth, async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    let monthlySql = `SELECT year, month, SUM(amount) AS total 
       FROM payments 
       WHERE paid AND year = ?`;
    const monthlyParams = [year];
    if (memberId) {
      monthlySql += ' AND member_id = ?';
      monthlyParams.push(memberId);
    }
    monthlySql += ' GROUP BY year, month ORDER BY month';
    const monthly = await query(monthlySql, monthlyParams);

    const totalRaised = await sumPayments({ year, memberId });
    const totalExpenses = memberId ? 0 : await sumExpenses({ year });
    let goalSql = `SELECT g.*, COALESCE(SUM(p.amount), 0) AS raised
       FROM goals g
       LEFT JOIN payments p ON p.goal_id = g.id AND p.paid`;
    const goalParams = [];
    if (memberId) {
      goalSql += ' AND p.member_id = ?';
      goalParams.push(memberId);
    }
    goalSql += ' GROUP BY g.id';
    const goalRows = await query(goalSql, goalParams);
    const goalData = goalRows.map((goal) => ({
      ...goal,
      progress: goal.target_amount ? Math.min(100, (goal.raised / goal.target_amount) * 100) : 0
    }));

    let delinquentSql = `SELECT m.name
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id AND p.month = ? AND p.year = ?
         WHERE (p.id IS NULL OR p.paid IS NOT TRUE)`;
    const delinquentParams = [month, year];
    if (memberId) {
      delinquentSql += ' AND m.id = ?';
      delinquentParams.push(memberId);
    }
    delinquentSql += ' ORDER BY m.name';
    const delinquentMembers = (await query(delinquentSql, delinquentParams)).map((row) => row.name);

    let rankingSql = `SELECT m.name, COUNT(p.id) AS payments
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id AND p.paid AND p.year = ?`;
    const rankingParams = [year];
    if (memberId) {
      rankingSql += ' WHERE m.id = ?';
      rankingParams.push(memberId);
    }
    rankingSql += ' GROUP BY m.id ORDER BY payments DESC, m.name ASC LIMIT 5';
    const ranking = await query(rankingSql, rankingParams);

    success(res, {
      totalRaised,
      totalExpenses,
      balance: totalRaised - totalExpenses,
      monthlyCollections: monthly,
      goals: goalData,
      delinquentMembers,
      ranking
    });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/reports/export', requireAuth, async (req, res) => {
  try {
    const { format = 'csv', type = 'payments', month, year } = req.query;
    let rows = [];
    if (type === 'expenses') {
      let sql = 'SELECT title, amount, expense_date AS date, category, notes FROM expenses WHERE 1 = 1';
      const params = [];
      if (year) {
        sql += useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
        params.push(year);
      }
      if (month) {
        sql += useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
        params.push(useSupabase ? Number(month) : String(month).padStart(2, '0'));
      }
      rows = await query(sql, params);
    } else {
      let sql = `
        SELECT m.name AS member, month, year, amount, paid, paid_at AS paidAt
        FROM payments p
        JOIN members m ON m.id = p.member_id
        WHERE 1 = 1
      `;
      const params = [];
      if (year) {
        sql += ' AND year = ?';
        params.push(Number(year));
      }
      if (month) {
        sql += ' AND month = ?';
        params.push(Number(month));
      }
      rows = await query(sql, params);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.pdf"`);
      doc.pipe(res);
      doc.fontSize(18).text(`Relatório de ${type === 'expenses' ? 'despesas' : 'pagamentos'}`);
      doc.moveDown();
      rows.forEach((row) => {
        Object.entries(row).forEach(([key, value]) => {
          doc.fontSize(12).text(`${key}: ${value}`);
        });
        doc.moveDown();
      });
      doc.end();
    } else {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => `"${row[header] ?? ''}"`).join(','))
      ];
      const csv = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/events/summary', requireAuth, async (req, res) => {
  try {
    const events = await query(
      `SELECT name, event_date as date, raised_amount as raised, spent_amount as spent,
              (raised_amount - spent_amount) as balance
       FROM events ORDER BY event_date DESC`
    );
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

// Utility endpoint to seed example data for demos
app.post('/api/seed', requireAdmin, async (req, res) => {
  try {
    const membersCountRow = await queryOne('SELECT COUNT(*) as total FROM members');
    if (membersCountRow?.total) {
      return fail(res, 'Base já possui dados');
    }
    const memberIds = [];
    const seedMembers = ['Ana', 'Bruno', 'Carla', 'Diego'];
    for (let index = 0; index < seedMembers.length; index += 1) {
      const name = seedMembers[index];
      const [member] = await query(
        'INSERT INTO members (name, email, nickname) VALUES (?, ?, ?) RETURNING id',
        [name, `${name.toLowerCase()}@clan.com`, `M${index + 1}`]
      );
      if (member?.id) {
        memberIds.push(member.id);
      }
    }
    for (let idx = 0; idx < memberIds.length; idx += 1) {
      for (let month = 1; month <= 6; month += 1) {
        await execute(
          'INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            memberIds[idx],
            month,
            2024,
            100,
            idx % 2 === 0 || month % 2 === 0,
            `2024-${String(month).padStart(2, '0')}-05`,
            'Pagamento seed'
          ]
        );
      }
    }
    await execute(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)',
      ['Acampamento de inverno', 3000, '2024-08-15', 'Cobrir custos do acampamento']
    );
    await execute(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)',
      ['Compra de equipamentos', 5000, '2024-12-10', 'Melhorar infraestrutura']
    );
    await execute(
      'INSERT INTO expenses (title, amount, expense_date, category, notes) VALUES (?, ?, ?, ?, ?)',
      ['Compra de mantimentos', 350, '2024-04-12', 'Operacional', 'Itens semanais']
    );
    await execute(
      'INSERT INTO expenses (title, amount, expense_date, category, notes) VALUES (?, ?, ?, ?, ?)',
      ['Transporte acampamento', 600, '2024-05-02', 'Eventos', 'Ônibus fretado']
    );
    await execute(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?)',
      ['Acampamento de junho', '2024-06-20', 2000, 1500, 'Evento principal do semestre']
    );
    success(res, { message: 'Base populada' });
  } catch (error) {
    fail(res, error.message);
  }
});

app.use((req, res) => fail(res, 'Rota não encontrada', 404));

if (!isVercel) {
  app.listen(PORT, () => {
    console.log(`Tesoureiro Assistente API rodando na porta ${PORT}`);
  });
}

module.exports = app;
