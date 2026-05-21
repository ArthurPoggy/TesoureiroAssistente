// Avatares padrão (SVG inline) para quem não quiser fazer upload de foto.
// São gerados como data URL de SVG, o mesmo formato aceito pelo backend
// na rota PUT /api/members/:id/avatar.

const PRESETS = [
  { id: 'azul', bg: '#2563eb', glyph: '⚜' },
  { id: 'verde', bg: '#16a34a', glyph: '🌲' },
  { id: 'vermelho', bg: '#dc2626', glyph: '🔥' },
  { id: 'ambar', bg: '#d97706', glyph: '⭐' },
  { id: 'roxo', bg: '#7c3aed', glyph: '🦉' },
  { id: 'ciano', bg: '#0891b2', glyph: '⛺' }
];

function buildSvg(bg, glyph) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">` +
    `<rect width="128" height="128" rx="64" fill="${bg}"/>` +
    `<text x="50%" y="50%" dy="0.08em" font-size="64" text-anchor="middle" dominant-baseline="middle">${glyph}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_AVATARS = PRESETS.map((preset) => ({
  id: preset.id,
  url: buildSvg(preset.bg, preset.glyph)
}));
