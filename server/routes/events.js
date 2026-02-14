const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const events = await query('SELECT * FROM events ORDER BY event_date DESC');
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    if (!name || !eventDate) {
      return fail(res, 'Nome e data do evento são obrigatórios');
    }
    const [event] = await query(
      'INSERT INTO events (name, event_date, raised_amount, spent_amount, description) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, eventDate, raisedAmount || 0, spentAmount || 0, description]
    );
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, eventDate, raisedAmount, spentAmount, description } = req.body;
    const [event] = await query(
      'UPDATE events SET name = ?, event_date = ?, raised_amount = ?, spent_amount = ?, description = ? WHERE id = ? RETURNING *',
      [name, eventDate, raisedAmount || 0, spentAmount || 0, description, id]
    );
    success(res, { event });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM events WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const events = await query(
      `SELECT name, event_date as date, raised_amount as raised, spent_amount as spent,
              (raised_amount - spent_amount) as balance
       FROM events ORDER BY event_date DESC`
    );
    success(res, { events });
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
