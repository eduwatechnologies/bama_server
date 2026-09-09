const express = require('express');
const validate = require('../middleware/validate');
const controller = require('../controllers/content.controller');
const { idParamSchema, listContentQuerySchema, searchQuerySchema } = require('../validators/content.validators');
const { standardLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.use(standardLimiter);

router.get('/content', validate({ query: listContentQuerySchema }), controller.listContent);
router.get('/content/search', validate({ query: searchQuerySchema }), controller.searchContent);
router.get('/content/:id', validate({ params: idParamSchema }), controller.getContentById);

router.get('/categories', controller.listCategories);
router.get(
  '/categories/:id/content',
  validate({ params: idParamSchema, query: listContentQuerySchema }),
  controller.getCategoryContent
);

module.exports = router;
