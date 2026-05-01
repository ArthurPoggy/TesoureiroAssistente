process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'admin123';

const Database = require('better-sqlite3');
const connectionModule = require('../db/connection');

const testDb = new Database(':memory:');
testDb.pragma('foreign_keys = ON');

connectionModule.getSqliteDb = () => testDb;
connectionModule.initDatabase = () => {};

const { migrations } = require('../db/migrations');
migrations.forEach((sql) => {
  try {
    testDb.prepare(sql).run();
  } catch (e) {
    if (!/duplicate column|already exists/i.test(e.message)) {
      // silently skip incompatible migrations (INSERT OR IGNORE, etc.)
    }
  }
});

global.__testDb = testDb;
