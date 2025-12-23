const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const PDFDocument = require('pdfkit');

const PORT = process.env.PORT || 4000;
const app = express();
const isVercel = Boolean(process.env.VERCEL);

app.use(cors());
app.use(express.json());

// On Vercel we only have write access to /tmp, locally we keep the DB under ./data
const dataDir = process.env.DATA_DIR || path.join(isVercel ? '/tmp' : __dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'tesoureiro.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

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
    )`
];

migrations.forEach((sql) => db.prepare(sql).run());

const success = (res, payload = {}) => res.json({ ok: true, ...payload });
const fail = (res, message, status = 400) => res.status(status).json({ ok: false, message });

app.get('/api/health', (req, res) => success(res, { status: 'running' }));

// Members -----------------------------------------------------
app.get('/api/members', (req, res) => {
  try {
    const members = db.prepare('SELECT * FROM members ORDER BY name').all();
    success(res, { members });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/members', (req, res) => {
  try {
    const { name, email, nickname } = req.body;
    if (!name) {
      return fail(res, 'Nome é obrigatório');
    }
    const stmt = db.prepare('INSERT INTO members (name, email, nickname) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, nickname);
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid);
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/members/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, nickname } = req.body;
    const stmt = db.prepare('UPDATE members SET name = ?, email = ?, nickname = ? WHERE id = ?');
    stmt.run(name, email, nickname, id);
    const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    success(res, { member });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/members/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM members WHERE id = ?').run(id);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Payments ----------------------------------------------------
app.get('/api/payments', (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    let query = `
      SELECT p.*, m.name AS member_name
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE 1 = 1
    `;
    const params = [];
    if (month) {
      query += ' AND p.month = ?';
      params.push(Number(month));
    }
    if (year) {
      query += ' AND p.year = ?';
      params.push(Number(year));
    }
    if (memberId) {
      query += ' AND p.member_id = ?';
      params.push(Number(memberId));
    }
    query += ' ORDER BY p.year DESC, p.month DESC';
    const payments = db.prepare(query).all(...params);
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/payments/history/:memberId', (req, res) => {
  try {
    const { memberId } = req.params;
    const payments = db
      .prepare('SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC')
      .all(memberId);
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const { memberId, month, year, amount, paid, paidAt, notes, goalId } = req.body;
    if (!memberId || !month || !year || !amount) {
      return fail(res, 'Campos obrigatórios não preenchidos');
    }
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO payments (member_id, month, year, amount, paid, paid_at, notes, goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(memberId, month, year, amount, paid ? 1 : 0, paidAt, notes, goalId || null);
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/payments/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid, paidAt, notes, goalId } = req.body;
    const stmt = db.prepare(
      'UPDATE payments SET amount = ?, paid = ?, paid_at = ?, notes = ?, goal_id = ? WHERE id = ?'
    );
    stmt.run(amount, paid ? 1 : 0, paidAt, notes, goalId || null, id);
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/payments/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM payments WHERE id = ?').run(id);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/payments/:id/receipt', (req, res) => {
  try {
    const { id } = req.params;
    const payment = db
      .prepare(
        `SELECT p.*, m.name AS member_name, m.email 
         FROM payments p 
         JOIN members m ON m.id = p.member_id 
         WHERE p.id = ?`
      )
      .get(id);
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
app.get('/api/goals', (req, res) => {
  try {
    const goals = db.prepare('SELECT * FROM goals ORDER BY deadline').all();
    const goalTotals = db
      .prepare('SELECT goal_id, SUM(amount) as total FROM payments WHERE goal_id IS NOT NULL GROUP BY goal_id')
      .all()
      .reduce((acc, curr) => ({ ...acc, [curr.goal_id]: curr.total || 0 }), {});
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

app.post('/api/goals', (req, res) => {
  try {
    const { title, targetAmount, deadline, description } = req.body;
    if (!title || !targetAmount) {
      return fail(res, 'Título e valor alvo são obrigatórios');
    }
    const stmt = db.prepare(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(title, targetAmount, deadline, description);
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid);
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/goals/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetAmount, deadline, description } = req.body;
    const stmt = db.prepare(
      'UPDATE goals SET title = ?, target_amount = ?, deadline = ?, description = ? WHERE id = ?'
    );
    stmt.run(title, targetAmount, deadline, description, id);
    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/goals/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM goals WHERE id = ?').run(id);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Expenses ----------------------------------------------------
app.get('/api/expenses', (req, res) => {
  try {
    const expenses = db.prepare('SELECT * FROM expenses ORDER BY expense_date DESC').all();
    success(res, { expenses });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    if (!title || !amount || !expenseDate) {
      return fail(res, 'Título, valor e data são obrigatórios');
    }
    const stmt = db.prepare(
      'INSERT INTO expenses (title, amount, expense_date, category, notes, event_id) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(title, amount, expenseDate, category, notes, eventId || null);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    const stmt = db.prepare(
      'UPDATE expenses SET title = ?, amount = ?, expense_date = ?, category = ?, notes = ?, event_id = ? WHERE id = ?'
    );
    stmt.run(title, amount, expenseDate, category, notes, eventId || null, id);
    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Events ------------------------------------------------------
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY event_date DESC').all();
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

app.post('/api/events', (req, res) => {
  try {
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    if (!name || !eventDate) {
      return fail(res, 'Nome e data do evento são obrigatórios');
    }
    const stmt = db.prepare(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(name, eventDate, raisedAmount || 0, spentAmount || 0, description);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

app.put('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    const stmt = db.prepare(
      'UPDATE events SET name = ?, event_date = ?, raised_amount = ?, spent_amount = ?, description = ? WHERE id = ?'
    );
    stmt.run(name, eventDate, raisedAmount || 0, spentAmount || 0, description, id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

// Reports & dashboard ----------------------------------------
const sumPayments = (filters = {}) => {
  let sql = 'SELECT SUM(amount) as total FROM payments WHERE paid = 1';
  const params = [];
  if (filters.year) {
    sql += ' AND year = ?';
    params.push(filters.year);
  }
  if (filters.month) {
    sql += ' AND month = ?';
    params.push(filters.month);
  }
  return db.prepare(sql).get(...params).total || 0;
};

const sumExpenses = (filters = {}) => {
  let sql = 'SELECT SUM(amount) as total FROM expenses WHERE 1 = 1';
  const params = [];
  if (filters.year) {
    sql += ' AND strftime("%Y", expense_date) = ?';
    params.push(String(filters.year));
  }
  if (filters.month) {
    sql += ' AND strftime("%m", expense_date) = ?';
    params.push(String(filters.month).padStart(2, '0'));
  }
  const result = db.prepare(sql).get(...params);
  return (result && result.total) || 0;
};

app.get('/api/reports/monthly', (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    const total = sumPayments({ month: Number(month), year: Number(year) });
    success(res, { month: Number(month), year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/reports/annual', (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return fail(res, 'Informe o ano');
    }
    const total = sumPayments({ year: Number(year) });
    success(res, { year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/reports/balance', (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? Number(year) : undefined;
    const totalRaised = sumPayments({ year: yearNum });
    const totalExpenses = sumExpenses({ year: yearNum });
    success(res, { totalRaised, totalExpenses, balance: totalRaised - totalExpenses });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/members/delinquent', (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    const members = db
      .prepare(
        `SELECT m.*
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id AND p.month = ? AND p.year = ?
         WHERE p.id IS NULL OR p.paid = 0
         ORDER BY m.name`
      )
      .all(Number(month), Number(year));
    success(res, { members });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/ranking', (req, res) => {
  try {
    const { year } = req.query;
    const params = [];
    let filter = '';
    if (year) {
      filter = 'AND year = ?';
      params.push(Number(year));
    }
    const ranking = db
      .prepare(
        `SELECT m.name, COUNT(p.id) AS payments
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id AND p.paid = 1 ${filter}
         GROUP BY m.id
         ORDER BY payments DESC, m.name ASC`
      )
      .all(...params);
    success(res, { ranking });
  } catch (error) {
    fail(res, error.message);
  }
});

app.get('/api/dashboard', (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;

    const monthly = db
      .prepare(
        `SELECT year, month, SUM(amount) AS total 
         FROM payments 
         WHERE paid = 1 AND year = ? 
         GROUP BY year, month 
         ORDER BY month`
      )
      .all(year);

    const totalRaised = sumPayments({ year });
    const totalExpenses = sumExpenses({ year });
    const goalData = db
      .prepare(
        `SELECT g.*, IFNULL(SUM(p.amount), 0) AS raised
         FROM goals g
         LEFT JOIN payments p ON p.goal_id = g.id AND p.paid = 1
         GROUP BY g.id`
      )
      .all()
      .map((goal) => ({
        ...goal,
        progress: goal.target_amount
          ? Math.min(100, (goal.raised / goal.target_amount) * 100)
          : 0
      }));

    const delinquentMembers = db
      .prepare(
        `SELECT m.name
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id AND p.month = ? AND p.year = ?
         WHERE p.id IS NULL OR p.paid = 0
         ORDER BY m.name`
      )
      .all(month, year)
      .map((row) => row.name);

    const ranking = db
      .prepare(
        `SELECT m.name, COUNT(p.id) AS payments
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id AND p.paid = 1 AND p.year = ?
         GROUP BY m.id
         ORDER BY payments DESC, m.name ASC
         LIMIT 5`
      )
      .all(year);

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

app.get('/api/reports/export', (req, res) => {
  try {
    const { format = 'csv', type = 'payments', month, year } = req.query;
    let rows = [];
    if (type === 'expenses') {
      let sql = 'SELECT title, amount, expense_date AS date, category, notes FROM expenses WHERE 1 = 1';
      const params = [];
      if (year) {
        sql += ' AND strftime("%Y", expense_date) = ?';
        params.push(String(year));
      }
      if (month) {
        sql += ' AND strftime("%m", expense_date) = ?';
        params.push(String(month).padStart(2, '0'));
      }
      rows = db.prepare(sql).all(...params);
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
      rows = db.prepare(sql).all(...params);
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

app.get('/api/events/summary', (req, res) => {
  try {
    const events = db
      .prepare(
        `SELECT name, event_date as date, raised_amount as raised, spent_amount as spent,
                (raised_amount - spent_amount) as balance
         FROM events ORDER BY event_date DESC`
      )
      .all();
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

// Utility endpoint to seed example data for demos
app.post('/api/seed', (req, res) => {
  try {
    const membersCount = db.prepare('SELECT COUNT(*) as total FROM members').get().total;
    if (membersCount) {
      return fail(res, 'Base já possui dados');
    }
    const insertMember = db.prepare('INSERT INTO members (name, email, nickname) VALUES (?, ?, ?)');
    const memberIds = ['Ana', 'Bruno', 'Carla', 'Diego'].map((name, index) => {
      const result = insertMember.run(name, `${name.toLowerCase()}@clan.com`, `M${index + 1}`);
      return result.lastInsertRowid;
    });
    const insertPayment = db.prepare(
      'INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    memberIds.forEach((memberId, idx) => {
      for (let month = 1; month <= 6; month += 1) {
        insertPayment.run(
          memberId,
          month,
          2024,
          100,
          idx % 2 === 0 || month % 2 === 0 ? 1 : 0,
          `2024-${String(month).padStart(2, '0')}-05`,
          'Pagamento seed'
        );
      }
    });
    const insertGoal = db.prepare(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?)'
    );
    insertGoal.run('Acampamento de inverno', 3000, '2024-08-15', 'Cobrir custos do acampamento');
    insertGoal.run('Compra de equipamentos', 5000, '2024-12-10', 'Melhorar infraestrutura');
    const insertExpense = db.prepare(
      'INSERT INTO expenses (title, amount, expense_date, category, notes) VALUES (?, ?, ?, ?, ?)'
    );
    insertExpense.run('Compra de mantimentos', 350, '2024-04-12', 'Operacional', 'Itens semanais');
    insertExpense.run('Transporte acampamento', 600, '2024-05-02', 'Eventos', 'Ônibus fretado');
    const insertEvent = db.prepare(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?)'
    );
    insertEvent.run('Acampamento de junho', '2024-06-20', 2000, 1500, 'Evento principal do semestre');
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
