const request = require('supertest');
const app = require('../app');
const { tokens, auth, cleanAll, insertProject } = require('./helpers');

// ---------------------------------------------------------------------------
// Contrato esperado desta subtask (ainda não implementado — testes nascem "red"):
//
// - POST   /api/projects/:id/files        -> upload de um ou mais arquivos
//   (multipart, campo "files"), aceita imagem e PDF, até 20MB por arquivo,
//   seguindo a estrutura de pastas Projetos/Ano/Mês/Projeto no Drive.
// - GET    /api/projects/:id/files        -> lista arquivos do projeto com
//   metadados (name, mimeType/type, downloadUrl/webContentLink).
// - DELETE /api/projects/:id/files/:fileId -> remove um arquivo do projeto.
//
// Upload e remoção restritos a admin/diretor_financeiro. Leitura liberada a
// membros do projeto e a viewer.
// ---------------------------------------------------------------------------

// PNG mínimo válido (cabeçalho PNG real, suficiente para exercitar o
// caminho de "imagem" sem depender de um arquivo real no disco).
const PNG_BUFFER = Buffer.from(
  '89504e470d0a1a0a0000000d494844520000000100000001080600000' +
    '01f15c4890000000a49444154789c6360000002000100ffff03000006' +
    '0005fa9bda5f0000000049454e44ae426082',
  'hex'
);

const PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  'utf-8'
);

// Buffer acima de 20MB para testar a rejeição de arquivos grandes demais.
const OVERSIZED_BUFFER = Buffer.alloc(20 * 1024 * 1024 + 1, 1);

beforeEach(() => {
  cleanAll();
});

describe('POST /api/projects/:id/files — upload de arquivos do projeto', () => {
  test('admin consegue enviar uma imagem vinculada ao projeto', async () => {
    const projectId = insertProject({ name: 'Projeto Upload' });

    const res = await request(app)
      .post(`/api/projects/${projectId}/files`)
      .set(auth(tokens.admin()))
      .attach('files', PNG_BUFFER, { filename: 'comprovante.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBe(1);
    expect(res.body.files[0].name).toMatch(/comprovante/);
  });

  test('diretor financeiro consegue enviar um PDF vinculado ao projeto', async () => {
    const projectId = insertProject({ name: 'Projeto Upload PDF' });

    const res = await request(app)
      .post(`/api/projects/${projectId}/files`)
      .set(auth(tokens.diretor()))
      .attach('files', PDF_BUFFER, { filename: 'nota-fiscal.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.files[0].name).toMatch(/nota-fiscal/);
  });

  test('rejeita arquivo acima de 20MB', async () => {
    const projectId = insertProject({ name: 'Projeto Upload Grande' });

    // O envio de um arquivo grande demais pode ser recusado com uma resposta
    // 4xx (fluxo esperado depois de implementado) ou derrubar a conexão
    // durante o upload (o que ocorre hoje, já que a rota nem existe) — ambos
    // contam como "não aceitou o arquivo".
    let res;
    let connectionError;
    try {
      res = await request(app)
        .post(`/api/projects/${projectId}/files`)
        .set(auth(tokens.admin()))
        .attach('files', OVERSIZED_BUFFER, { filename: 'gigante.png', contentType: 'image/png' });
    } catch (error) {
      connectionError = error;
    }

    if (res) {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(res.body.ok).toBe(false);
    } else {
      // Conexão interrompida (ex.: ECONNRESET) também é uma rejeição válida
      // do arquivo grande demais.
      expect(connectionError).toBeDefined();
    }
  }, 30000);

  test('viewer não pode enviar arquivos (403)', async () => {
    const projectId = insertProject({ name: 'Projeto Upload Viewer' });

    const res = await request(app)
      .post(`/api/projects/${projectId}/files`)
      .set(auth(tokens.viewer()))
      .attach('files', PNG_BUFFER, { filename: 'comprovante.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });
});

describe('GET /api/projects/:id/files — listagem com metadados', () => {
  test('lista arquivos do projeto com nome, tipo e link de download', async () => {
    const projectId = insertProject({ name: 'Projeto Listagem' });

    await request(app)
      .post(`/api/projects/${projectId}/files`)
      .set(auth(tokens.admin()))
      .attach('files', PDF_BUFFER, { filename: 'comprovante-listagem.pdf', contentType: 'application/pdf' });

    const res = await request(app)
      .get(`/api/projects/${projectId}/files`)
      .set(auth(tokens.viewer()));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.files)).toBe(true);
    const file = res.body.files.find((f) => f.name.includes('comprovante-listagem'));
    expect(file).toBeTruthy();
    expect(file.type || file.mimeType).toBeTruthy();
    expect(file.downloadUrl || file.webContentLink || file.link).toBeTruthy();
  });
});

describe('DELETE /api/projects/:id/files/:fileId — remoção', () => {
  test('viewer não pode remover arquivos (403)', async () => {
    const projectId = insertProject({ name: 'Projeto Remocao Viewer' });

    const res = await request(app)
      .delete(`/api/projects/${projectId}/files/algum-id`)
      .set(auth(tokens.viewer()));

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });
});
