const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');

const router = express.Router();

// Sincroniza as tags de um projeto: remove as antigas e insere as informadas.
async function syncProjectTags(projectId, tagIds) {
  if (!Array.isArray(tagIds)) return;
  await execute('DELETE FROM project_tags WHERE project_id = ?', [projectId]);
  const uniqueIds = [...new Set(tagIds.map((id) => Number(id)).filter(Boolean))];
  for (const tagId of uniqueIds) {
    await execute(
      'INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)',
      [projectId, tagId]
    );
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { name, status, startDate, endDate, memberId } = req.query;

    let whereSql = 'WHERE 1 = 1';
    const params = [];

    if (name) {
      // LOWER + LIKE para busca case-insensitive em SQLite e Postgres.
      // Sem unaccent: "café" e "cafe" são considerados diferentes (limitação aceita na v1).
      whereSql += " AND LOWER(COALESCE(name, '')) LIKE LOWER(?)";
      params.push(`%${name}%`);
    }
    if (status === 'active' || status === 'inactive') {
      whereSql += ' AND status = ?';
      params.push(status);
    }
    if (startDate) {
      whereSql += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Inclui o dia inteiro: data fornecida + 23:59:59
      whereSql += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }
    if (memberId) {
      whereSql += ' AND id IN (SELECT project_id FROM member_projects WHERE member_id = ?)';
      params.push(Number(memberId));
    }

    const projects = await query(
      `SELECT * FROM projects ${whereSql} ORDER BY created_at DESC`,
      params
    );

    const memberRows = await query(
      `SELECT mp.project_id, mp.member_id, m.name, m.nickname
       FROM member_projects mp
       JOIN members m ON m.id = mp.member_id
       ORDER BY m.name`
    );
    const membersByProject = memberRows.reduce((acc, row) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({
        member_id: row.member_id,
        name: row.name,
        nickname: row.nickname
      });
      return acc;
    }, {});

    const tagRows = await query(
      `SELECT pt.project_id, t.id, t.name
       FROM project_tags pt
       JOIN tags t ON t.id = pt.tag_id
       ORDER BY t.name`
    );
    const tagsByProject = tagRows.reduce((acc, row) => {
      if (!acc[row.project_id]) acc[row.project_id] = [];
      acc[row.project_id].push({ id: row.id, name: row.name });
      return acc;
    }, {});

    const enriched = projects.map((project) => ({
      ...project,
      members: membersByProject[project.id] || [],
      tags: tagsByProject[project.id] || []
    }));
    success(res, { projects: enriched });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/', requirePrivileged, async (req, res) => {
  try {
    const { name, description, status, start_date, end_date, tagIds } = req.body;
    if (!name) return fail(res, 'Nome é obrigatório');
    if (start_date && end_date && end_date < start_date) {
      return fail(res, 'Data de término não pode ser anterior à data de início');
    }
    const [project] = await query(
      'INSERT INTO projects (name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [name, description || null, status || 'active', start_date || null, end_date || null]
    );
    await syncProjectTags(project.id, tagIds);
    const tags = await query(
      `SELECT t.id, t.name FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
       WHERE pt.project_id = ? ORDER BY t.name`,
      [project.id]
    );
    success(res, { project: { ...project, members: [], tags } });
  } catch (error) {
    fail(res, error.message);
  }
});

router.put('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, start_date, end_date, tagIds } = req.body;
    if (!name) return fail(res, 'Nome é obrigatório');
    if (start_date && end_date && end_date < start_date) {
      return fail(res, 'Data de término não pode ser anterior à data de início');
    }
    const [project] = await query(
      'UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE id = ? RETURNING *',
      [name, description || null, status || 'active', start_date || null, end_date || null, id]
    );
    if (!project) return fail(res, 'Projeto não encontrado', 404);
    await syncProjectTags(project.id, tagIds);
    const tags = await query(
      `SELECT t.id, t.name FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
       WHERE pt.project_id = ? ORDER BY t.name`,
      [project.id]
    );
    success(res, { project: { ...project, tags } });
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    await execute('DELETE FROM projects WHERE id = ?', [id]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/:id/members', requirePrivileged, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;
    if (!memberId) return fail(res, 'Membro é obrigatório');
    await execute(
      'INSERT OR IGNORE INTO member_projects (project_id, member_id) VALUES (?, ?)',
      [id, memberId]
    );
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.delete('/:id/members/:memberId', requirePrivileged, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    await execute(
      'DELETE FROM member_projects WHERE project_id = ? AND member_id = ?',
      [id, memberId]
    );
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
