import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Import estático e direto: client/src/components/admin/PermissionsMatrix.jsx
// ainda não existe neste branch. É esperado que a suíte falhe já na
// resolução deste import ("Failed to resolve import") até que a subtask
// implemente o componente — esse é o estado "red" proposital desta subtask.
import { PermissionsMatrix } from '../components/admin/PermissionsMatrix.jsx';

// Cobre a subtask "Tela admin de gestão de permissões por membro +
// documentação" (card "Refinar granularidade de roles e permissões do
// sistema").
//
// Contrato esperado do componente PermissionsMatrix
// (client/src/components/admin/PermissionsMatrix.jsx), que ainda não existe
// neste branch — este teste nasce "red" propositalmente:
//
//  - Ao montar, carrega o catálogo de permissões e o estado efetivo do
//    membro via GET `/api/members/:id/permissions`.
//  - Marcar/desmarcar uma permissão que diverge do preset do role chama
//    PUT `/api/members/:id/permissions/:codigo` com `{ allowed }` — a mesma
//    rota que deve delegar para `setMemberPermissionOverride`
//    (server/utils/permissions.js), passando pelo audit log e pela regra de
//    proteção do último admin construídos na subtask anterior.
//  - Cada permissão exibe um indicador visual diferenciando "preset
//    aplicado" de "customizado" quando o valor efetivo diverge do preset do
//    role atual do membro.
//  - Reverter uma permissão customizada (botão "Restaurar padrão") chama
//    DELETE `/api/members/:id/permissions/:codigo` e o membro volta a
//    refletir o preset do seu role (rollback / migração reversa).
const { apiFetchMock } = vi.hoisted(() => ({ apiFetchMock: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    apiFetch: apiFetchMock,
    authUser: { role: 'admin', memberId: 999, name: 'Admin' },
    isAdmin: true
  })
}));

const MEMBER = { id: 42, name: 'Membro Viewer', role: 'viewer' };

// Estado inicial devolvido pelo backend: preset de viewer não inclui
// 'pagamentos.criar', e não há nenhum override cadastrado ainda.
const initialPermissionsResponse = {
  catalog: [
    { code: 'pagamentos.ver', name: 'Visualizar pagamentos', category: 'Pagamentos' },
    { code: 'pagamentos.criar', name: 'Registrar novos pagamentos', category: 'Pagamentos' }
  ],
  preset: ['pagamentos.ver'],
  effective: ['pagamentos.ver'],
  overrides: []
};

describe('PermissionsMatrix — tela admin de gestão de permissões por membro', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('conceder um override customizado chama o endpoint de override e reflete o indicador "customizado"', async () => {
    apiFetchMock.mockImplementation((url, options = {}) => {
      if (url === '/api/members/42/permissions' && (!options.method || options.method === 'GET')) {
        return Promise.resolve(initialPermissionsResponse);
      }
      if (url === '/api/members/42/permissions/pagamentos.criar' && options.method === 'PUT') {
        expect(options.body).toMatchObject({ allowed: true });
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`chamada inesperada: ${options.method || 'GET'} ${url}`));
    });

    render(<PermissionsMatrix member={MEMBER} />);

    // Estado inicial: permissão fora do preset do viewer aparece desmarcada
    // e com indicador de "preset aplicado".
    const checkbox = await screen.findByRole('checkbox', { name: /registrar novos pagamentos/i });
    expect(checkbox.checked).toBe(false);
    expect(screen.getByText(/preset aplicado/i)).toBeInTheDocument();

    fireEvent.click(checkbox);

    // A alteração precisa passar pelo endpoint de override (o mesmo que
    // aciona setMemberPermissionOverride -> audit log + proteção do último
    // admin no backend).
    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/api/members/42/permissions/pagamentos.criar',
        expect.objectContaining({ method: 'PUT' })
      );
    });

    // Após o override ser aplicado, o indicador muda para "customizado".
    await waitFor(() => {
      expect(screen.getByText(/customizado/i)).toBeInTheDocument();
    });
  });

  it('reverter um override customizado (rollback) chama o endpoint de remoção e volta ao comportamento do preset', async () => {
    // Estado inicial: já existe um override customizado concedendo
    // 'pagamentos.criar' a um viewer (diverge do preset).
    const overriddenResponse = {
      ...initialPermissionsResponse,
      effective: ['pagamentos.ver', 'pagamentos.criar'],
      overrides: [{ code: 'pagamentos.criar', allowed: 1 }]
    };

    apiFetchMock.mockImplementation((url, options = {}) => {
      if (url === '/api/members/42/permissions' && (!options.method || options.method === 'GET')) {
        return Promise.resolve(overriddenResponse);
      }
      if (url === '/api/members/42/permissions/pagamentos.criar' && options.method === 'DELETE') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error(`chamada inesperada: ${options.method || 'GET'} ${url}`));
    });

    render(<PermissionsMatrix member={MEMBER} />);

    const checkbox = await screen.findByRole('checkbox', { name: /registrar novos pagamentos/i });
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText(/customizado/i)).toBeInTheDocument();

    const revertButton = screen.getByRole('button', { name: /restaurar padr[ãa]o/i });
    fireEvent.click(revertButton);

    await waitFor(() => {
      expect(apiFetchMock).toHaveBeenCalledWith(
        '/api/members/42/permissions/pagamentos.criar',
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    // Rollback concluído: o membro volta a refletir o preset do role
    // (viewer não tem 'pagamentos.criar'), então o indicador some/volta a
    // "preset aplicado" e o checkbox desmarca.
    await waitFor(() => {
      expect(screen.getByText(/preset aplicado/i)).toBeInTheDocument();
    });
    expect(checkbox.checked).toBe(false);
  });
});
