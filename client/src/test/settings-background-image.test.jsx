import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPanel } from '../components/settings/SettingsPanel';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};

const baseSettingsForm = {
  orgName: 'Clã Teste',
  orgTagline: 'Tagline',
  defaultPaymentAmount: '100',
  currentBalance: '0',
  documentFooter: '',
  paymentDueDay: '',
  pixKey: '',
  pixReceiver: '',
  dashboardNote: '',
  disclaimerText: ''
};

const defaultProps = {
  settingsForm: baseSettingsForm,
  setSettingsForm: noop,
  loading: false,
  saving: false,
  onSave: vi.fn(),
  onClose: noop,
  showToast: vi.fn(),
  handleError: vi.fn()
};

const buildFile = ({ name = 'fundo.png', type = 'image/png', size = 1024 } = {}) => {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
};

describe('SettingsPanel — upload de imagem de fundo', () => {
  let apiFetchMock;

  beforeEach(() => {
    apiFetchMock = vi.fn(async (url) => {
      if (url === '/api/settings/public') {
        return { loginBackgroundUrl: null, dashboardBackgroundUrl: null };
      }
      if (url === '/api/google-drive/status') {
        return { connected: false, source: 'none' };
      }
      if (url === '/api/settings/background-image') {
        return { ok: true, url: '/uploads/login-novo.jpg?v=999' };
      }
      throw new Error(`URL inesperada chamada no teste: ${url}`);
    });
    useAuth.mockReturnValue({ isAdmin: true, apiFetch: apiFetchMock });
  });

  it('faz upload de uma imagem válida e atualiza o preview', async () => {
    const showToast = vi.fn();
    render(<SettingsPanel {...defaultProps} showToast={showToast} />);

    const input = await screen.findByTestId('background-image-input-login');
    const file = buildFile();
    fireEvent.change(input, { target: { files: [file] } });

    const uploadButton = await screen.findByTestId('background-image-upload-login');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const uploadCall = apiFetchMock.mock.calls.find(([url]) => url === '/api/settings/background-image');
      expect(uploadCall).toBeTruthy();
    });

    const [, options] = apiFetchMock.mock.calls.find(
      ([url]) => url === '/api/settings/background-image'
    );
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('target')).toBe('login');
    expect(options.body.get('image')).toBeTruthy();

    const preview = await screen.findByTestId('background-image-preview-login');
    await waitFor(() => {
      expect(preview.getAttribute('src')).toContain('/uploads/login-novo.jpg');
    });

    expect(showToast).toHaveBeenCalled();
  });

  it('bloqueia arquivo inválido antes de enviar (formato não suportado)', async () => {
    render(<SettingsPanel {...defaultProps} />);

    const input = await screen.findByTestId('background-image-input-login');
    const invalidFile = buildFile({ name: 'documento.pdf', type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [invalidFile] } });

    const uploadButton = await screen.findByTestId('background-image-upload-login');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByTestId('background-image-error-login')).toBeInTheDocument();
    });

    const uploadCall = apiFetchMock.mock.calls.find(([url]) => url === '/api/settings/background-image');
    expect(uploadCall).toBeUndefined();
  });

  it('bloqueia arquivo acima de 5MB antes de enviar', async () => {
    render(<SettingsPanel {...defaultProps} />);

    const input = await screen.findByTestId('background-image-input-login');
    const oversizedFile = buildFile({ size: 5 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [oversizedFile] } });

    const uploadButton = await screen.findByTestId('background-image-upload-login');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByTestId('background-image-error-login')).toBeInTheDocument();
    });

    const uploadCall = apiFetchMock.mock.calls.find(([url]) => url === '/api/settings/background-image');
    expect(uploadCall).toBeUndefined();
  });

  it('não exibe o controle de upload de imagem de fundo para usuário sem permissão de admin', () => {
    useAuth.mockReturnValue({ isAdmin: false, apiFetch: apiFetchMock });
    render(<SettingsPanel {...defaultProps} />);

    expect(screen.queryByTestId('background-image-input-login')).not.toBeInTheDocument();
    expect(screen.queryByTestId('background-image-input-dashboard')).not.toBeInTheDocument();
  });
});
