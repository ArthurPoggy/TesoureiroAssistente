require('dotenv').config();
const config = require('./config');
const app = require('./app');

// Validação de configuração no startup
if (!config.jwtConfigured) {
  console.error('[ERRO] JWT_SECRET não definido. Autenticação não funcionará.');
}
if (config.ADMIN_EMAIL && !config.ADMIN_PASSWORD) {
  console.warn('[AVISO] ADMIN_EMAIL definido mas ADMIN_PASSWORD está ausente. Login do admin está desativado. Adicione ADMIN_PASSWORD ao .env');
} else if (!config.ADMIN_EMAIL && !config.adminConfigured) {
  console.warn('[AVISO] ADMIN_EMAIL e ADMIN_PASSWORD não definidos. Nenhum admin via variável de ambiente configurado.');
} else if (config.adminConfigured) {
  console.log(`[INFO] Admin configurado: ${config.ADMIN_EMAIL}`);
}

if (!config.isVercel) {
  app.listen(config.PORT, () => {
    console.log(`Tesoureiro Assistente API rodando na porta ${config.PORT}`);
  });
}

module.exports = app;
