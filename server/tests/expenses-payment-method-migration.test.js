// Cobre a subtask "Schema: coluna payment_method em expenses" (parte da
// tarefa "Registrar forma de pagamento da despesa").
//
// Expectativa: a tabela expenses ganha uma coluna payment_method (TEXT,
// nullable, sem default) via entry idempotente em server/db/migrations.js,
// e o mesmo ALTER TABLE ... ADD COLUMN IF NOT EXISTS é espelhado em
// server/supabase-schema.sql para o ambiente Postgres.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { migrations, runMigrations } = require('../db/migrations');

describe('coluna expenses.payment_method', () => {
  test('migração adiciona payment_method (TEXT, nullable) em expenses', () => {
    const columns = global.__testDb.prepare('PRAGMA table_info(expenses)').all();
    const paymentMethodColumn = columns.find((column) => column.name === 'payment_method');

    expect(paymentMethodColumn).toBeDefined();
    expect(paymentMethodColumn.type.toUpperCase()).toBe('TEXT');
    expect(paymentMethodColumn.notnull).toBe(0);
  });

  test('migração roda duas vezes sem erro (idempotência) em SQLite', () => {
    const db = new Database(':memory:');

    try {
      expect(() => runMigrations(db)).not.toThrow();
      expect(() => runMigrations(db)).not.toThrow();

      const columns = db.prepare('PRAGMA table_info(expenses)').all();
      expect(columns.some((column) => column.name === 'payment_method')).toBe(true);
    } finally {
      db.close();
    }
  });

  test('migrations.js contém entry idempotente ALTER TABLE expenses ADD COLUMN payment_method TEXT', () => {
    const hasMigrationEntry = migrations.some((sql) =>
      /ALTER TABLE\s+expenses\s+ADD COLUMN\s+payment_method\s+TEXT/i.test(sql)
    );
    expect(hasMigrationEntry).toBe(true);
  });

  test('supabase-schema.sql espelha a coluna com ADD COLUMN IF NOT EXISTS', () => {
    const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    expect(schemaSql).toMatch(
      /ALTER TABLE\s+expenses\s+ADD COLUMN IF NOT EXISTS\s+payment_method\s+TEXT;/i
    );
  });
});
