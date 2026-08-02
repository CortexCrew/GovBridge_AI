const express = require('express');
const router = express.Router();
const controller = require('./certificate.controller');
const validation = require('./certificate.validation');
const upload = require('../../middleware/upload.middleware');
const auth = require('../../middleware/auth.middleware');

// Citizen Routes
router.post('/apply', 
  auth, 
  upload.array('documents', 5), // Allow up to 5 documents
  validation.validateApplication, 
  controller.apply
);

router.get('/my-applications', 
  auth, 
  controller.getMyApplications
);

router.get('/my-applications/:id', 
  auth, 
  controller.getApplicationDetails
);

router.get('/digital-locker', 
  auth, 
  controller.getMyDigitalLocker
);

// Officer Routes
// (Ideally this would be under an officer module or restricted by an officer auth middleware)
router.patch('/:id/review', 
  auth, 
  upload.single('certificate'), // Optional final certificate document
  validation.validateReview,
  controller.reviewApplication
);

module.exports = router;
