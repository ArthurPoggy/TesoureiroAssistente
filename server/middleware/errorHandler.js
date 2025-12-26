const multer = require('multer');
const { fail } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return fail(res, 'Arquivo acima de 4 MB', 400);
    }
    return fail(res, err.message || 'Erro ao processar arquivo', 400);
  }
  if (err) {
    return fail(res, err.message || 'Erro interno', 500);
  }
  return next();
};

const notFoundHandler = (req, res) => fail(res, 'Rota não encontrada', 404);

module.exports = {
  errorHandler,
  notFoundHandler
};
