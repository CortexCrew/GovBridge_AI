const express = require('express');
const router = express.Router();

// We will mount certificate routes here soon
const certificateRoutes = require('../modules/certificates/certificate.routes');
router.use('/certificates', certificateRoutes);

module.exports = router;
