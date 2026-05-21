import { useEffect } from 'react';

export function EditProjectModal({ projectForm, setProjectForm, onSave, onClose, saving }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal modal--project" role="dialog" aria-modal="true" aria-labelledby="edit-project-title">
        <div className="modal-project-header">
          <div className="modal-project-icon" aria-hidden="true">📋</div>
          <div>
            <h2 id="edit-project-title">Editar projeto</h2>
            <p className="modal-project-subtitle">Atualize as informações do projeto</p>
          </div>
          <button
            type="button"
            className="modal-project-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            ×
          </button>
        </div>

        <form className="form-grid modal-project-form" onSubmit={onSave}>
          <div className="modal-project-section">
            <p className="modal-project-section-label">Informações gerais</p>
            <label>
              Nome do projeto
              <input
                placeholder="Nome do projeto"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                required
                autoFocus
              />
            </label>

            <label>
              Descrição
              <textarea
                placeholder="Descrição (opcional)"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                rows={3}
              />
            </label>

            <label>
              Status
              <select
                value={projectForm.status}
                onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </div>

          <div className="modal-project-section">
            <p className="modal-project-section-label">Período</p>
            <div className="modal-project-dates">
              <label>
                Data de início
                <input
                  type="date"
                  value={projectForm.start_date || ''}
                  onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                />
              </label>

              <label>
                Data de término
                <input
                  type="date"
                  value={projectForm.end_date || ''}
                  min={projectForm.start_date || undefined}
                  onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button type="button" className="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
