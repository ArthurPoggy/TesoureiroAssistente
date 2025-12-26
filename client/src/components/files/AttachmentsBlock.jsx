import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize, formatDateTime } from '../../utils/formatters';

export function AttachmentsBlock({
  files,
  filesLoading,
  fileForm,
  setFileForm,
  fileUploading,
  fileInputKey,
  onSubmit,
  variant = 'inline'
}) {
  const { canEdit } = useAuth();

  return (
    <div className={`attachments-block ${variant === 'column' ? 'standalone' : ''}`.trim()}>
      <div className="panel-header">
        <h3>Anexos do Drive</h3>
        <p>Use para comprovantes de pagamentos, despesas e eventos.</p>
      </div>

      {canEdit ? (
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            placeholder="Nome do arquivo (opcional)"
            value={fileForm.name}
            onChange={(e) => setFileForm({ ...fileForm, name: e.target.value })}
          />
          <input
            key={`${fileInputKey}-${variant}`}
            type="file"
            onChange={(e) =>
              setFileForm({ ...fileForm, file: e.target.files ? e.target.files[0] : null })
            }
          />
          <div className="form-actions">
            <button type="submit" disabled={fileUploading}>
              {fileUploading ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </div>
        </form>
      ) : (
        <p className="lock-hint">Somente o tesoureiro pode enviar arquivos.</p>
      )}

      <div className="table-wrapper">
        {filesLoading ? (
          <p>Carregando arquivos...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Tamanho</th>
                <th>Atualizado</th>
                <th>Acesso</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && (
                <tr>
                  <td colSpan="5">Nenhum arquivo enviado ainda.</td>
                </tr>
              )}
              {files.map((file) => (
                <tr key={file.id}>
                  <td>{file.name}</td>
                  <td>{file.mimeType}</td>
                  <td>{formatFileSize(file.size)}</td>
                  <td>{formatDateTime(file.modifiedTime)}</td>
                  <td>
                    {file.webViewLink || file.webContentLink ? (
                      <a
                        className="file-link"
                        href={file.webViewLink || file.webContentLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <small className="hint">
        Limite recomendado por envio: 4 MB (por restrição do ambiente serverless).
      </small>
    </div>
  );
}
