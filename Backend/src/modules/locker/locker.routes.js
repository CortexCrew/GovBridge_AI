const express = require('express');
const router = express.Router();
const controller = require('./locker.controller');
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

// GET /api/locker/my-locker
router.get(
  '/my-locker',
  auth,
  requireRole('CITIZEN'),
  controller.getMyLocker
);

// GET /api/locker/download/:kind/:id  (kind: issued | document)
router.get(
  '/download/:kind/:id',
  auth,
  requireRole('CITIZEN'),
  controller.download
);

module.exports = router;
