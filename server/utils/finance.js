// Agregações financeiras reaproveitadas entre dashboard e relatórios:
// soma de pagamentos (com filtros opcionais de ano/mês/membro) e soma de
// despesas (com filtros opcionais de ano/mês), respeitando a diferença de
// sintaxe de data entre SQLite e Postgres.
const config = require('../config');
const { queryOne } = require('../db/query');

const sumPayments = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE paid';
  const params = [];
  if (filters.year) {
    sql += ' AND year = ?';
    params.push(filters.year);
  }
  if (filters.month) {
    sql += ' AND month = ?';
    params.push(filters.month);
  }
  if (filters.memberId) {
    sql += ' AND member_id = ?';
    params.push(filters.memberId);
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

const sumExpenses = async (filters = {}) => {
  let sql = 'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1 = 1';
  const params = [];
  if (filters.year) {
    sql += config.useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
    params.push(filters.year);
  }
  if (filters.month) {
    sql += config.useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
    params.push(config.useSupabase ? filters.month : String(filters.month).padStart(2, '0'));
  }
  const row = await queryOne(sql, params);
  return Number(row?.total) || 0;
};

module.exports = {
  sumPayments,
  sumExpenses
};
