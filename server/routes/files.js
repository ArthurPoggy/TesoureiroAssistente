const express = require('express');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { upload, uploadProjectFiles } = require('../middleware/upload');
const { query, queryOne, execute } = require('../db/query');
const { hasOauthClient, getDriveClient, getDriveContext, resolveFolderPath, getStoredRefreshToken, loadServiceAccount } = require('../utils/google-drive');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

const useDrive = async () => {
  if (hasOauthClient()) {
    const token = await getStoredRefreshToken();
    if (token) return true;
  }
  return Boolean(loadServiceAccount());
};

const router = express.Router();

// Tipos aceitos para anexos (recibos, comprovantes e registros da história).
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx'
]);

const isAllowedFile = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext);
};

const saveLocally = (file, name) => {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(file.originalname);
  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), file.buffer);
  return {
    id: filename,
    name: name || file.originalname,
    mimeType: file.mimetype,
    webViewLink: `/uploads/${filename}`,
    webContentLink: `/uploads/${filename}`
  };
};

router.get('/', requirePrivileged, async (req, res) => {
  try {
    if (await useDrive()) {
      const drive = await getDriveClient();
      const { folderId, sharedDriveId } = getDriveContext();
      const params = {
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      };
      if (sharedDriveId) {
        params.driveId = sharedDriveId;
        params.corpora = 'drive';
        params.includeItemsFromAllDrives = true;
        params.supportsAllDrives = true;
      }
      const response = await drive.files.list(params);
      return success(res, { files: response.data.files || [] });
    }
    if (!fs.existsSync(UPLOADS_DIR)) {
      return success(res, { files: [] });
    }
    const entries = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => ({
        id: e.name,
        name: e.name,
        webViewLink: `/uploads/${e.name}`
      }));
    success(res, { files });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/upload', requirePrivileged, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'Selecione um arquivo', 400);
    }
    if (!isAllowedFile(req.file)) {
      return fail(res, 'Tipo de arquivo não permitido. Use imagem (JPG, PNG, WebP, GIF), PDF ou DOC/DOCX', 400);
    }
    const fileName = req.body?.name || req.file.originalname;
    if (await useDrive()) {
      const drive = await getDriveClient();
      const { folderId, sharedDriveId } = getDriveContext();
      const { module: moduleName, year, month, label } = req.body || {};
      const folderSegments = [moduleName, year, month, label].filter(Boolean);
      const targetFolderId = await resolveFolderPath(drive, folderId, folderSegments, sharedDriveId);
      const fileMetadata = { name: fileName, parents: [targetFolderId] };
      const media = { mimeType: req.file.mimetype, body: Readable.from(req.file.buffer) };
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink',
        supportsAllDrives: Boolean(sharedDriveId)
      });
      return success(res, { file: response.data });
    }
    const file = saveLocally(req.file, fileName);
    return success(res, { file });
  } catch (error) {
    fail(res, error.message);
  }
});

// ---------------------------------------------------------------------------
// Arquivos vinculados a um projeto (comprovantes, imagens da história etc.).
// Montado em /api/projects/:id/files — ver routes/index.js.
// ---------------------------------------------------------------------------

const projectFilesRouter = express.Router({ mergeParams: true });

// Nesta subtask os anexos de projeto aceitam apenas imagem e PDF.
const isAllowedProjectFile = (file) => {
  const mime = file.mimetype || '';
  return mime.startsWith('image/') || mime === 'application/pdf';
};

// Segue a estrutura de pastas já usada pelo Drive: Projetos/Ano/Mês/Projeto.
const buildProjectFolderSegments = (projectName) => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return ['Projetos', year, month, projectName];
};

const toProjectFileDto = (row) => ({
  id: row.id,
  name: row.name,
  type: row.mime_type,
  mimeType: row.mime_type,
  size: row.size,
  downloadUrl: row.download_url,
  webContentLink: row.download_url,
  createdAt: row.created_at
});

