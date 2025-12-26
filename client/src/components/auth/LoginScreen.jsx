import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Toast } from '../common/Toast';

export function LoginScreen() {
  const { login, register, setupPassword, authLoading } = useAuth();
  const [authMode, setAuthMode] = useState('login');
  const [setupToken, setSetupToken] = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Verificar se há token de setup na URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const setup = params.get('setup');
    if (setup) {
      setSetupToken(setup);
      setAuthMode('setup');
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    const result = await login(loginForm.email, loginForm.password);
    if (result.success) {
      setLoginForm({ email: '', password: '' });
      showToast('Login realizado');
    } else {
      showToast(result.error || 'Erro ao fazer login', 'error');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('As senhas não conferem', 'error');
      return;
    }
    const result = await register(registerForm.name, registerForm.email, registerForm.password);
    if (result.success) {
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      showToast('Conta criada com sucesso');
    } else {
      showToast(result.error || 'Erro ao criar conta', 'error');
    }
  };

  const handleSetupPassword = async (event) => {
    event.preventDefault();
    if (!setupToken) {
      showToast('Informe o token de acesso', 'error');
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      showToast('As senhas não conferem', 'error');
      return;
    }
    const result = await setupPassword(setupToken, registerForm.password);
    if (result.success) {
      setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      setSetupToken('');
      showToast('Senha definida com sucesso');
    } else {
      showToast(result.error || 'Erro ao definir senha', 'error');
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        {toast && <Toast message={toast.message} type={toast.type} />}
        <h1>Tesoureiro Assistente</h1>

        {authMode === 'login' ? (
          <>
            <p>Entre para acessar os dados do clã.</p>
            <form className="login-form" onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthMode('register')}
            >
              Criar conta de membro
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthMode('setup')}
            >
              Tenho um link de primeiro acesso
            </button>
          </>
        ) : authMode === 'register' ? (
          <>
            <p>Crie seu acesso como membro.</p>
            <form className="login-form" onSubmit={handleRegister}>
              <input
                placeholder="Nome"
                value={registerForm.name}
                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Senha"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                required
              />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Criando...' : 'Criar conta'}
              </button>
            </form>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthMode('login')}
            >
              Voltar para login
            </button>
          </>
        ) : (
          <>
            <p>Defina sua nova senha para o primeiro acesso.</p>
            <form className="login-form" onSubmit={handleSetupPassword}>
              <input
                placeholder="Token de acesso"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Nova senha"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                required
              />
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Salvando...' : 'Salvar senha'}
              </button>
            </form>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthMode('login')}
            >
              Voltar para login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
