const express = require('express');
const { query, execute } = require('../db/query');
const { success, fail, asyncHandler } = require('../utils/response');
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

const fetchProjectTags = async (projectId) =>
  query(
    `SELECT t.id, t.name FROM project_tags pt JOIN tags t ON t.id = pt.tag_id
     WHERE pt.project_id = ? ORDER BY t.name`,
    [projectId]
  );

const buildProjectsWhere = ({ name, status, startDate, endDate, memberId }) => {
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
  return { whereSql, params };
};

const fetchMembersByProject = async () => {
  const memberRows = await query(
    `SELECT mp.project_id, mp.member_id, m.name, m.nickname
     FROM member_projects mp
     JOIN members m ON m.id = mp.member_id
     ORDER BY m.name`
  );
  return memberRows.reduce((acc, row) => {
    if (!acc[row.project_id]) acc[row.project_id] = [];
    acc[row.project_id].push({
      member_id: row.member_id,
      name: row.name,
      nickname: row.nickname
    });
    return acc;
  }, {});
};

const fetchTagsByProject = async () => {
  const tagRows = await query(
    `SELECT pt.project_id, t.id, t.name
     FROM project_tags pt
     JOIN tags t ON t.id = pt.tag_id
     ORDER BY t.name`
  );
  return tagRows.reduce((acc, row) => {
    if (!acc[row.project_id]) acc[row.project_id] = [];
    acc[row.project_id].push({ id: row.id, name: row.name });
    return acc;
  }, {});
};

const validateProjectDates = (start_date, end_date) =>
  start_date && end_date && end_date < start_date
    ? 'Data de término não pode ser anterior à data de início'
    : null;

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { whereSql, params } = buildProjectsWhere(req.query);
  const projects = await query(`SELECT * FROM projects ${whereSql} ORDER BY created_at DESC`, params);
  const [membersByProject, tagsByProject] = await Promise.all([
    fetchMembersByProject(),
    fetchTagsByProject()
  ]);
  const enriched = projects.map((project) => ({
    ...project,
    members: membersByProject[project.id] || [],
    tags: tagsByProject[project.id] || []
  }));
  success(res, { projects: enriched });
}));

router.post('/', requirePrivileged, asyncHandler(async (req, res) => {
  const { name, description, status, start_date, end_date, tagIds } = req.body;
  if (!name) return fail(res, 'Nome é obrigatório');
  const dateError = validateProjectDates(start_date, end_date);
  if (dateError) return fail(res, dateError);
  const [project] = await query(
    'INSERT INTO projects (name, description, status, start_date, end_date) VALUES (?, ?, ?, ?, ?) RETURNING *',
    [name, description || null, status || 'active', start_date || null, end_date || null]
  );
  await syncProjectTags(project.id, tagIds);
  const tags = await fetchProjectTags(project.id);
  success(res, { project: { ...project, members: [], tags } });
}));

router.put('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, status, start_date, end_date, tagIds } = req.body;
  if (!name) return fail(res, 'Nome é obrigatório');
  const dateError = validateProjectDates(start_date, end_date);
  if (dateError) return fail(res, dateError);
  const [project] = await query(
    'UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, end_date = ? WHERE id = ? RETURNING *',
    [name, description || null, status || 'active', start_date || null, end_date || null, id]
  );
  if (!project) return fail(res, 'Projeto não encontrado', 404);
  await syncProjectTags(project.id, tagIds);
  const tags = await fetchProjectTags(project.id);
  success(res, { project: { ...project, tags } });
}));

router.delete('/:id', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  await execute('DELETE FROM projects WHERE id = ?', [id]);
  success(res);
}));

router.post('/:id/members', requirePrivileged, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;
  if (!memberId) return fail(res, 'Membro é obrigatório');
  await execute(
    'INSERT OR IGNORE INTO member_projects (project_id, member_id) VALUES (?, ?)',
    [id, memberId]
  );
  success(res);
}));

router.delete('/:id/members/:memberId', requirePrivileged, asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  await execute(
    'DELETE FROM member_projects WHERE project_id = ? AND member_id = ?',
    [id, memberId]
  );
  success(res);
}));

module.exports = router;
