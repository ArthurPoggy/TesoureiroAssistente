const config = require('../config');
const { getSqliteDb } = require('./connection');

const migrations = [
  `CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      nickname TEXT,
      password_hash TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      active INTEGER NOT NULL DEFAULT 1,
      must_reset_password INTEGER NOT NULL DEFAULT 0,
      setup_token_hash TEXT,
      setup_token_created_at TEXT,
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
  `ALTER TABLE members ADD COLUMN password_hash TEXT`,
  `ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'`,
  `ALTER TABLE members ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE members ADD COLUMN must_reset_password INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE members ADD COLUMN setup_token_hash TEXT`,
  `ALTER TABLE members ADD COLUMN setup_token_created_at TEXT`
];

function runMigrations() {
  if (config.useSupabase) return;

  const db = getSqliteDb();
  const runMigration = (sql) => {
    try {
      db.prepare(sql).run();
    } catch (error) {
      if (/duplicate column|already exists/i.test(error.message)) {
        return;
      }
      throw error;
    }
  };
  migrations.forEach(runMigration);
}

module.exports = {
  migrations,
  runMigrations
};
