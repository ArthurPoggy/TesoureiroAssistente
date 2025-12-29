const express = require('express');
const config = require('../config');
const { query, queryOne } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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

router.get('/', requireAuth, async (req, res) => {
  try {
    const isAdminRequest = req.user?.role === 'admin';
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const memberId = isAdminRequest
      ? (req.query.memberId ? Number(req.query.memberId) : null)
      : req.user?.memberId || null;
    if (!isAdminRequest && !memberId) {
      return success(res, {
        totalRaised: 0,
        totalExpenses: 0,
        balance: 0,
        monthlyCollections: [],
        goals: [],
        delinquentMembers: [],
        ranking: []
      });
    }

    let monthlySql = year
      ? `SELECT year, month, SUM(amount) AS total FROM payments WHERE paid`
      : `SELECT month, SUM(amount) AS total FROM payments WHERE paid`;
    const monthlyParams = [];
    if (year) {
      monthlySql += ' AND year = ?';
      monthlyParams.push(year);
    }
    if (memberId) {
      monthlySql += ' AND member_id = ?';
      monthlyParams.push(memberId);
    }
    monthlySql += year ? ' GROUP BY year, month ORDER BY month' : ' GROUP BY month ORDER BY month';
    const monthly = await query(monthlySql, monthlyParams);

    const totalRaised = await sumPayments({ year, memberId });
    const totalExpenses = memberId ? 0 : await sumExpenses({ year });
    let goalSql = `SELECT g.*, COALESCE(SUM(p.amount), 0) AS raised
       FROM goals g
       LEFT JOIN payments p ON p.goal_id = g.id AND p.paid`;
    const goalParams = [];
    if (memberId) {
      goalSql += ' AND p.member_id = ?';
      goalParams.push(memberId);
    }
    goalSql += ' GROUP BY g.id';
    const goalRows = await query(goalSql, goalParams);
    const goalData = goalRows.map((goal) => ({
      ...goal,
      progress: goal.target_amount ? Math.min(100, (goal.raised / goal.target_amount) * 100) : 0
    }));

    let delinquentSql = `SELECT DISTINCT m.name
         FROM members m
         LEFT JOIN payments p ON p.member_id = m.id`;
    const delinquentParams = [];
    const delinquentJoin = [];
    if (month) {
      delinquentJoin.push('p.month = ?');
      delinquentParams.push(month);
    }
    if (year) {
      delinquentJoin.push('p.year = ?');
      delinquentParams.push(year);
    }
    if (delinquentJoin.length) {
      delinquentSql += ` AND ${delinquentJoin.join(' AND ')}`;
    }
    delinquentSql += ' WHERE (p.id IS NULL OR p.paid IS NOT TRUE)';
    if (memberId) {
      delinquentSql += ' AND m.id = ?';
      delinquentParams.push(memberId);
    }
    delinquentSql += ' ORDER BY m.name';
    const delinquentMembers = (await query(delinquentSql, delinquentParams)).map((row) => row.name);

    let rankingSql = `SELECT m.name, COUNT(p.id) AS payments
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id AND p.paid`;
    const rankingParams = [];
    if (year) {
      rankingSql += ' AND p.year = ?';
      rankingParams.push(year);
    }
    if (memberId) {
      rankingSql += ' WHERE m.id = ?';
      rankingParams.push(memberId);
    }
    rankingSql += ' GROUP BY m.id ORDER BY payments DESC, m.name ASC LIMIT 5';
    const ranking = await query(rankingSql, rankingParams);

    success(res, {
      totalRaised,
      totalExpenses,
      balance: totalRaised - totalExpenses,
      monthlyCollections: monthly,
      goals: goalData,
      delinquentMembers,
      ranking
    });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/ranking', requireAuth, async (req, res) => {
  try {
    const { year, memberId } = req.query;
    const isAdminRequest = req.user?.role === 'admin';
    const effectiveMemberId = isAdminRequest ? memberId : req.user?.memberId;
    if (!isAdminRequest && !effectiveMemberId) {
      return success(res, { ranking: [] });
    }
    const params = [];
    let filter = '';
    if (year) {
      filter = 'AND p.year = ?';
      params.push(Number(year));
    }
    if (effectiveMemberId) {
      filter = `${filter} AND m.id = ?`;
      params.push(Number(effectiveMemberId));
    }
    const ranking = await query(
      `SELECT m.name, COUNT(p.id) AS payments
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id AND p.paid ${filter}
       GROUP BY m.id
       ORDER BY payments DESC, m.name ASC`,
      params
    );
    success(res, { ranking });
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
