const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = (fieldName = 'id') =>
  z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: `${fieldName} must be a valid identifier`,
  });

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminAudioUploadQuery = z.object({
  duration: z.coerce.number().nonnegative().optional(),
});

module.exports = { objectId, paginationQuery, adminAudioUploadQuery };
