const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const goals = await query('SELECT * FROM goals ORDER BY deadline');
    const totalsRows = await query(
      'SELECT goal_id, SUM(amount) as total FROM payments WHERE goal_id IS NOT NULL GROUP BY goal_id'
    );
    const goalTotals = totalsRows.reduce(
      (acc, curr) => ({ ...acc, [curr.goal_id]: Number(curr.total) || 0 }),
      {}
    );
    const enriched = goals.map((goal) => ({
      ...goal,
      raised: goalTotals[goal.id] || 0,
      progress: goal.target_amount ? Math.min(100, ((goalTotals[goal.id] || 0) / goal.target_amount) * 100) : 0
    }));
    success(res, { goals: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, targetAmount, deadline, description } = req.body;
    if (!title || !targetAmount) {
      return fail(res, 'Título e valor alvo são obrigatórios');
    }
    const [goal] = await query(
      'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?) RETURNING *',
      [title, targetAmount, deadline, description]
    );
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetAmount, deadline, description } = req.body;
    const [goal] = await query(
      'UPDATE goals SET title = ?, target_amount = ?, deadline = ?, description = ? WHERE id = ? RETURNING *',
      [title, targetAmount, deadline, description, id]
    );
    success(res, { goal });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM goals WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
