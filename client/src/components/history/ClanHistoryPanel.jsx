import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

function isImageFile(name) {
  if (!name) return false;
  const ext = name.split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export function ClanHistoryPanel({
  records,
  historyForm,
  setHistoryForm,
  editingHistoryId,
  fileInputKey,
  onSubmit,
  onDelete,
  onEdit,
  onReset
}) {
  const { canEdit } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  function handleEditClick(record) {
    onEdit(record);
    setShowForm(true);
  }

  function handleReset() {
    onReset();
    setShowForm(false);
  }

  async function handleSubmit(e) {
    await onSubmit(e);
    setShowForm(false);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>História do Clã</h2>
        {canEdit && !showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); onReset(); }}
          >
            + Novo Registro
          </button>
        )}
      </div>

      {canEdit && showForm && (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Título *
            <input
              type="text"
              value={historyForm.title}
              onChange={(e) => setHistoryForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Título do registro"
            />
          </label>

          <label>
            Data *
            <input
              type="date"
              value={historyForm.eventDate}
              onChange={(e) => setHistoryForm((f) => ({ ...f, eventDate: e.target.value }))}
              required
            />
          </label>

          <label style={{ gridColumn: '1 / -1' }}>
            Descrição
            <textarea
              value={historyForm.description}
              onChange={(e) => setHistoryForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descreva este momento histórico..."
              rows={4}
            />
          </label>

          <label>
            Foto ou Documento
            <input
              key={fileInputKey}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setHistoryForm((f) => ({ ...f, attachmentFile: e.target.files[0] || null }))}
            />
          </label>

          <label>
            Nome do arquivo
            <input
              type="text"
              value={historyForm.attachmentName}
              onChange={(e) => setHistoryForm((f) => ({ ...f, attachmentName: e.target.value }))}
              placeholder="Nome opcional para o arquivo"
            />
          </label>

          <div className="form-actions">
            <button type="submit">
              {editingHistoryId ? 'Salvar alterações' : 'Adicionar registro'}
            </button>
            <button type="button" className="ghost" onClick={handleReset}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {records.length === 0 ? (
        <p className="history-empty">Nenhum registro histórico ainda.</p>
      ) : (
        <div className="history-timeline">
          {records.map((record) => (
            <div key={record.id} className="history-card">
              <div className="history-date">{formatDate(record.event_date)}</div>
              <div className="history-content">
                <h3>{record.title}</h3>
                {record.description && <p>{record.description}</p>}

                {record.attachment_url && (
                  <div className="history-attachment">
                    {isImageFile(record.attachment_name) ? (
                      <img
                        src={record.attachment_url}
                        alt={record.attachment_name || 'Imagem'}
                        onClick={() => setLightboxUrl(record.attachment_url)}
                      />
                    ) : (
                      <a href={record.attachment_url} target="_blank" rel="noreferrer">
                        Baixar {record.attachment_name || 'documento'}
                      </a>
                    )}
                  </div>
                )}

                {canEdit && (
                  <div className="history-actions">
                    <button type="button" className="ghost" onClick={() => handleEditClick(record)}>
                      Editar
                    </button>
                    <button type="button" className="ghost" onClick={() => onDelete(record.id)}>
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxUrl && (
        <div className="history-lightbox" onClick={() => setLightboxUrl(null)}>
          <img
            src={lightboxUrl}
            alt="Visualização ampliada"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
