const express = require('express');
const validate = require('../middleware/validate');
const { requireAdminAuth, requireRole } = require('../middleware/adminAuth');
const { adminLimiter, loginLimiter } = require('../middleware/rateLimiter');

const authController = require('../controllers/admin/auth.controller');
const wordsController = require('../controllers/admin/words.controller');
const phrasesController = require('../controllers/admin/phrases.controller');
const categoriesController = require('../controllers/admin/categories.controller');
const dashboardController = require('../controllers/admin/dashboard.controller');
const contributionsController = require('../controllers/admin/contributions.controller');
const audioController = require('../controllers/admin/audio.controller');

const { loginSchema, refreshSchema } = require('../validators/admin.validators');
const {
  createWordSchema,
  updateWordSchema,
  createPhraseSchema,
  updatePhraseSchema,
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
  listContentQuerySchema,
} = require('../validators/content.validators');
const { paginationQuery } = require('../validators/common');
const {
  idParamSchema: contributionIdParamSchema,
  listContributionsQuerySchema,
  rejectContributionSchema,
  approveContributionSchema,
} = require('../validators/contribution.validators');
const { adminAudioUploadQuery } = require('../validators/common');
const { audioUpload } = require('../middleware/upload');

const router = express.Router();

// ---- Auth (unauthenticated) ----
router.post('/auth/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.post('/auth/refresh', loginLimiter, validate({ body: refreshSchema }), authController.refresh);

// Everything below requires a valid admin access token.
router.use(adminLimiter, requireAdminAuth);

router.post('/auth/logout', validate({ body: refreshSchema }), authController.logout);

// ---- Dashboard ----
router.get('/dashboard', dashboardController.getDashboard);
router.get('/installations', validate({ query: paginationQuery }), dashboardController.listInstallations);

// ---- Words (ADMIN, SUPER_ADMIN, EDITOR can write; MODERATOR read-only here) ----
router.get('/words', validate({ query: listContentQuerySchema }), wordsController.listWords);
router.get('/words/:id', validate({ params: idParamSchema }), wordsController.getWord);
router.post(
  '/words',
  requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'),
  validate({ body: createWordSchema }),
  wordsController.createWord
);
router.patch(
  '/words/:id',
  requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'),
  validate({ params: idParamSchema, body: updateWordSchema }),
  wordsController.updateWord
);
router.delete(
  '/words/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate({ params: idParamSchema }),
  wordsController.deleteWord
);

// ---- Phrases ----
router.get('/phrases', validate({ query: listContentQuerySchema }), phrasesController.listPhrases);
router.get('/phrases/:id', validate({ params: idParamSchema }), phrasesController.getPhrase);
router.post(
  '/phrases',
  requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'),
  validate({ body: createPhraseSchema }),
  phrasesController.createPhrase
);
router.patch(
  '/phrases/:id',
  requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR'),
  validate({ params: idParamSchema, body: updatePhraseSchema }),
  phrasesController.updatePhrase
);
router.delete(
  '/phrases/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate({ params: idParamSchema }),
  phrasesController.deletePhrase
);

// ---- Categories ----
router.get('/categories', categoriesController.listCategories);
router.post(
  '/categories',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate({ body: createCategorySchema }),
  categoriesController.createCategory
);
router.patch(
  '/categories/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoriesController.updateCategory
);

// ---- Audio (admin uploads) ----
router.post(
  '/audio/upload',
  requireRole('SUPER_ADMIN', 'ADMIN', 'EDITOR', 'MODERATOR'),
  validate({ query: adminAudioUploadQuery }),
  audioUpload,
  audioController.uploadAudio
);

// ---- Contributions (moderation) ----
// MODERATOR is the primary role for this queue; ADMIN/SUPER_ADMIN can also review.
router.get(
  '/contributions',
  validate({ query: listContributionsQuerySchema }),
  contributionsController.list
);
router.get(
  '/contributions/:id',
  validate({ params: contributionIdParamSchema }),
  contributionsController.getById
);
router.patch(
  '/contributions/:id/review',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR'),
  validate({ params: contributionIdParamSchema }),
  contributionsController.markUnderReview
);
router.patch(
  '/contributions/:id/approve',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR'),
  validate({ params: contributionIdParamSchema, body: approveContributionSchema }),
  contributionsController.approve
);
router.patch(
  '/contributions/:id/reject',
  requireRole('SUPER_ADMIN', 'ADMIN', 'MODERATOR'),
  validate({ params: contributionIdParamSchema, body: rejectContributionSchema }),
  contributionsController.reject
);

module.exports = router;
