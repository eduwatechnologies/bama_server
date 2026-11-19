const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/ads.controller');
const { publicAdsQuerySchema, adEventBatchSchema } = require('../validators/ad.validators');
const { standardLimiter, strictLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/ads', standardLimiter, validate({ query: publicAdsQuerySchema }), controller.list);
router.post(
  '/ads/events',
  strictLimiter,
  validate({ body: adEventBatchSchema }),
  controller.trackEvents
);

module.exports = router;
