const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const useSupabase = Boolean(process.env.SUPABASE_DB_URL);

module.exports = {
  PORT: process.env.PORT || 4000,
  isVercel,
  useSupabase,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'tesoureiroassistente-secret',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,

  // Google Drive
  GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '1PkF3uJF1s_q9bCgmoFUIuWByGzKRnHYD',
  GOOGLE_DRIVE_SHARED_DRIVE_ID: process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'https://developers.google.com/oauthplayground',

  // Computed
  get adminConfigured() {
    return Boolean(this.ADMIN_EMAIL && this.ADMIN_PASSWORD);
  },
  get jwtConfigured() {
    return Boolean(this.JWT_SECRET);
  },
  get hasOauth() {
    return Boolean(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET && this.GOOGLE_REFRESH_TOKEN);
  },

  // Data directory
  get dataDir() {
    return process.env.DATA_DIR || path.join(isVercel ? '/tmp' : __dirname, '..', 'data');
  }
};
