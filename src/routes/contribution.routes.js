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
router.use(strictLimiter);

router.post('/contributions', validate({ body: createContributionSchema }), controller.create);

router.post(
  '/contributions/:id/audio',
  validate({ params: idParamSchema, query: uploadAudioQuerySchema }),
  audioUpload,
  controller.uploadAudio
);

router.get('/contributions/:id', validate({ params: idParamSchema }), controller.getById);

module.exports = router;
