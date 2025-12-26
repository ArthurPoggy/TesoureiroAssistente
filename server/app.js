const express = require('express');
const cors = require('cors');
const config = require('./config');
const { initDatabase } = require('./db/connection');
const { runMigrations } = require('./db/migrations');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Inicializar banco de dados
initDatabase();
runMigrations();

// Criar app Express
const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api', routes);

// Error handlers
app.use(errorHandler);
app.use(notFoundHandler);

module.exports = app;
