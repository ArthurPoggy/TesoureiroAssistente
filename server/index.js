const config = require('./config');
const app = require('./app');

if (!config.isVercel) {
  app.listen(config.PORT, () => {
    console.log(`Tesoureiro Assistente API rodando na porta ${config.PORT}`);
  });
}

module.exports = app;
