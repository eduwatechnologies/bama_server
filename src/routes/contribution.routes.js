const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/contribution.controller');
const { audioUpload } = require('../middleware/upload');
const { strictLimiter } = require('../middleware/rateLimiter');
const {
  createContributionSchema,
  idParamSchema,
  uploadAudioQuerySchema,
} = require('../validators/contribution.validators');

const router = express.Router();

// Mobile contribution endpoints get strong rate limits per spec section 17.
// The limiter is attached per route on purpose: router-level middleware would
// also count every unrelated request in the API against this budget.
router.post(
  '/contributions',
  strictLimiter,
  validate({ body: createContributionSchema }),
  controller.create
);

router.post(
  '/contributions/:id/audio',
  strictLimiter,
  validate({ params: idParamSchema, query: uploadAudioQuerySchema }),
  audioUpload,
  controller.uploadAudio
);

router.get('/contributions/:id', strictLimiter, validate({ params: idParamSchema }), controller.getById);

module.exports = router;
