process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'admin@test.com';
process.env.ADMIN_PASSWORD = 'adminpass';

const Database = require('better-sqlite3');
const { migrations } = require('../db/migrations');
const connectionModule = require('../db/connection');

const db = new Database(':memory:');
db.pragma('foreign_keys = ON');

jest.spyOn(connectionModule, 'getSqliteDb').mockReturnValue(db);

migrations.forEach((sql) => {
  try {
    db.prepare(sql).run();
  } catch (error) {
    if (!/duplicate column|already exists/i.test(error.message)) {
      throw error;
    }
  }
});
