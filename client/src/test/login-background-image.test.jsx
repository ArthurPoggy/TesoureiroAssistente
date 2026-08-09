import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LoginScreen } from '../components/auth/LoginScreen';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('../services/api', () => ({
  fetchJSON: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';
import { fetchJSON } from '../services/api';

const CUSTOM_LOGIN_BG = '/uploads/login-custom.jpg?v=42';

describe('LoginScreen — imagem de fundo', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      login: vi.fn(),
      register: vi.fn(),
      setupPassword: vi.fn(),
      authLoading: false
    });
  });

  it('aplica a imagem de fundo customizada configurada em settings públicos, com overlay legível', async () => {
    fetchJSON.mockImplementation((url) => {
      if (url === '/api/settings/public') {
        return Promise.resolve({ loginBackgroundUrl: CUSTOM_LOGIN_BG, dashboardBackgroundUrl: null });
      }
      if (url === '/api/settings/disclaimer') {
        return Promise.resolve({ disclaimerText: '' });
      }
      return Promise.reject(new Error(`URL inesperada: ${url}`));
    });

    render(<LoginScreen />);

    const screenEl = await screen.findByTestId('login-screen');

    await waitFor(() => {
      expect(screenEl.style.backgroundImage).toContain(CUSTOM_LOGIN_BG);
    });
    expect(screenEl.style.backgroundSize).toBe('cover');
    expect(screenEl.style.backgroundPosition).toBe('center');

    // Overlay deve existir para garantir legibilidade do formulário sobre a imagem.
    const overlay = screen.getByTestId('login-screen-overlay');
    expect(overlay).toBeInTheDocument();
    const overlayBg = overlay.style.background || overlay.style.backgroundColor;
    expect(overlayBg).toMatch(/rgba?\(/);

    // O formulário continua acessível/legível (renderizado acima do overlay).
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('usa a imagem padrão da identidade visual como fallback quando não há imagem configurada', async () => {
    fetchJSON.mockImplementation((url) => {
      if (url === '/api/settings/public') {
        return Promise.resolve({ loginBackgroundUrl: null, dashboardBackgroundUrl: null });
      }
      if (url === '/api/settings/disclaimer') {
        return Promise.resolve({ disclaimerText: '' });
      }
      return Promise.reject(new Error(`URL inesperada: ${url}`));
    });

    render(<LoginScreen />);

    const screenEl = await screen.findByTestId('login-screen');

    await waitFor(() => {
      expect(screenEl.style.backgroundImage).not.toBe('');
    });
    // Não deve usar a URL de imagem customizada (que não foi configurada).
    expect(screenEl.style.backgroundImage).not.toContain(CUSTOM_LOGIN_BG);
  });
});
