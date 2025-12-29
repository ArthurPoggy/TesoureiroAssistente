const express = require('express');
const { Readable } = require('stream');
const { success, fail } = require('../utils/response');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getDriveClient, getDriveContext, resolveFolderPath } = require('../utils/google-drive');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const drive = getDriveClient();
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
    success(res, { files: response.data.files || [] });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'Selecione um arquivo', 400);
    }
    const drive = getDriveClient();
    const { folderId, sharedDriveId } = getDriveContext();
    const { module: moduleName, year, month, label } = req.body || {};
    const folderSegments = [moduleName, year, month, label].filter(Boolean);
    const targetFolderId = await resolveFolderPath(drive, folderId, folderSegments, sharedDriveId);
    const fileMetadata = {
      name: req.body?.name || req.file.originalname,
      parents: [targetFolderId]
    };
    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer)
    };
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, webContentLink',
      supportsAllDrives: Boolean(sharedDriveId)
    });
    success(res, { file: response.data });
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
