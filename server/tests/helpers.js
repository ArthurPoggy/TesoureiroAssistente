const jwt = require('jsonwebtoken');
const connectionModule = require('../db/connection');

const SECRET = 'test-secret-key-for-jest';

const makeToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1h' });

// Os tokens de conveniência abaixo precisam corresponder a um membro real no
// banco de testes: requirePermission calcula a permissão efetiva consultando
// o role (e eventuais overrides) do membro autenticado, não apenas o role
// embutido no payload do JWT.
const tokenForRole = (role, email) => () =>
  makeToken({ role, email, memberId: insertMember({ role, email }) });

const tokens = {
  admin: tokenForRole('admin', 'admin@test.com'),
  diretor: tokenForRole('diretor_financeiro', 'diretor@test.com'),
  viewer: tokenForRole('viewer', 'viewer@test.com'),
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const db = () => connectionModule.getSqliteDb();
const cleanTable = (table) => global.__testDb.prepare(`DELETE FROM ${table}`).run();

const cleanAll = () => {
  ['expense_tags', 'expenses', 'member_projects', 'projects', 'payments', 'members'].forEach(cleanTable);
  global.__testDb.prepare('DELETE FROM tags WHERE id > 5').run();
};

const insertTag = (name) => {
  const d = db();
  const existing = d.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name);
  if (existing) return existing;
  return d.prepare('INSERT INTO tags (name) VALUES (?) RETURNING *').get(name);
};

const insertExpense = (fields = {}) => {
  const d = db();
  return d.prepare(
    `INSERT INTO expenses (title, amount, expense_date, category, notes, payment_method)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING *`
  ).get(
    fields.title || 'Despesa teste',
    fields.amount ?? 100,
    fields.expense_date || '2024-01-15',
    fields.category || null,
    fields.notes || null,
    fields.paymentMethod || null
  );
};

const insertMember = (overrides = {}) => {
  const defaults = {
    name: 'Membro Teste',
    email: `member_${Date.now()}_${Math.random()}@test.com`,
    nickname: 'MT',
    cpf: String(Math.floor(Math.random() * 1e11)).padStart(11, '0'),
    role: 'viewer',
    password_hash: '$2a$10$placeholder',
    active: 1,
    must_reset_password: 0,
  };
  const m = { ...defaults, ...overrides };
  const result = global.__testDb
    .prepare(
      `INSERT INTO members (name, email, nickname, cpf, role, password_hash, active, must_reset_password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(m.name, m.email, m.nickname, m.cpf, m.role, m.password_hash, m.active, m.must_reset_password);
  return result.lastInsertRowid;
};

const insertPayment = (memberId, overrides = {}) => {
  const defaults = { month: 1, year: 2025, amount: 100, paid: 1 };
  const p = { ...defaults, ...overrides };
  const result = global.__testDb
    .prepare('INSERT INTO payments (member_id, month, year, amount, paid) VALUES (?, ?, ?, ?, ?)')
    .run(memberId, p.month, p.year, p.amount, p.paid);
  return result.lastInsertRowid;
};

const insertProject = (overrides = {}) => {
  const defaults = { name: 'Projeto Teste', description: 'Desc', status: 'active' };
  const p = { ...defaults, ...overrides };
  const result = global.__testDb
    .prepare('INSERT INTO projects (name, description, status) VALUES (?, ?, ?)')
    .run(p.name, p.description, p.status);
  return result.lastInsertRowid;
};

const linkMemberProject = (memberId, projectId) => {
  global.__testDb
    .prepare('INSERT INTO member_projects (member_id, project_id) VALUES (?, ?)')
    .run(memberId, projectId);
};

module.exports = {
  tokens,
  auth,
  db,
  cleanAll,
  cleanTable,
  insertTag,
  insertExpense,
  insertMember,
  insertPayment,
  insertProject,
  linkMemberProject,
};
