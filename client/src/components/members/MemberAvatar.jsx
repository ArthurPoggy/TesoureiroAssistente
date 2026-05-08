import { useRef } from 'react';

const PALETTE = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#be185d'];

function colorFromName(name) {
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function MemberAvatar({ member, size = 'md', editable = false, onUpload, uploading = false }) {
  const fileInputRef = useRef(null);
  const initial = (member?.name || '?')[0].toUpperCase();
  const color = colorFromName(member?.name);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = '';
  };

  return (
    <div
      className={`member-avatar member-avatar-${size}${editable ? ' member-avatar-editable' : ''}`}
      onClick={() => editable && !uploading && fileInputRef.current?.click()}
      title={editable ? 'Trocar foto de perfil' : undefined}
    >
      {member?.avatar_url ? (
        <img src={member.avatar_url} alt={member.name} />
      ) : (
        <span style={{ background: color }}>{initial}</span>
      )}
      {editable && (
        <>
          <div className="member-avatar-overlay">{uploading ? '…' : 'Trocar foto'}</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
