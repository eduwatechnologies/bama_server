const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/installation.controller');
const {
  registerInstallationSchema,
  progressUpdateSchema,
  progressQuerySchema,
} = require('../validators/installation.validators');
const { standardLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/installations/register',
  strictLimiter,
  validate({ body: registerInstallationSchema }),
  controller.register
);

router.post(
  '/installations/progress',
  strictLimiter,
  validate({ body: progressUpdateSchema }),
  controller.updateProgress
);

router.get(
  '/installations/progress',
  standardLimiter,
  validate({ query: progressQuerySchema }),
  controller.getProgress
);

module.exports = router;
