const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/installation.controller');
const { registerInstallationSchema } = require('../validators/installation.validators');
const { strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/installations/register',
  strictLimiter,
  validate({ body: registerInstallationSchema }),
  controller.register
);

module.exports = router;
