const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const officerRoutes = require('../modules/officers/officer.routes');
const certificateRoutes = require('../modules/certificates/certificate.routes');
const complaintsRoutes = require('../modules/complaints/complaints_routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/officer', officerRoutes);
router.use('/certificates', certificateRoutes);
router.use('/complaints', complaintsRoutes);

module.exports = router;
