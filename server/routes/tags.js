const express = require('express');
const { query, queryOne, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const tags = await query('SELECT * FROM tags ORDER BY name ASC');
    success(res, { tags });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || !name.trim()) {
      return fail(res, 'Nome da tag é obrigatório', 400);
    }
    const normalized = name.trim();
    const existing = await queryOne('SELECT * FROM tags WHERE name = ? COLLATE NOCASE', [normalized]);
    if (existing) {
      return success(res, { tag: existing });
    }
    const [tag] = await query('INSERT INTO tags (name) VALUES (?) RETURNING *', [normalized]);
    success(res, { tag });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM tags WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
