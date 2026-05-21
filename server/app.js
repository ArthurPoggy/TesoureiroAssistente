const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const { initDatabase } = require('./db/connection');
const { runMigrations } = require('./db/migrations');
const { runAutoSeed } = require('./db/autoSeed');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Inicializar banco de dados
initDatabase();
runMigrations();

if (!['production', 'test'].includes(process.env.NODE_ENV) && !config.useSupabase) {
  runAutoSeed();
}

// Criar app Express
const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Arquivos locais (fallback quando Google Drive não configurado)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas da API
app.use('/api', routes);

// Error handlers
app.use(errorHandler);
app.use(notFoundHandler);

module.exports = app;
