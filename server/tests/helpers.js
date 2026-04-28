const jwt = require('jsonwebtoken');
const connectionModule = require('../db/connection');

const SECRET = process.env.JWT_SECRET || 'test-secret';

function makeToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '1h' });
}

const tokens = {
  admin: () => makeToken({ role: 'admin', memberId: null }),
  diretor: () => makeToken({ role: 'diretor_financeiro', memberId: null }),
  viewer: () => makeToken({ role: 'viewer', memberId: null })
};

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function db() {
  return connectionModule.getSqliteDb();
}

function cleanAll() {
  const d = db();
  d.prepare('DELETE FROM expense_tags').run();
  d.prepare('DELETE FROM expenses').run();
  d.prepare('DELETE FROM tags WHERE id > 5').run();
}

function insertTag(name) {
  const d = db();
  const existing = d.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name);
  if (existing) return existing;
  return d.prepare('INSERT INTO tags (name) VALUES (?) RETURNING *').get(name);
}

function insertExpense(fields = {}) {
  const d = db();
  return d.prepare(
    `INSERT INTO expenses (title, amount, expense_date, category, notes)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).get(
    fields.title || 'Despesa teste',
    fields.amount ?? 100,
    fields.expense_date || '2024-01-15',
    fields.category || null,
    fields.notes || null
  );
}

module.exports = { tokens, auth, db, cleanAll, insertTag, insertExpense };
