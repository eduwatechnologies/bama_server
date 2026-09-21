const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/ads.controller');
const { publicAdsQuerySchema } = require('../validators/ad.validators');
const { standardLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/ads', standardLimiter, validate({ query: publicAdsQuerySchema }), controller.list);

module.exports = router;
