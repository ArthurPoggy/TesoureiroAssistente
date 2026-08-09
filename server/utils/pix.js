// Geração de PIX "Copia e Cola" (BR Code) no padrão EMVCo do Banco Central.
// Referência: Manual de Padrões para Iniciação do PIX (BCB).

const PIX_GUI = 'br.gov.bcb.pix';
const DIACRITICS = /[̀-ͯ]/g;

// CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF, sem reflexão).
// Valor de verificação canônico: crc16('123456789') === '29B1'.
function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Monta um campo TLV (id + tamanho em 2 dígitos + valor).
function field(id, value) {
  const text = String(value);
  return `${id}${String(text.length).padStart(2, '0')}${text}`;
}

// Remove acentos e caracteres não permitidos; trunca no limite do campo.
function sanitizeText(text, maxLength) {
  return String(text || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .slice(0, maxLength);
}

function sanitizeTxid(txid) {
  const cleaned = String(txid || '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25);
  return cleaned || '***';
}

// Constrói o payload completo do BR Code com valor pré-preenchido.
function buildPixPayload({ pixKey, merchantName, merchantCity, amount, txid } = {}) {
  if (!pixKey) {
    throw new Error('pixKey é obrigatório para gerar o BR Code');
  }

  const merchantAccount = field('26', field('00', PIX_GUI) + field('01', String(pixKey)));
  const name = sanitizeText(merchantName, 25) || 'RECEBEDOR';
  const city = sanitizeText(merchantCity, 15) || 'BRASIL';
  const additionalData = field('62', field('05', sanitizeTxid(txid)));

  const numericAmount = Number(amount);
  const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  let payload =
    field('00', '01') +
    merchantAccount +
    field('52', '0000') +
    field('53', '986') +
    (hasAmount ? field('54', numericAmount.toFixed(2)) : '') +
    field('58', 'BR') +
    field('59', name) +
    field('60', city) +
    additionalData;

  payload += '6304';
  return payload + crc16(payload);
}

module.exports = { crc16, buildPixPayload, PIX_GUI };
