import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProjectsPanel } from '../components/projects/ProjectsPanel';

// ---------------------------------------------------------------------------
// Contrato esperado desta subtask (ainda não implementado no frontend —
// testes nascem "red"):
//
// - Cada card de projeto exibe um bloco de anexos (AttachmentsBlock
//   integrado) com uma área de drop identificável via
//   `screen.getByTestId('project-files-dropzone-<projectId>')`, aceitando
//   arraste-e-solte de múltiplos arquivos.
// - Ao soltar um arquivo válido na dropzone, `onUploadProjectFiles` é
//   chamado com (projectId, FileList/array de File).
// - Arquivo acima de 20MB é rejeitado ANTES do upload (onUploadProjectFiles
//   não é chamado) e uma mensagem de erro mencionando o limite é exibida.
// - Arquivo de tipo não suportado (ex.: .exe) é rejeitado da mesma forma,
//   com mensagem de erro mencionando o tipo/formato.
// - Os arquivos já anexados ao projeto aparecem listados com nome, tipo e
//   um link de download funcional (href aponta para a URL do arquivo).
// - Ao clicar em um arquivo de imagem da lista, abre-se um modal de
//   preview (`role="dialog"`) contendo uma tag <img> com a imagem.
// - admin/diretor_financeiro (canEdit=true) veem a dropzone de upload e
//   botão de remover cada anexo.
// - viewer (canEdit=false) NÃO vê dropzone/input de upload nem botão de
//   remover anexo — apenas a listagem com link de download.
// ---------------------------------------------------------------------------

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../contexts/AuthContext';

const noop = () => {};
const asyncNoop = async () => {};

function makeFile(name, sizeBytes, type) {
  const file = new File(['x'.repeat(Math.min(sizeBytes, 10))], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });
  return file;
}

const baseProject = {
  id: 1,
  name: 'Reforma da sede',
  description: 'Projeto com anexos',
  status: 'active',
  members: [],
  milestones: [],
  files: [
    {
      id: 501,
      name: 'planta-baixa.png',
      mimeType: 'image/png',
      size: 204800,
      webViewLink: 'https://drive.example.com/view/501',
      downloadUrl: 'https://drive.example.com/download/501'
    },
    {
      id: 502,
      name: 'contrato.pdf',
      mimeType: 'application/pdf',
      size: 1048576,
      webViewLink: 'https://drive.example.com/view/502',
      downloadUrl: 'https://drive.example.com/download/502'
    }
  ]
};

const defaultProps = {
  projects: [baseProject],
  projectForm: { name: '', description: '', status: 'active' },
  setProjectForm: noop,
  editingProjectId: null,
  members: [],
  onSubmit: asyncNoop,
  onDelete: asyncNoop,
  onEdit: noop,
  onReset: noop,
  onAddMember: asyncNoop,
  onRemoveMember: asyncNoop,
  onAddMilestone: asyncNoop,
  onRemoveMilestone: asyncNoop,
  onUploadProjectFiles: asyncNoop,
  onRemoveProjectFile: asyncNoop,
  saving: false
};

function dropFiles(dropzone, files) {
  const dataTransfer = { files, items: files.map((f) => ({ kind: 'file', getAsFile: () => f })) };
  fireEvent.drop(dropzone, { dataTransfer });
}

describe('Anexos do projeto (upload drag-and-drop e preview)', () => {
  describe('admin/diretor_financeiro (canEdit=true)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ canEdit: true });
    });

    it('lista os arquivos já anexados com nome, tipo e link de download funcional', () => {
      render(<ProjectsPanel {...defaultProps} />);

      expect(screen.getByText('planta-baixa.png')).toBeInTheDocument();
      expect(screen.getByText('contrato.pdf')).toBeInTheDocument();

      const link = screen.getByRole('link', { name: /contrato\.pdf|baixar|download/i });
      expect(link).toHaveAttribute('href', 'https://drive.example.com/download/502');
    });

    it('envia arquivo solto via drag-and-drop na dropzone do projeto', () => {
      const onUploadProjectFiles = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onUploadProjectFiles={onUploadProjectFiles} />);

      const dropzone = screen.getByTestId('project-files-dropzone-1');
      const validFile = makeFile('nota-fiscal.pdf', 1024 * 1024, 'application/pdf');
      dropFiles(dropzone, [validFile]);

      expect(onUploadProjectFiles).toHaveBeenCalledTimes(1);
      const [calledProjectId, calledFiles] = onUploadProjectFiles.mock.calls[0];
      expect(calledProjectId).toBe(1);
      expect(Array.from(calledFiles).map((f) => f.name)).toContain('nota-fiscal.pdf');
    });

    it('rejeita arquivo acima de 20MB sem chamar o upload', () => {
      const onUploadProjectFiles = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onUploadProjectFiles={onUploadProjectFiles} />);

      const dropzone = screen.getByTestId('project-files-dropzone-1');
      const oversizedFile = makeFile('video-grande.mp4', 21 * 1024 * 1024, 'video/mp4');
      dropFiles(dropzone, [oversizedFile]);

      expect(onUploadProjectFiles).not.toHaveBeenCalled();
      expect(screen.getByText(/20\s*mb/i)).toBeInTheDocument();
    });

    it('rejeita arquivo de tipo não suportado sem chamar o upload', () => {
      const onUploadProjectFiles = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onUploadProjectFiles={onUploadProjectFiles} />);

      const dropzone = screen.getByTestId('project-files-dropzone-1');
      const badFile = makeFile('script.exe', 1024, 'application/x-msdownload');
      dropFiles(dropzone, [badFile]);

      expect(onUploadProjectFiles).not.toHaveBeenCalled();
      expect(screen.getByText(/tipo|formato/i)).toBeInTheDocument();
    });

    it('abre modal de preview ao clicar em um arquivo de imagem', () => {
      render(<ProjectsPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('planta-baixa.png'));

      const dialog = screen.getByRole('dialog');
      const img = within(dialog).getByRole('img');
      expect(img).toHaveAttribute('src', expect.stringContaining('501'));
    });

    it('não abre modal de preview ao clicar em um arquivo que não é imagem', () => {
      render(<ProjectsPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('contrato.pdf'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('exibe botão de remover anexo para cada arquivo listado', () => {
      const onRemoveProjectFile = vi.fn(async () => {});
      render(<ProjectsPanel {...defaultProps} onRemoveProjectFile={onRemoveProjectFile} />);

      const removeButtons = screen.getAllByRole('button', { name: /remover anexo/i });
      expect(removeButtons.length).toBeGreaterThan(0);

      fireEvent.click(removeButtons[0]);
      expect(onRemoveProjectFile).toHaveBeenCalledWith(1, 501);
    });
  });

  describe('viewer (canEdit=false)', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({ canEdit: false });
    });

    it('lista arquivos com link de download, mas sem dropzone/input de upload', () => {
      render(<ProjectsPanel {...defaultProps} />);

      expect(screen.getByText('planta-baixa.png')).toBeInTheDocument();
      expect(screen.queryByTestId('project-files-dropzone-1')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /enviar arquivo/i })).not.toBeInTheDocument();
    });

    it('não exibe botão de remover anexo', () => {
      render(<ProjectsPanel {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /remover anexo/i })).not.toBeInTheDocument();
    });

    it('ainda consegue abrir o preview de imagem em modal', () => {
      render(<ProjectsPanel {...defaultProps} />);

      fireEvent.click(screen.getByText('planta-baixa.png'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