projectFilesRouter.get('/', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const project = await queryOne('SELECT id FROM projects WHERE id = ?', [id]);
    if (!project) return fail(res, 'Projeto não encontrado', 404);
    const rows = await query(
      `SELECT id, name, mime_type, size, storage, storage_ref, download_url, created_at
       FROM project_files WHERE project_id = ? ORDER BY created_at DESC`,
      [id]
    );
    success(res, { files: rows.map(toProjectFileDto) });
  } catch (error) {
    fail(res, error.message);
  }
});

projectFilesRouter.post('/', requirePrivileged, uploadProjectFiles.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await queryOne('SELECT id, name FROM projects WHERE id = ?', [id]);
    if (!project) return fail(res, 'Projeto não encontrado', 404);
    if (!req.files || req.files.length === 0) {
      return fail(res, 'Selecione ao menos um arquivo', 400);
    }
    const invalidFile = req.files.find((file) => !isAllowedProjectFile(file));
    if (invalidFile) {
      return fail(res, 'Tipo de arquivo não permitido. Envie imagem ou PDF', 400);
    }

    const useProjectDrive = await useDrive();
    let driveClient = null;
    let targetFolderId = null;
    let sharedDriveId = null;
    if (useProjectDrive) {
      driveClient = await getDriveClient();
      const context = getDriveContext();
      sharedDriveId = context.sharedDriveId;
      targetFolderId = await resolveFolderPath(
        driveClient,
        context.folderId,
        buildProjectFolderSegments(project.name),
        sharedDriveId
      );
    }

    const saved = [];
    for (const file of req.files) {
      if (useProjectDrive) {
        const response = await driveClient.files.create({
          requestBody: { name: file.originalname, parents: [targetFolderId] },
          media: { mimeType: file.mimetype, body: Readable.from(file.buffer) },
          fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink',
          supportsAllDrives: Boolean(sharedDriveId)
        });
        const data = response.data;
        const [row] = await query(
          `INSERT INTO project_files (project_id, name, mime_type, size, storage, storage_ref, download_url)
           VALUES (?, ?, ?, ?, 'drive', ?, ?) RETURNING *`,
          [id, data.name, data.mimeType, data.size || file.size, data.id, data.webContentLink || data.webViewLink]
        );
        saved.push(row);
      } else {
        const local = saveLocally(file, file.originalname);
        const [row] = await query(
          `INSERT INTO project_files (project_id, name, mime_type, size, storage, storage_ref, download_url)
           VALUES (?, ?, ?, ?, 'local', ?, ?) RETURNING *`,
          [id, local.name, local.mimeType, file.size, local.id, local.webContentLink]
        );
        saved.push(row);
      }
    }

    success(res, { files: saved.map(toProjectFileDto) });
  } catch (error) {
    fail(res, error.message);
  }
});

projectFilesRouter.delete('/:fileId', requirePrivileged, async (req, res) => {
  try {
    const { id, fileId } = req.params;
    const file = await queryOne(
      'SELECT * FROM project_files WHERE id = ? AND project_id = ?',
      [fileId, id]
    );
    if (!file) return fail(res, 'Arquivo não encontrado', 404);

    if (file.storage === 'drive') {
      if (await useDrive()) {
        const driveClient = await getDriveClient();
        const { sharedDriveId } = getDriveContext();
        try {
          await driveClient.files.delete({
            fileId: file.storage_ref,
            supportsAllDrives: Boolean(sharedDriveId)
          });
        } catch (driveError) {
          // Arquivo pode já ter sido removido diretamente no Drive; segue com a remoção do registro.
        }
      }
    } else {
      const filePath = path.join(UPLOADS_DIR, file.storage_ref);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await execute('DELETE FROM project_files WHERE id = ?', [fileId]);
    success(res);
  } catch (error) {
    fail(res, error.message);
  }
});

router.projectFilesRouter = projectFilesRouter;

module.exports = router;
