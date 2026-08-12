const express = require('express');
const router = express.Router();
const officerController = require('./officer.controller');
const officerValidation = require('./officer.validation');
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

router.post('/login', (req, res, next) => officerController.login(req, res, next));
router.get('/dashboard', auth, requireRole('OFFICER'), (req, res, next) => officerController.getDashboard(req, res, next));

module.exports = router;
