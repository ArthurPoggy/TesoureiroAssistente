const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const records = await query('SELECT * FROM clan_history ORDER BY event_date DESC');
    success(res, { records });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { title, description, eventDate, attachmentId, attachmentName, attachmentUrl } = req.body;
    if (!title || !eventDate) {
      return fail(res, 'Título e data são obrigatórios', 400);
    }
    const [record] = await query(
      `INSERT INTO clan_history (title, description, event_date, attachment_id, attachment_name, attachment_url, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      [
        title,
        description || null,
        eventDate,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null,
        req.user?.memberId || null
      ]
    );
    success(res, { record });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, eventDate, attachmentId, attachmentName, attachmentUrl } = req.body;
    if (!title || !eventDate) {
      return fail(res, 'Título e data são obrigatórios', 400);
    }
    const [record] = await query(
      `UPDATE clan_history
       SET title = ?, description = ?, event_date = ?,
           attachment_id = COALESCE(?, attachment_id),
           attachment_name = COALESCE(?, attachment_name),
           attachment_url = COALESCE(?, attachment_url)
       WHERE id = ? RETURNING *`,
      [
        title,
        description || null,
        eventDate,
        attachmentId || null,
        attachmentName || null,
        attachmentUrl || null,
        id
      ]
    );
    success(res, { record });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM clan_history WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
