const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/sync.controller');
const { syncQuerySchema } = require('../validators/installation.validators');
const { standardLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/sync', standardLimiter, validate({ query: syncQuerySchema }), controller.sync);

module.exports = router;
