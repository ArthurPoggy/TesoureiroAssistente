const { google } = require('googleapis');
const config = require('../config');

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

const getDriveClient = () => {
  if (config.hasOauth) {
    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: config.GOOGLE_REFRESH_TOKEN });
    return google.drive({ version: 'v3', auth: oauth2Client });
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

module.exports = {
  loadServiceAccount,
  getDriveClient,
  getDriveContext
};
