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

export const maskCpf = (cpf) => {
  if (!cpf) return '-';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
};

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Datas "somente dia" (ex.: expense_date no formato ISO "aaaa-mm-dd") são
// interpretadas como horário local, e não UTC, para evitar que o fuso
// horário desloque o dia exibido (ex.: "2026-08-09" virando 08/08 em
// fusos negativos como America/Sao_Paulo).
export const formatDate = (value) => {
  if (!value) return '-';
  const match = typeof value === 'string' ? value.match(ISO_DATE_ONLY) : null;
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
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
