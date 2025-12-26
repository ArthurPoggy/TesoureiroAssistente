const express = require('express');
const PDFDocument = require('pdfkit');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { month, year, memberId } = req.query;
    let sql = `
      SELECT p.*, m.name AS member_name
      FROM payments p
      JOIN members m ON m.id = p.member_id
      WHERE 1 = 1
    `;
    const params = [];
    if (month) {
      sql += ' AND p.month = ?';
      params.push(Number(month));
    }
    if (year) {
      sql += ' AND p.year = ?';
      params.push(Number(year));
    }
    if (memberId) {
      sql += ' AND p.member_id = ?';
      params.push(Number(memberId));
    }
    sql += ' ORDER BY p.year DESC, p.month DESC';
    const payments = await query(sql, params);
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/history/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const payments = await query(
      'SELECT * FROM payments WHERE member_id = ? ORDER BY year DESC, month DESC',
      [memberId]
    );
    success(res, { payments });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { memberId, month, year, amount, paid, paidAt, notes, goalId } = req.body;
    if (!memberId || !month || !year || !amount) {
      return fail(res, 'Campos obrigatórios não preenchidos');
    }
    const paidValue = Boolean(paid);
    const [payment] = await query(
      `
      INSERT INTO payments (member_id, month, year, amount, paid, paid_at, notes, goal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(member_id, month, year) DO UPDATE SET
        amount = excluded.amount,
        paid = excluded.paid,
        paid_at = excluded.paid_at,
        notes = excluded.notes,
        goal_id = excluded.goal_id
      RETURNING *
    `,
      [memberId, month, year, amount, paidValue, paidAt, notes, goalId || null]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid, paidAt, notes, goalId } = req.body;
    const paidValue = Boolean(paid);
    const [payment] = await query(
      'UPDATE payments SET amount = ?, paid = ?, paid_at = ?, notes = ?, goal_id = ? WHERE id = ? RETURNING *',
      [amount, paidValue, paidAt, notes, goalId || null, id]
    );
    success(res, { payment });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM payments WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/:id/receipt', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await queryOne(
      `SELECT p.*, m.name AS member_name, m.email
       FROM payments p
       JOIN members m ON m.id = p.member_id
       WHERE p.id = ?`,
      [id]
    );
    if (!payment) {
      return fail(res, 'Pagamento não encontrado', 404);
    }

    const doc = new PDFDocument();
    const filename = `recibo-${payment.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    doc.fontSize(20).text('Recibo de Pagamento', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Membro: ${payment.member_name}`);
    doc.text(`Email: ${payment.email || 'não informado'}`);
    doc.text(`Referente: ${payment.month}/${payment.year}`);
    doc.text(`Valor: R$ ${payment.amount.toFixed(2)}`);
    doc.text(`Status: ${payment.paid ? 'Pago' : 'Pendente'}`);
    doc.text(`Data de pagamento: ${payment.paid_at || 'não informado'}`);
    if (payment.notes) {
      doc.moveDown();
      doc.text(`Observações: ${payment.notes}`);
    }
    doc.moveDown();
    doc.text('Obrigado pela contribuição!', { align: 'center' });
    doc.end();
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
