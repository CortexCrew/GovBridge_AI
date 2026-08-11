const ALLOWED_CERTIFICATE_TYPES = [
  'Income Certificate',
  'Community Certificate',
  'Nativity Certificate',
  'Birth Certificate',
  'Residence Certificate'
];

const ALLOWED_REVIEW_STATUSES = ['Approved', 'Rejected'];

/**
 * Validates a new certificate application request body.
 * Requires: certificate_type (one of 5 allowed types).
 */
function validateApplication(req, res, next) {
  const { certificate_type } = req.body;

  if (!certificate_type || certificate_type.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'certificate_type is required'
    });
  }

  if (!ALLOWED_CERTIFICATE_TYPES.includes(certificate_type.trim())) {
    return res.status(400).json({
      success: false,
      message: `Invalid certificate_type. Must be one of: ${ALLOWED_CERTIFICATE_TYPES.join(', ')}`
    });
  }

  next();
}

/**
 * Validates an officer review request body.
 * Requires: status ('Approved' or 'Rejected').
 */
function validateReview(req, res, next) {
  const { status } = req.body;

  if (!status || !ALLOWED_REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Valid status is required. Must be one of: ${ALLOWED_REVIEW_STATUSES.join(', ')}`
    });
  }

  next();
}

module.exports = {
  validateApplication,
  validateReview,
  ALLOWED_CERTIFICATE_TYPES,
  ALLOWED_REVIEW_STATUSES
};
