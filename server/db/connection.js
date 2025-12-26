const path = require('path');
const fs = require('fs');
const { Pool, types } = require('pg');
const config = require('../config');

// PostgreSQL type parsers
const NUMERIC_OID = 1700;
const BIGINT_OID = 20;
types.setTypeParser(NUMERIC_OID, (value) => (value === null ? null : Number(value)));
types.setTypeParser(BIGINT_OID, (value) => (value === null ? null : Number(value)));

let sqliteDb = null;
let pgPool = null;

function initDatabase() {
  if (config.useSupabase) {
    if (!globalThis.__tesoureiroPgPool) {
      globalThis.__tesoureiroPgPool = new Pool({
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: process.env.SUPABASE_DB_SSL === 'false' ? false : { rejectUnauthorized: false }
      });
    }
    pgPool = globalThis.__tesoureiroPgPool;
  } else {
    const Database = require('better-sqlite3');
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }
    const dbPath = path.join(config.dataDir, 'tesoureiro.db');
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma('foreign_keys = ON');
  }
}

function getSqliteDb() {
  return sqliteDb;
}

function getPgPool() {
  return pgPool;
}

module.exports = {
  initDatabase,
  getSqliteDb,
  getPgPool
};
