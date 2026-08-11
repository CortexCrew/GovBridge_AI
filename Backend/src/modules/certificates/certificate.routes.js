const express = require('express');
const router = express.Router();
const controller = require('./certificate.controller');
const validation = require('./certificate.validation');
const upload = require('../../middleware/upload.middleware');
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

// ─── Citizen Routes ───────────────────────────────────────────────────────────

// POST /api/certificates/apply
router.post(
  '/apply',
  auth,
  upload.array('documents', 5),
  validation.validateApplication,
  controller.apply
);

// GET /api/certificates/my-applications
router.get(
  '/my-applications',
  auth,
  controller.getMyApplications
);

// GET /api/certificates/my-applications/:id
router.get(
  '/my-applications/:id',
  auth,
  controller.getApplicationDetails
);

// ─── Officer Routes ───────────────────────────────────────────────────────────

// PATCH /api/certificates/:id/review  (OFFICER only)
router.patch(
  '/:id/review',
  auth,
  requireRole('OFFICER'),
  validation.validateReview,
  controller.reviewApplication
);

module.exports = router;
