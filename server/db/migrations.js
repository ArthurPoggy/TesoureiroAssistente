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
  `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  `CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 1,
      paid_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT,
      goal_id INTEGER,
      attachment_id TEXT,
      attachment_name TEXT,
      attachment_url TEXT,
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
      attachment_id TEXT,
      attachment_name TEXT,
      attachment_url TEXT,
      FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
    )`,
  `ALTER TABLE members ADD COLUMN password_hash TEXT`,
  `ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'`,
  `ALTER TABLE members ADD COLUMN active INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE members ADD COLUMN must_reset_password INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE members ADD COLUMN setup_token_hash TEXT`,
  `ALTER TABLE members ADD COLUMN setup_token_created_at TEXT`,
  `ALTER TABLE payments ADD COLUMN attachment_id TEXT`,
  `ALTER TABLE payments ADD COLUMN attachment_name TEXT`,
  `ALTER TABLE payments ADD COLUMN attachment_url TEXT`,
  `ALTER TABLE payments ADD COLUMN created_at TEXT`,
  `ALTER TABLE expenses ADD COLUMN attachment_id TEXT`,
  `ALTER TABLE expenses ADD COLUMN attachment_name TEXT`,
  `ALTER TABLE expenses ADD COLUMN attachment_url TEXT`,
  `UPDATE payments SET created_at = COALESCE(created_at, paid_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL`,
  `INSERT OR IGNORE INTO settings (key, value, updated_at)
   SELECT 'current_balance',
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE paid)
          - (SELECT COALESCE(SUM(amount), 0) FROM expenses),
          CURRENT_TIMESTAMP`
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
