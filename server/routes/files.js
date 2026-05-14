const express = require('express');
const { Readable } = require('stream');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { success, fail } = require('../utils/response');
const { requireAuth, requirePrivileged } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
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

module.exports = router;
