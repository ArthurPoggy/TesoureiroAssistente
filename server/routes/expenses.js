const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const expenses = await query('SELECT * FROM expenses ORDER BY expense_date DESC');
    success(res, { expenses });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    if (!title || !amount || !expenseDate) {
      return fail(res, 'Título, valor e data são obrigatórios');
    }
    const [expense] = await query(
      'INSERT INTO expenses (title, amount, expense_date, category, notes, event_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
      [title, amount, expenseDate, category, notes, eventId || null]
    );
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, expenseDate, category, notes, eventId } = req.body;
    const [expense] = await query(
      'UPDATE expenses SET title = ?, amount = ?, expense_date = ?, category = ?, notes = ?, event_id = ? WHERE id = ? RETURNING *',
      [title, amount, expenseDate, category, notes, eventId || null, id]
    );
    success(res, { expense });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM expenses WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
