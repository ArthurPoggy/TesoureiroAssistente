const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail, asyncHandler } = require('../utils/response');
const { requireFields } = require('../utils/validation');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

const EVENT_REQUIRED_FIELDS_MESSAGE = 'Nome e data do evento são obrigatórios';

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const events = await query('SELECT * FROM events ORDER BY event_date DESC');
  success(res, { events });
}));

router.post('/', requirePrivileged, asyncHandler(async (req, res) => {
  const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
  const missing = requireFields({ name, eventDate }, EVENT_REQUIRED_FIELDS_MESSAGE);
  if (missing) {
    return fail(res, missing);
  }
  const [event] = await query(
    'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?) RETURNING *',
    [name, eventDate, raisedAmount || 0, spentAmount || 0, description]
  );
  success(res, { event });
}));

router.put('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
  const missing = requireFields({ name, eventDate }, EVENT_REQUIRED_FIELDS_MESSAGE);
  if (missing) {
    return fail(res, missing);
  }
  const [event] = await query(
    'UPDATE events SET name = ?, event_date = ?, raised_amount = ?, spent_amount = ?, description = ? WHERE id = ? RETURNING *',
    [name, eventDate, raisedAmount || 0, spentAmount || 0, description, id]
  );
  if (!event) {
    return fail(res, 'Evento não encontrado', 404);
  }
  success(res, { event });
}));

router.delete('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await execute('DELETE FROM events WHERE id = ?', [id]);
  success(res);
}));

router.get('/summary', requireAuth, asyncHandler(async (req, res) => {
  const events = await query(
    `SELECT name, event_date as date, raised_amount as raised, spent_amount as spent,
            (raised_amount - spent_amount) as balance
     FROM events ORDER BY event_date DESC`
  );
  success(res, { events });
}));

module.exports = router;
