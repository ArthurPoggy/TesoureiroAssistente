const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail, asyncHandler } = require('../utils/response');
const { requireFields } = require('../utils/validation');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { isPrivilegedRequest } = require('../utils/roles');

const router = express.Router();

const GOAL_REQUIRED_FIELDS_MESSAGE = 'Título e valor alvo são obrigatórios';

// Soma o total arrecadado por meta, restrito ao membro autenticado quando
// a requisição não for privilegiada.
const fetchGoalTotals = async (req) => {
  const isAdminRequest = isPrivilegedRequest(req);
  const params = [];
  let totalsSql = 'SELECT goal_id, SUM(amount) as total FROM payments WHERE goal_id IS NOT NULL';
  if (!isAdminRequest && req.user?.memberId) {
    totalsSql += ' AND member_id = ?';
    params.push(req.user.memberId);
  }
  totalsSql += ' GROUP BY goal_id';
  const totalsRows = await query(totalsSql, params);
  return totalsRows.reduce((acc, curr) => ({ ...acc, [curr.goal_id]: Number(curr.total) || 0 }), {});
};

const enrichGoal = (goal, goalTotals) => ({
  ...goal,
  raised: goalTotals[goal.id] || 0,
  progress: goal.target_amount ? Math.min(100, ((goalTotals[goal.id] || 0) / goal.target_amount) * 100) : 0
});

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const goals = await query('SELECT * FROM goals ORDER BY deadline');
  const goalTotals = await fetchGoalTotals(req);
  const enriched = goals.map((goal) => enrichGoal(goal, goalTotals));
  success(res, { goals: enriched });
}));

router.post('/', requirePrivileged, asyncHandler(async (req, res) => {
  const { title, targetAmount, deadline, description } = req.body;
  const missing = requireFields({ title, targetAmount }, GOAL_REQUIRED_FIELDS_MESSAGE);
  if (missing) {
    return fail(res, missing);
  }
  const [goal] = await query(
    'INSERT INTO goals (title, target_amount, deadline, description) VALUES (?, ?, ?, ?) RETURNING *',
    [title, targetAmount, deadline, description]
  );
  success(res, { goal });
}));

router.put('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, targetAmount, deadline, description } = req.body;
  const missing = requireFields({ title, targetAmount }, GOAL_REQUIRED_FIELDS_MESSAGE);
  if (missing) {
    return fail(res, missing);
  }
  const [goal] = await query(
    'UPDATE goals SET title = ?, target_amount = ?, deadline = ?, description = ? WHERE id = ? RETURNING *',
    [title, targetAmount, deadline, description, id]
  );
  if (!goal) {
    return fail(res, 'Meta não encontrada', 404);
  }
  success(res, { goal });
}));

router.delete('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await execute('DELETE FROM goals WHERE id = ?', [id]);
  success(res);
}));

module.exports = router;
