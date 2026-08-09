const express = require('express');
const { query } = require('../db/query');
const { success, asyncHandler } = require('../utils/response');
const { getCurrentBalance } = require('../utils/settings');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { isPrivilegedRequest } = require('../utils/roles');
const { sumPayments, sumExpenses } = require('../utils/finance');

const router = express.Router();

const EMPTY_DASHBOARD = {
  totalRaised: 0,
  totalExpenses: 0,
  balance: 0,
  currentBalance: null,
  monthlyCollections: [],
  goals: [],
  delinquentMembers: [],
  ranking: []
};

const fetchMonthlyCollections = async ({ year, memberId }) => {
  let sql = year
    ? 'SELECT year, month, SUM(amount) AS total FROM payments WHERE paid'
    : 'SELECT month, SUM(amount) AS total FROM payments WHERE paid';
  const params = [];
  if (year) {
    sql += ' AND year = ?';
    params.push(year);
  }
  if (memberId) {
    sql += ' AND member_id = ?';
    params.push(memberId);
  }
  sql += year ? ' GROUP BY year, month ORDER BY month' : ' GROUP BY month ORDER BY month';
  return query(sql, params);
};

const fetchGoalsProgress = async ({ memberId }) => {
  let sql = `SELECT g.*, COALESCE(SUM(p.amount), 0) AS raised
     FROM goals g
     LEFT JOIN payments p ON p.goal_id = g.id AND p.paid`;
  const params = [];
  if (memberId) {
    sql += ' AND p.member_id = ?';
    params.push(memberId);
  }
  sql += ' GROUP BY g.id';
  const goalRows = await query(sql, params);
  return goalRows.map((goal) => ({
    ...goal,
    progress: goal.target_amount ? Math.min(100, (goal.raised / goal.target_amount) * 100) : 0
  }));
};

const fetchDelinquentMembers = async ({ month, year, memberId }) => {
  let sql = `SELECT DISTINCT m.name
       FROM members m
       LEFT JOIN payments p ON p.member_id = m.id`;
  const params = [];
  const joinFilters = [];
  if (month) {
    joinFilters.push('p.month = ?');
    params.push(month);
  }
  if (year) {
    joinFilters.push('p.year = ?');
    params.push(year);
  }
  if (joinFilters.length) {
    sql += ` AND ${joinFilters.join(' AND ')}`;
  }
  sql += ' WHERE (p.id IS NULL OR p.paid IS NOT TRUE)';
  if (memberId) {
    sql += ' AND m.id = ?';
    params.push(memberId);
  }
  sql += ' ORDER BY m.name';
  const rows = await query(sql, params);
  return rows.map((row) => row.name);
};

const fetchRanking = async ({ year, memberId }) => {
  let sql = `SELECT m.name, COUNT(p.id) AS payments
     FROM members m
     LEFT JOIN payments p ON p.member_id = m.id AND p.paid`;
  const params = [];
  if (year) {
    sql += ' AND p.year = ?';
    params.push(year);
  }
  if (memberId) {
    sql += ' WHERE m.id = ?';
    params.push(memberId);
  }
  sql += ' GROUP BY m.id ORDER BY payments DESC, m.name ASC LIMIT 5';
  return query(sql, params);
};

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const isAdminRequest = isPrivilegedRequest(req);
  const year = req.query.year ? Number(req.query.year) : null;
  const month = req.query.month ? Number(req.query.month) : null;
  const memberId = isAdminRequest
    ? (req.query.memberId ? Number(req.query.memberId) : null)
    : req.user?.memberId || null;
  if (!isAdminRequest && !memberId) {
    return success(res, EMPTY_DASHBOARD);
  }

  const [monthly, totalRaised, currentBalance, goalData, delinquentMembers, ranking] = await Promise.all([
    fetchMonthlyCollections({ year, memberId }),
    sumPayments({ year, memberId }),
    isAdminRequest ? getCurrentBalance() : null,
    fetchGoalsProgress({ memberId }),
    fetchDelinquentMembers({ month, year, memberId }),
    fetchRanking({ year, memberId })
  ]);
  const totalExpenses = memberId ? 0 : await sumExpenses({ year });

  success(res, {
    totalRaised,
    totalExpenses,
    balance: totalRaised - totalExpenses,
    currentBalance,
    monthlyCollections: monthly,
    goals: goalData,
    delinquentMembers,
    ranking
  });
}));

router.get('/ranking', requirePrivileged, asyncHandler(async (req, res) => {
  const { year, memberId } = req.query;
  const isAdminRequest = isPrivilegedRequest(req);
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
}));

module.exports = router;
