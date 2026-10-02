const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/content.controller');
const { idParamSchema, listContentQuerySchema, searchQuerySchema } = require('../validators/content.validators');
const { standardLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Attached per route: router-level middleware would count every unrelated
// request in the API against the public read budget.
router.get(
  '/content',
  standardLimiter,
  validate({ query: listContentQuerySchema }),
  controller.listContent
);
router.get(
  '/content/search',
  standardLimiter,
  validate({ query: searchQuerySchema }),
  controller.searchContent
);
router.get(
  '/content/:id',
  standardLimiter,
  validate({ params: idParamSchema }),
  controller.getContentById
);

router.get('/categories', standardLimiter, controller.listCategories);
router.get(
  '/categories/:id/content',
  standardLimiter,
  validate({ params: idParamSchema, query: listContentQuerySchema }),
  controller.getCategoryContent
);

module.exports = router;
