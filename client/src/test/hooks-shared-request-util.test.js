import { readFileSync } from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { runRequest } from '../utils/hookRequests';

// Cobre a subtask "Clean code nos hooks mais críticos do frontend": usePayments,
// useExpenses e useMembers devem parar de repetir o padrão
// `try { ... } catch (error) { handleError(error); }` em cada chamada de API e
// passar a usar um util compartilhado (runRequest) extraído para
// client/src/utils/hookRequests.js.

describe('runRequest — util compartilhado de fetch/tratamento de erro', () => {
  it('retorna o valor resolvido quando a função assíncrona tem sucesso', async () => {
    const handleError = vi.fn();
    const result = await runRequest(handleError, async () => 'ok');
    expect(result).toBe('ok');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('encaminha o erro para handleError e não o propaga quando a função assíncrona falha', async () => {
    const handleError = vi.fn();
    const error = new Error('falha de rede');
    const result = await runRequest(handleError, async () => {
      throw error;
    });
    expect(handleError).toHaveBeenCalledWith(error);
    expect(result).toBeUndefined();
  });
});

describe('usePayments, useExpenses e useMembers — adoção do util compartilhado', () => {
  const hooksDir = path.join(process.cwd(), 'src', 'hooks');
  const hookFiles = ['usePayments.js', 'useExpenses.js', 'useMembers.js'];

  it.each(hookFiles)('%s importa runRequest de ../utils/hookRequests em vez de duplicar try/catch', (fileName) => {
    const source = readFileSync(path.join(hooksDir, fileName), 'utf8');
    expect(source).toMatch(/from\s+['"]\.\.\/utils\/hookRequests['"]/);
    expect(source).toMatch(/runRequest\s*\(/);
  });

  it.each(hookFiles)('%s não repete mais o bloco catch (error) { handleError(error); } cru', (fileName) => {
    const source = readFileSync(path.join(hooksDir, fileName), 'utf8');
    const duplicatedCatchBlocks = source.match(/catch\s*\(error\)\s*{\s*handleError\(error\);\s*}/g) || [];
    expect(duplicatedCatchBlocks.length).toBe(0);
  });
});
