const express = require('express');
const router = express.Router();
const controller = require('./locker.controller');
const auth = require('../../middleware/auth.middleware');

// GET /api/locker/my-locker
router.get(
  '/my-locker',
  auth,
  controller.getMyLocker
);

module.exports = router;
