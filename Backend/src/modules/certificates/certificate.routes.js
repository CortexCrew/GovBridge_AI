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

router.get('/documents/:documentId/access', auth, controller.getSupportingDocumentAccess);
router.get('/documents/:documentId/file', auth, controller.getSupportingDocumentFile);
router.get('/applications/:applicationId/issued-file', auth, controller.getIssuedCertificateFile);

// ─── Officer Routes ───────────────────────────────────────────────────────────

// GET /api/certificates/officer/applications
router.get(
  '/officer/applications',
  auth,
  requireRole('OFFICER'),
  controller.getOfficerApplications
);

// PATCH /api/certificates/:id/review  (OFFICER only)
// Approving requires the certificate file, sent as multipart field "certificate".
router.patch(
  '/:id/review',
  auth,
  requireRole('OFFICER'),
  upload.single('certificate'),
  validation.validateReview,
  controller.reviewApplication
);

module.exports = router;
