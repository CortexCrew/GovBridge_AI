const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { create_complaint, get_all_complaints } = require('./complaints_contoller');

router.post('/', auth, create_complaint);
router.get('/', auth, get_all_complaints);

module.exports = router;