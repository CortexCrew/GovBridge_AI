const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');
const {
	create_complaint,
	get_all_complaints,
	delete_complaint,
	get_complaint,
	get_complaint_history,
	get_complaint_assignment,
	assign_complaint,
	update_complaint_status,
} = require('./complaints_contoller');

router.post('/', auth, create_complaint);
router.get('/', auth, get_all_complaints);
router.get('/:complaintId/history', auth, get_complaint_history);
router.get('/:complaintId/assignment', auth, get_complaint_assignment);
router.post('/:complaintId/assign', auth, requireRole('OFFICER'), assign_complaint);
router.patch('/:complaintId/assignment', auth, requireRole('OFFICER'), assign_complaint);
router.patch('/:complaintId/status', auth, requireRole('OFFICER'), update_complaint_status);
router.get('/:complaintId', auth, get_complaint);
router.delete('/:complaintId', auth, delete_complaint);

module.exports = router;