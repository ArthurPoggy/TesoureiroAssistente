import { lazy, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings, useToast } from '../hooks';
import { Toast } from '../components';

// Painel de configurações carregado sob demanda (rota dedicada
// /configuracoes). O acesso a esta rota é restrito a diretor_financeiro e
// admin através de RoleRoute (ver App.jsx) — o menu já escondia o link para
// o viewer, mas a URL direta agora também é bloqueada.
const SettingsPanel = lazy(() =>
  import('../components/settings/SettingsPanel').then((mod) => ({ default: mod.SettingsPanel }))
);

export function SettingsPage() {
  const { authToken, authChecked, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, handleError } = useToast();

  const {
    settingsForm,
    setSettingsForm,
    loading,
    saving,
    loadPublicSettings,
    loadSettings,
    saveSettings
  } = useSettings(showToast, handleError);

  useEffect(() => {
    if (!authToken || !authChecked || !isAdmin) return;
    loadPublicSettings();
    loadSettings();
  }, [authToken, authChecked, isAdmin, loadPublicSettings, loadSettings]);

  return (
    <div className="app-shell">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <Suspense fallback={<p className="loading-panel">Carregando painel...</p>}>
        <SettingsPanel
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          loading={loading}
          saving={saving}
          onSave={saveSettings}
          onClose={() => navigate('/dashboard')}
          showToast={showToast}
          handleError={handleError}
        />
      </Suspense>
    </div>
  );
}
