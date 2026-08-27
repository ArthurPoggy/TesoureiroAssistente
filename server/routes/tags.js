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
      // `created` distingue a tag reaproveitada da recém-criada: quem chama
      // não tem como saber isso comparando com a própria lista local, que
      // pode estar desatualizada em relação ao banco.
      return success(res, { tag: existing, created: false });
    }
    const [tag] = await query('INSERT INTO tags (name) VALUES (?) RETURNING *', [normalized]);
    success(res, { tag, created: true });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await queryOne('SELECT id FROM tags WHERE id = ?', [id]);
    if (!existing) {
      return fail(res, 'Tag não encontrada', 404);
    }
    await execute('DELETE FROM tags WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
