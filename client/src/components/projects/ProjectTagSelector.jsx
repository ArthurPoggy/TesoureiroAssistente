export function ProjectTagSelector({ tags = [], selectedIds = [], onChange }) {
  if (!tags.length) return null;

  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  return (
    <div className="tag-selector">
      <span className="tag-selector-label">Tags</span>
      <div className="tag-selector-list">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`tag-chip${selectedIds.includes(tag.id) ? ' tag-chip--selected' : ''}`}
            onClick={() => toggle(tag.id)}
            aria-pressed={selectedIds.includes(tag.id)}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}
