import { useRef, useState } from 'react';
import { formatFileSize } from '../../utils/formatters';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_TYPES = ['application/pdf'];

function isImage(file) {
  return typeof file.mimeType === 'string' && file.mimeType.startsWith('image/');
}

function validateFiles(files) {
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return `"${file.name}" excede o limite de 20MB por arquivo.`;
    }
    const type = file.type || '';
    const allowed = ALLOWED_MIME_PREFIXES.some((prefix) => type.startsWith(prefix)) ||
      ALLOWED_MIME_TYPES.includes(type);
    if (!allowed) {
      return `"${file.name}" possui um tipo/formato não suportado. Envie imagens ou PDF.`;
    }
  }
  return null;
}

export function ProjectAttachments({ project, canEdit, onUploadProjectFiles, onRemoveProjectFile }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const inputRef = useRef(null);

  const files = project.files || [];

  const handleFiles = async (fileList) => {
    const fileArray = Array.from(fileList || []);
    if (fileArray.length === 0) return;
    const validationError = validateFiles(fileArray);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    try {
      setUploading(true);
      await onUploadProjectFiles(project.id, fileArray);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer?.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => {
    handleFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleFileClick = (file) => {
    if (isImage(file)) {
      setPreviewFile(file);
    }
  };

  const handleRemove = (fileId) => {
    onRemoveProjectFile(project.id, fileId);
  };

  return (
    <div className="project-attachments">
      <strong>Anexos:</strong>

      {canEdit && (
        <div
          className={`project-files-dropzone ${isDragging ? 'is-dragging' : ''}`.trim()}
          data-testid={`project-files-dropzone-${project.id}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="project-files-input"
            onChange={handleInputChange}
          />
          <span>
            {uploading
              ? 'Enviando...'
              : 'Arraste arquivos aqui ou clique para selecionar (imagens e PDF, até 20 megabytes cada)'}
          </span>
        </div>
      )}

      {error && <p className="project-files-error">{error}</p>}

      {files.length === 0 ? (
        <p className="project-files-empty">Nenhum arquivo anexado ainda.</p>
      ) : (
        <ul className="project-files-list">
          {files.map((file) => (
            <li key={file.id} className="project-file-item">
              <button
                type="button"
                className="project-file-name"
                onClick={() => handleFileClick(file)}
              >
                {file.name}
              </button>
              <span className="project-file-type">{file.mimeType}</span>
              <span className="project-file-size">{formatFileSize(file.size)}</span>
              <a
                className="project-file-download"
                aria-label={file.name}
                href={file.downloadUrl || file.webViewLink}
                target="_blank"
                rel="noreferrer"
              >
                Baixar
              </a>
              {canEdit && (
                <button
                  type="button"
                  className="project-file-remove"
                  aria-label={`Remover anexo ${file.name}`}
                  onClick={() => handleRemove(file.id)}
                >
                  Remover anexo
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div
            className="modal modal--preview"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview de ${previewFile.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>{previewFile.name}</h3>
              <button
                type="button"
                className="ghost"
                onClick={() => setPreviewFile(null)}
                aria-label="Fechar preview"
              >
                ×
              </button>
            </div>
            <img
              src={previewFile.downloadUrl || previewFile.webViewLink}
              alt={previewFile.name}
              className="project-file-preview-img"
            />
          </div>
        </div>
      )}
    </div>
  );
}
