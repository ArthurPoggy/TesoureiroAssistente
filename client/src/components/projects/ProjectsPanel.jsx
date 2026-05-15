import { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo' };

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function buildActiveChips({
  filterName,
  filterStatus,
  filterStartDate,
  filterEndDate,
  filterMemberId,
  members,
  handlers
}) {
  const chips = [];
  if (filterName) {
    chips.push({
      key: 'name',
      label: `Nome: "${filterName}"`,
      onClear: () => handlers.onFilterNameChange('')
    });
  }
  if (filterStatus) {
    chips.push({
      key: 'status',
      label: `Status: ${STATUS_LABEL[filterStatus] || filterStatus}`,
      onClear: () => handlers.onFilterStatusChange('')
    });
  }
  if (filterStartDate) {
    chips.push({
      key: 'startDate',
      label: `Criado a partir de ${formatDate(filterStartDate)}`,
      onClear: () => handlers.onFilterStartDateChange('')
    });
  }
  if (filterEndDate) {
    chips.push({
      key: 'endDate',
      label: `Criado até ${formatDate(filterEndDate)}`,
      onClear: () => handlers.onFilterEndDateChange('')
    });
  }
  if (filterMemberId) {
    const member = members.find((m) => String(m.id) === String(filterMemberId));
    chips.push({
      key: 'member',
      label: `Membro: ${member?.name || member?.nickname || filterMemberId}`,
      onClear: () => handlers.onFilterMemberIdChange('')
    });
  }
  return chips;
}

export function ProjectsPanel({
  projects,
  loading = false,
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
  filterName = '',
  filterStatus = '',
  filterStartDate = '',
  filterEndDate = '',
  filterMemberId = '',
  activeFiltersCount = 0,
  onFilterNameChange,
  onFilterStatusChange,
  onFilterStartDateChange,
  onFilterEndDateChange,
  onFilterMemberIdChange,
  onClearFilters
}) {
  const { canEdit } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [addingToProjectId, setAddingToProjectId] = useState(null);
  const [addMemberSelect, setAddMemberSelect] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

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

  const handlers = {
    onFilterNameChange,
    onFilterStatusChange,
    onFilterStartDateChange,
    onFilterEndDateChange,
    onFilterMemberIdChange
  };

  const chips = buildActiveChips({
    filterName,
    filterStatus,
    filterStartDate,
    filterEndDate,
    filterMemberId,
    members,
    handlers
  });

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

      {canEdit && (
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
            <button type="submit">{editingProjectId ? 'Atualizar projeto' : 'Salvar projeto'}</button>
            {editingProjectId && (
              <button type="button" className="ghost" onClick={onReset}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      <div className="projects-toolbar">
        <input
          type="text"
          className="projects-search"
          placeholder="🔍 Buscar projeto por nome..."
          value={filterName}
          onChange={(e) => onFilterNameChange?.(e.target.value)}
        />
        <button
          type="button"
          className="ghost filters-toggle-btn"
          onClick={() => setFiltersExpanded((v) => !v)}
          aria-expanded={filtersExpanded}
          aria-controls="projects-advanced-filters"
        >
          {filtersExpanded ? '▼ Filtros avançados' : '▶ Filtros avançados'}
          {activeFiltersCount > 0 && (
            <span className="filters-badge">{activeFiltersCount}</span>
          )}
        </button>
      </div>

      {filtersExpanded && (
        <div className="advanced-filters" id="projects-advanced-filters">
          <div className="advanced-filters-grid">
            <label className="filter-field">
              <span>Status</span>
              <select
                value={filterStatus}
                onChange={(e) => onFilterStatusChange?.(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Criado a partir de</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => onFilterStartDateChange?.(e.target.value)}
              />
            </label>
            <label className="filter-field">
              <span>Criado até</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => onFilterEndDateChange?.(e.target.value)}
              />
            </label>
            <label className="filter-field">
              <span>Membro participante</span>
              <select
                value={filterMemberId}
                onChange={(e) => onFilterMemberIdChange?.(e.target.value)}
              >
                <option value="">Todos os membros</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.nickname || m.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="filter-chips" role="region" aria-label="Filtros ativos">
          {chips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                type="button"
                className="filter-chip-clear"
                aria-label={`Remover filtro: ${chip.label}`}
                onClick={chip.onClear}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="ghost clear-filters-btn"
            onClick={onClearFilters}
          >
            Limpar todos ({activeFiltersCount})
          </button>
        </div>
      )}

      <div className="events-list">
        {loading && projects.length === 0 ? (
          <p className="projects-loading">Carregando projetos...</p>
        ) : projects.length === 0 ? (
          <p className="projects-empty">
            {activeFiltersCount > 0
              ? 'Nenhum projeto corresponde aos filtros aplicados.'
              : 'Nenhum projeto cadastrado.'}
          </p>
        ) : (
          projects.map((project) => (
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
                  <span style={{ color: 'var(--color-text-muted)' }}>nenhum</span>
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
                      <button type="button" onClick={() => onEdit(project)}>Editar</button>
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
          ))
        )}
      </div>
    </section>
  );
}
