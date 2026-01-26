const { google } = require('googleapis');
const config = require('../config');
const { getSetting } = require('./settings');

const loadServiceAccount = () => {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const parsed = JSON.parse(raw);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    };
  }
  return null;
};

const getStoredRefreshToken = async () => {
  if (config.GOOGLE_REFRESH_TOKEN) {
    return config.GOOGLE_REFRESH_TOKEN;
  }
  const stored = await getSetting('google_refresh_token');
  return stored || null;
};

const hasOauthClient = () => Boolean(config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET);

const getDriveClient = async () => {
  if (hasOauthClient()) {
    const refreshToken = await getStoredRefreshToken();
    if (refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        config.GOOGLE_CLIENT_ID,
        config.GOOGLE_CLIENT_SECRET,
        config.GOOGLE_REDIRECT_URI
      );
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      return google.drive({ version: 'v3', auth: oauth2Client });
    }
  }
  const credentials = loadServiceAccount();
  if (!credentials) {
    throw new Error('Google Drive não configurado');
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  return google.drive({ version: 'v3', auth });
};

const getDriveContext = () => {
  if (!config.GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error('Google Drive não configurado');
  }
  return {
    folderId: config.GOOGLE_DRIVE_FOLDER_ID,
    sharedDriveId: config.GOOGLE_DRIVE_SHARED_DRIVE_ID || null
  };
};

const folderCache = new Map();

const sanitizeFolderName = (name) => {
  if (!name) return '';
  return String(name).trim().replace(/[\\/]+/g, '-');
};

const escapeQueryValue = (value) => String(value).replace(/'/g, "\\'");

const ensureFolder = async (drive, parentId, name, sharedDriveId) => {
  const safeName = sanitizeFolderName(name);
  if (!safeName) return parentId;
  const cacheKey = `${parentId}:${safeName}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }
  const queryParts = [
    `'${parentId}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    `name = '${escapeQueryValue(safeName)}'`,
    'trashed = false'
  ];
  const listParams = {
    q: queryParts.join(' and '),
    fields: 'files(id, name)',
    pageSize: 1
  };
  if (sharedDriveId) {
    listParams.driveId = sharedDriveId;
    listParams.corpora = 'drive';
    listParams.includeItemsFromAllDrives = true;
    listParams.supportsAllDrives = true;
  }
  const listResponse = await drive.files.list(listParams);
  const existingFolder = listResponse.data.files?.[0];
  if (existingFolder?.id) {
    folderCache.set(cacheKey, existingFolder.id);
    return existingFolder.id;
  }
  const createParams = {
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    },
    fields: 'id, name'
  };
  if (sharedDriveId) {
    createParams.supportsAllDrives = true;
  }
  const createResponse = await drive.files.create(createParams);
  const createdFolder = createResponse.data;
  folderCache.set(cacheKey, createdFolder.id);
  return createdFolder.id;
};

const resolveFolderPath = async (drive, rootFolderId, segments, sharedDriveId) => {
  let currentFolderId = rootFolderId;
  for (const segment of segments) {
    if (!segment) continue;
    currentFolderId = await ensureFolder(drive, currentFolderId, segment, sharedDriveId);
  }
  return currentFolderId;
};

module.exports = {
  loadServiceAccount,
  getDriveClient,
  getDriveContext,
  resolveFolderPath,
  getStoredRefreshToken,
  hasOauthClient
};
