const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { create_complaint, get_all_complaints, delete_complaint } = require('./complaints_contoller');

router.post('/', auth, create_complaint);
router.get('/', auth, get_all_complaints);
router.delete('/:complaintId', auth, delete_complaint);

module.exports = router;