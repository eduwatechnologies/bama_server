const express = require('express');
const controller = require('../controllers/version.controller');
const { standardLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/app/version', standardLimiter, controller.getAppVersion);

module.exports = router;
