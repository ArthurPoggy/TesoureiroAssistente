import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { EditProjectModal } from './EditProjectModal';

const STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo' };

export function ProjectsPanel({
  projects,
  projectForm,
  setProjectForm,
  editingProjectId,
  members,
  onSubmit,
  onDelete,
  onEdit,
  onReset,
  onAddMember,
  onRemoveMember,
  saving
}) {
  const { canEdit } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingToProjectId, setAddingToProjectId] = useState(null);
  const [addMemberSelect, setAddMemberSelect] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const checkedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    const id = Number(selectedMemberId);
    const activeProjects = projects.filter(
      (p) => p.status === 'active' && p.members.some((m) => m.member_id === id)
    );
    return { member: members.find((m) => m.id === id), activeProjects };
  }, [selectedMemberId, projects, members]);

  const handleAddMember = async (projectId) => {
    if (!addMemberSelect) return;
    await onAddMember(projectId, Number(addMemberSelect));
    setAddingToProjectId(null);
    setAddMemberSelect('');
  };

  const handleEditClick = (project) => {
    onEdit(project);
    setIsEditModalOpen(true);
  };

  const handleModalSave = async (e) => {
    await onSubmit(e);
    setIsEditModalOpen(false);
  };

  const handleModalClose = () => {
    onReset();
    setIsEditModalOpen(false);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Projetos</h2>
        <p>Gerencie projetos e verifique a participação dos membros.</p>
      </div>

      <div className="member-project-check">
        <h3>Verificar membro</h3>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '320px' }}>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            <option value="">Selecionar membro...</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || m.nickname || m.email}
              </option>
            ))}
          </select>
        </div>
        {checkedMember && (
          <div className={`project-status-badge ${checkedMember.activeProjects.length > 0 ? 'status-active' : 'status-inactive'}`}>
            {checkedMember.activeProjects.length > 0 ? (
              <>
                <strong>{checkedMember.member?.name}</strong> possui{' '}
                {checkedMember.activeProjects.length === 1
                  ? `projeto ativo: ${checkedMember.activeProjects[0].name}`
                  : `${checkedMember.activeProjects.length} projetos ativos`}
              </>
            ) : (
              <>
                <strong>{checkedMember.member?.name}</strong> não possui projeto ativo
              </>
            )}
          </div>
        )}
      </div>

      {canEdit && !editingProjectId && (
        <form className="form-grid" onSubmit={onSubmit}>
          <input
            placeholder="Nome do projeto"
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={projectForm.description}
            onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
          />
          <select
            value={projectForm.status}
            onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
          <div className="form-actions">
            <button type="submit">Salvar projeto</button>
          </div>
        </form>
      )}

      <div className="events-list">
        {projects.length === 0 && (
          <p style={{ color: 'var(--text-muted, #888)', marginTop: '1rem' }}>
            Nenhum projeto cadastrado.
          </p>
        )}
        {projects.map((project) => (
          <article key={project.id} className="event-card">
            <div>
              <h3>{project.name}</h3>
              <span className={`project-status-inline ${project.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                {STATUS_LABEL[project.status] || project.status}
              </span>
            </div>
            {project.description && <p>{project.description}</p>}

            <div className="project-members">
              <strong>Membros:</strong>{' '}
              {project.members.length === 0 ? (
                <span style={{ color: 'var(--text-muted, #888)' }}>nenhum</span>
              ) : (
                project.members.map((m) => (
                  <span key={m.member_id} className="member-tag">
                    {m.name || m.nickname}
                    {canEdit && (
                      <button
                        type="button"
                        className="member-tag-remove"
                        title="Remover do projeto"
                        onClick={() => onRemoveMember(project.id, m.member_id)}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            {canEdit && (
              <>
                {addingToProjectId === project.id ? (
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr auto', marginTop: '0.5rem' }}>
                    <select
                      value={addMemberSelect}
                      onChange={(e) => setAddMemberSelect(e.target.value)}
                    >
                      <option value="">Selecionar membro...</option>
                      {members
                        .filter((m) => !project.members.some((pm) => pm.member_id === m.id))
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.nickname || m.email}
                          </option>
                        ))}
                    </select>
                    <div className="form-actions" style={{ margin: 0 }}>
                      <button type="button" onClick={() => handleAddMember(project.id)}>
                        Adicionar
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => { setAddingToProjectId(null); setAddMemberSelect(''); }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="goal-actions">
                    <button type="button" onClick={() => handleEditClick(project)}>Editar</button>
                    <button
                      type="button"
                      onClick={() => { setAddingToProjectId(project.id); setAddMemberSelect(''); }}
                    >
                      + Membro
                    </button>
                    <button type="button" className="ghost" onClick={() => onDelete(project.id)}>
                      Remover
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>

      {isEditModalOpen && editingProjectId && (
        <EditProjectModal
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          onSave={handleModalSave}
          onClose={handleModalClose}
          saving={saving}
        />
      )}
    </section>
  );
}
