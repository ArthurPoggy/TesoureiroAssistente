const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const { query } = require('../db/query');

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
};

const verifyToken = (token) => {
  if (!config.jwtConfigured) {
    throw new Error('Autenticação não configurada');
  }
  return jwt.verify(token, config.JWT_SECRET);
};

const signToken = (payload, expiresIn = '12h') => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
};

const hashSetupToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeCpf = (cpf) => String(cpf || '').replace(/\D/g, '');
const isValidCpf = (cpf) => {
  const digits = normalizeCpf(cpf);
  if (digits.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return false;
  }
  return true;
};

const hashPassword = async (password) => bcrypt.hash(password, 10);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const generateToken = (length = 24) => crypto.randomBytes(length).toString('hex');

const generatePassword = () => crypto.randomBytes(18).toString('base64url');

const createMemberUser = async ({
  name,
  email,
  nickname,
  password,
  mustResetPassword = false,
  setupTokenHash = null,
  cpf,
  role = 'viewer'
}) => {
  const passwordHash = await hashPassword(password);
  const [member] = await query(
    `INSERT INTO members (name, email, nickname, cpf, password_hash, role, active, must_reset_password, setup_token_hash, setup_token_created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id, name, email, nickname, cpf, role, active, must_reset_password, joined_at`,
    [
      name || '',
      email,
      nickname || null,
      cpf || null,
      passwordHash,
      role,
      1,
      mustResetPassword ? 1 : 0,
      setupTokenHash,
      setupTokenHash ? new Date().toISOString() : null
    ]
  );
  return member;
};

module.exports = {
  getTokenFromRequest,
  verifyToken,
  signToken,
  hashSetupToken,
  normalizeEmail,
  normalizeCpf,
  isValidCpf,
  hashPassword,
  comparePassword,
  generateToken,
  generatePassword,
  createMemberUser
};
