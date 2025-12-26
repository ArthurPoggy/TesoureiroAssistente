const express = require('express');
const PDFDocument = require('pdfkit');
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

router.get('/monthly', requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return fail(res, 'Informe mês e ano');
    }
    const total = await sumPayments({ month: Number(month), year: Number(year) });
    success(res, { month: Number(month), year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/annual', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return fail(res, 'Informe o ano');
    }
    const total = await sumPayments({ year: Number(year) });
    success(res, { year: Number(year), total });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/balance', requireAuth, async (req, res) => {
  try {
    const { year } = req.query;
    const yearNum = year ? Number(year) : undefined;
    const [totalRaised, totalExpenses] = await Promise.all([
      sumPayments({ year: yearNum }),
      sumExpenses({ year: yearNum })
    ]);
    success(res, { totalRaised, totalExpenses, balance: totalRaised - totalExpenses });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/export', requireAuth, async (req, res) => {
  try {
    const { format = 'csv', type = 'payments', month, year } = req.query;
    let rows = [];
    if (type === 'expenses') {
      let sql = 'SELECT title, amount, expense_date AS date, category, notes FROM expenses WHERE 1 = 1';
      const params = [];
      if (year) {
        sql += config.useSupabase ? ' AND EXTRACT(YEAR FROM expense_date) = ?' : " AND strftime('%Y', expense_date) = ?";
        params.push(year);
      }
      if (month) {
        sql += config.useSupabase ? ' AND EXTRACT(MONTH FROM expense_date) = ?' : " AND strftime('%m', expense_date) = ?";
        params.push(config.useSupabase ? Number(month) : String(month).padStart(2, '0'));
      }
      rows = await query(sql, params);
    } else {
      let sql = `
        SELECT m.name AS member, month, year, amount, paid, paid_at AS paidAt
        FROM payments p
        JOIN members m ON m.id = p.member_id
        WHERE 1 = 1
      `;
      const params = [];
      if (year) {
        sql += ' AND year = ?';
        params.push(Number(year));
      }
      if (month) {
        sql += ' AND month = ?';
        params.push(Number(month));
      }
      rows = await query(sql, params);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.pdf"`);
      doc.pipe(res);
      doc.fontSize(18).text(`Relatório de ${type === 'expenses' ? 'despesas' : 'pagamentos'}`);
      doc.moveDown();
      rows.forEach((row) => {
        Object.entries(row).forEach(([key, value]) => {
          doc.fontSize(12).text(`${key}: ${value}`);
        });
        doc.moveDown();
      });
      doc.end();
    } else {
      const headers = rows.length ? Object.keys(rows[0]) : [];
      const csvLines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => `"${row[header] ?? ''}"`).join(','))
      ];
      const csv = csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio-${type}.csv"`);
      res.send(csv);
    }
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
