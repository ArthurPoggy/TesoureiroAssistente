const express = require('express');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { getDriveClient, getDriveContext, resolveFolderPath } = require('../utils/google-drive');

const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

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
    success(res, { files: response.data.files || [] });
  } catch (error) {
    fail(res, error.message);
  }
});

router.post('/upload', requirePrivileged, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'Selecione um arquivo', 400);
    }
    const fileName = req.body?.name || req.file.originalname;
    try {
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
    } catch (driveError) {
      if (!driveError.message?.includes('não configurado')) throw driveError;
      const file = saveLocally(req.file, fileName);
      return success(res, { file });
    }
  } catch (error) {
    fail(res, error.message);
  }
});

module.exports = router;
