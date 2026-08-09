import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// Tela admin de gestão granular de permissões por membro.
//
// Consome as rotas construídas na subtask anterior
// (server/routes/members.js + server/utils/permissions.js):
//   GET    /api/members/:id/permissions
//   PUT    /api/members/:id/permissions/:codigo   { allowed }
//   DELETE /api/members/:id/permissions/:codigo   (restaura o preset do role)
//
// Cada linha da matriz representa uma permissão do catálogo. Quando o valor
// efetivo do membro para aquela permissão diverge do preset "cru" do seu
// role (isto é, existe um override em member_permissions), a linha exibe o
// indicador "Customizado" e um botão "Restaurar padrão". Quando a permissão
// não está no preset do role e ainda assim não há override, exibe-se
// "Preset aplicado" para deixar claro que o estado atual reflete o papel do
// membro, não uma ausência de configuração.
const groupByCategory = (catalog) => {
  const groups = new Map();
  catalog.forEach((permission) => {
    const list = groups.get(permission.category) || [];
    list.push(permission);
    groups.set(permission.category, list);
  });
  return Array.from(groups.entries()).map(([category, permissions]) => ({ category, permissions }));
};

export function PermissionsMatrix({ member }) {
  const { apiFetch } = useAuth();
  const [catalog, setCatalog] = useState([]);
  const [preset, setPreset] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingCode, setPendingCode] = useState(null);

  useEffect(() => {
    if (!member?.id) return;
    let canceled = false;
    setLoading(true);
    setError('');
    apiFetch(`/api/members/${member.id}/permissions`)
      .then((data) => {
        if (canceled) return;
        setCatalog(data?.catalog || []);
        setPreset(data?.preset || []);
        setOverrides(data?.overrides || []);
      })
      .catch((err) => {
        if (!canceled) setError(err.message || 'Não foi possível carregar as permissões.');
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [member?.id, apiFetch]);

  const presetSet = useMemo(() => new Set(preset), [preset]);
  const overrideByCode = useMemo(() => {
    const map = new Map();
    overrides.forEach((o) => map.set(o.code, Number(o.allowed)));
    return map;
  }, [overrides]);

  const isChecked = useCallback(
    (code) => (overrideByCode.has(code) ? overrideByCode.get(code) === 1 : presetSet.has(code)),
    [overrideByCode, presetSet]
  );

  const groups = useMemo(() => groupByCategory(catalog), [catalog]);

  const handleToggle = async (code, nextAllowed) => {
    if (!member?.id) return;
    setPendingCode(code);
    setError('');
    try {
      await apiFetch(`/api/members/${member.id}/permissions/${code}`, {
        method: 'PUT',
        body: { allowed: nextAllowed }
      });
      setOverrides((prev) => [...prev.filter((o) => o.code !== code), { code, allowed: nextAllowed ? 1 : 0 }]);
    } catch (err) {
      setError(err.message || 'Não foi possível alterar a permissão.');
    } finally {
      setPendingCode(null);
    }
  };

  const handleRevert = async (code) => {
    if (!member?.id) return;
    setPendingCode(code);
    setError('');
    try {
      await apiFetch(`/api/members/${member.id}/permissions/${code}`, { method: 'DELETE' });
      setOverrides((prev) => prev.filter((o) => o.code !== code));
    } catch (err) {
      setError(err.message || 'Não foi possível restaurar o padrão.');
    } finally {
      setPendingCode(null);
    }
  };

  if (loading) {
    return <p className="permissions-matrix-loading">Carregando permissões...</p>;
  }

  return (
    <div className="permissions-matrix">
      {error && <p className="permissions-matrix-error">{error}</p>}
      {groups.map(({ category, permissions }) => (
        <section key={category} className="permissions-matrix-category">
          <h4>{category}</h4>
          <ul className="permissions-matrix-list">
            {permissions.map((permission) => {
              const hasOverride = overrideByCode.has(permission.code);
              const inPreset = presetSet.has(permission.code);
              const checked = isChecked(permission.code);
              const showIndicator = hasOverride || !inPreset;
              const indicatorLabel = hasOverride ? 'Customizado' : 'Preset aplicado';
              const disabled = pendingCode === permission.code;
              return (
                <li key={permission.code} className="permissions-matrix-row">
                  <label className="permissions-matrix-checkbox">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={(e) => handleToggle(permission.code, e.target.checked)}
                    />
                    {permission.name}
                  </label>
                  {showIndicator && (
                    <span
                      className={`permissions-matrix-badge ${hasOverride ? 'is-custom' : 'is-preset'}`}
                    >
                      {indicatorLabel}
                    </span>
                  )}
                  {hasOverride && (
                    <button
                      type="button"
                      className="ghost permissions-matrix-revert"
                      disabled={disabled}
                      onClick={() => handleRevert(permission.code)}
                    >
                      Restaurar padrão
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
