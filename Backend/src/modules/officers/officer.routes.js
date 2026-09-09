const express = require('express');
const router = express.Router();
const officerController = require('./officer.controller');
const officerValidation = require('./officer.validation');
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const { get_officer_complaints, get_complaint } = require('../complaints/complaints_contoller');

router.post('/login', (req, res, next) => officerController.login(req, res, next));
router.get('/dashboard', auth, requireRole('OFFICER'), (req, res, next) => officerController.getDashboard(req, res, next));
router.get('/department-officers', auth, requireRole('OFFICER'), (req, res, next) => officerController.getDepartmentOfficers(req, res, next));
router.get('/complaints', auth, requireRole('OFFICER'), get_officer_complaints);
router.get('/complaints/:complaintId', auth, requireRole('OFFICER'), get_complaint);

module.exports = router;
