const config = require('../config');
const { getSqliteDb, getPgPool } = require('./connection');

const convertPlaceholders = (sql) => {
  if (!config.useSupabase) return sql;
  let index = 0;
  return sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
};

const query = async (sql, params = []) => {
  if (config.useSupabase) {
    const text = convertPlaceholders(sql);
    const { rows } = await getPgPool().query(text, params);
    return rows;
  }
  const stmt = getSqliteDb().prepare(sql);
  return stmt.all(...params);
};

const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0];
};

const execute = async (sql, params = []) => {
  if (config.useSupabase) {
    const text = convertPlaceholders(sql);
    await getPgPool().query(text, params);
    return;
  }
  getSqliteDb().prepare(sql).run(...params);
};

module.exports = {
  query,
  queryOne,
  execute,
  convertPlaceholders
};
