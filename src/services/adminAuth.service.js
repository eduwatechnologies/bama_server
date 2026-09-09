const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');
const { AuthenticationError } = require('../utils/errors');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/jwt');

const SALT_ROUNDS = 12;
const MAX_REFRESH_TOKENS_PER_ADMIN = 5;

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function login(email, password) {
  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!admin || !admin.isActive) {
    throw new AuthenticationError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  const accessToken = signAccessToken(admin);
  const refreshToken = signRefreshToken(admin);

  admin.lastLoginAt = new Date();
  admin.refreshTokens.push({
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiryDate(),
  });
  // Keep only the most recent N refresh tokens to bound growth.
  if (admin.refreshTokens.length > MAX_REFRESH_TOKENS_PER_ADMIN) {
    admin.refreshTokens = admin.refreshTokens.slice(-MAX_REFRESH_TOKENS_PER_ADMIN);
  }
  await admin.save();

  return { admin, accessToken, refreshToken };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError('Invalid or expired refresh token');
  }
  if (payload.type !== 'refresh') {
    throw new AuthenticationError('Invalid token type');
  }

  const admin = await Admin.findById(payload.sub);
  if (!admin || !admin.isActive) {
    throw new AuthenticationError('Account is no longer active');
  }

  const tokenHash = hashToken(refreshToken);
  const stored = admin.refreshTokens.find((t) => t.tokenHash === tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AuthenticationError('Refresh token is no longer valid');
  }

  // Rotate: remove the used token, issue a new pair.
  admin.refreshTokens = admin.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  const newAccessToken = signAccessToken(admin);
  const newRefreshToken = signRefreshToken(admin);
  admin.refreshTokens.push({
    tokenHash: hashToken(newRefreshToken),
    expiresAt: refreshTokenExpiryDate(),
  });
  await admin.save();

  return { admin, accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(adminId, refreshToken) {
  const admin = await Admin.findById(adminId);
  if (!admin) return;
  const tokenHash = hashToken(refreshToken);
  admin.refreshTokens = admin.refreshTokens.filter((t) => t.tokenHash !== tokenHash);
  await admin.save();
}

function refreshTokenExpiryDate() {
  // Mirrors JWT_REFRESH_EXPIRES_IN default of 30 days; used only to prune
  // stale entries from the stored list.
  const days = 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = { hashPassword, login, refresh, logout };
