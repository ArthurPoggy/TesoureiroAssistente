const jwt = require('jsonwebtoken');

const SECRET = 'test-secret-key-for-jest';

const makeToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1h' });

const tokens = {
  admin: () => makeToken({ role: 'admin', email: 'admin@test.com', memberId: null }),
  diretor: () => makeToken({ role: 'diretor_financeiro', email: 'diretor@test.com', memberId: null }),
  viewer: () => makeToken({ role: 'viewer', email: 'viewer@test.com', memberId: null }),
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const cleanTable = (table) => global.__testDb.prepare(`DELETE FROM ${table}`).run();

const cleanAll = () => {
  ['member_projects', 'projects', 'payments', 'members'].forEach(cleanTable);
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

module.exports = { tokens, auth, cleanAll, cleanTable, insertMember, insertPayment, insertProject, linkMemberProject };
