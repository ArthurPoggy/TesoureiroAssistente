// Constantes de meses
export const months = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fev' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Abr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Ago' },
  { value: 9, label: 'Set' },
  { value: 10, label: 'Out' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dez' }
];

export const currentMonth = new Date().getMonth() + 1;
export const currentYear = new Date().getFullYear();

// Formatadores
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatCurrency = (value = 0) => BRL.format(value || 0);

export const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  const size = Number(bytes);
  if (Number.isNaN(size)) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

// Parsers de filtro
export const parseMonthFilter = (value) => {
  if (value === 'all' || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

export const parseYearFilter = (value) => {
  if (value === 'all' || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
