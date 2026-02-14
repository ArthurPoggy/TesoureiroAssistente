const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const config = require('../config');
const { success, fail } = require('../utils/response');
const { requirePrivileged } = require('../middleware/auth');
const { isPrivilegedRole } = require('../utils/roles');
const { setSetting } = require('../utils/settings');
const { loadServiceAccount, getStoredRefreshToken, hasOauthClient } = require('../utils/google-drive');

const router = express.Router();

const buildRedirectUri = (req) => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const protocol = protoHeader ? protoHeader.split(',')[0].trim() : req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol || 'https'}://${host}/api/google-drive/callback`;
};

const renderHtml = (title, message) => `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 32px; color: #1c1c1c; }
      .card { max-width: 520px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; padding: 24px; }
      h1 { font-size: 20px; margin: 0 0 12px; }
      p { margin: 0 0 12px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${title}</h1>
      <p>${message}</p>
      <p>Você pode fechar esta janela.</p>
    </div>
    <script>
      (function () {
        try {
          if (window.opener && window.opener !== window) {
            window.opener.postMessage({ type: 'drive-auth', ok: true }, window.location.origin);
            setTimeout(function () { window.close(); }, 600);
          }
        } catch (e) {
          // ignore
        }
      })();
    </script>
  </body>
</html>`;

router.get('/status', requirePrivileged, async (req, res) => {
  try {
    const serviceAccount = loadServiceAccount();
    const refreshToken = await getStoredRefreshToken();
    const connected = Boolean(serviceAccount) || (hasOauthClient() && Boolean(refreshToken));
    const source = serviceAccount
      ? 'service_account'
      : refreshToken
        ? (config.GOOGLE_REFRESH_TOKEN ? 'env' : 'db')
        : 'none';
    success(res, { connected, source });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/auth-url', requirePrivileged, (req, res) => {
  try {
    if (!hasOauthClient()) {
      return fail(res, 'OAuth do Google Drive não configurado', 400);
    }
    const redirectUri = buildRedirectUri(req);
    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const state = jwt.sign(
      { purpose: 'drive_oauth', role: req.user?.role || 'admin' },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive'],
      state
    });
    success(res, { url });
  } catch (error) {
    fail(res, error.message);
  }
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query || {};
    if (error) {
      return res.status(400).send(renderHtml('Autorização cancelada', String(error)));
    }
    if (!code || !state) {
      return res.status(400).send(renderHtml('Dados incompletos', 'Código de autorização ausente.'));
    }
    let payload;
    try {
      payload = jwt.verify(state, config.JWT_SECRET);
    } catch (err) {
      return res.status(401).send(renderHtml('Sessão expirada', 'Reinicie a conexão e tente novamente.'));
    }
    if (payload?.purpose !== 'drive_oauth' || !isPrivilegedRole(payload?.role)) {
      return res.status(403).send(renderHtml('Acesso negado', 'Você não tem permissão para conectar o Drive.'));
    }
    if (!hasOauthClient()) {
      return res.status(400).send(renderHtml('OAuth não configurado', 'Configure o client ID e o client secret.'));
    }
    const redirectUri = buildRedirectUri(req);
    const oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      redirectUri
    );
    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens?.refresh_token;
    if (refreshToken) {
      await setSetting('google_refresh_token', refreshToken);
    }
    const message = refreshToken
      ? 'Conexão concluída. O token de atualização foi salvo.'
      : 'Conexão concluída, mas nenhum refresh token foi retornado. Tente novamente com prompt de consentimento.';
    return res.status(200).send(renderHtml('Google Drive conectado', message));
  } catch (error) {
    return res.status(500).send(renderHtml('Falha na conexão', error.message || 'Erro inesperado.'));
  }
});

module.exports = router;
