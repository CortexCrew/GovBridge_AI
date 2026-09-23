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
  const { certificate_type, officer_id } = req.body;

  if (Object.prototype.hasOwnProperty.call(req.body, 'officer_id')) {
    return res.status(400).json({
      success: false,
      message: 'officer_id is not allowed in citizen application requests. The backend determines eligible officers automatically.'
    });
  }

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

  if (req.body.application_data !== undefined && req.body.application_data !== '') {
    let parsed = req.body.application_data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'application_data must be valid JSON'
        });
      }
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return res.status(400).json({
        success: false,
        message: 'application_data must be a JSON object'
      });
    }

    req.body.application_data = parsed;
  } else {
    req.body.application_data = null;
  }

  next();
}

/**
 * Validates an officer review request body.
 * Requires: status ('Approved' or 'Rejected').
 */
function validateReview(req, res, next) {
  const { status, officer_id } = req.body;

  if (Object.prototype.hasOwnProperty.call(req.body, 'officer_id')) {
    return res.status(400).json({
      success: false,
      message: 'officer_id is not allowed in review requests. Use the authenticated officer JWT.'
    });
  }

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
