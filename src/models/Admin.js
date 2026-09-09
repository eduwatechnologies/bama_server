const mongoose = require('mongoose');

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'EDITOR'];

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'EDITOR' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    // Hashed refresh tokens currently valid for this admin (supports multi-device).
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true }
);

adminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.refreshTokens;
    return ret;
  },
});

module.exports = mongoose.model('Admin', adminSchema);
module.exports.ADMIN_ROLES = ADMIN_ROLES;
