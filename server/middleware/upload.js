const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }
});

// Anexos de projeto (comprovantes/imagens): limite maior, até 20MB por arquivo.
const uploadProjectFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

module.exports = {
  upload,
  uploadProjectFiles
};
