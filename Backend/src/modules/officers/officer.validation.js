const { body, param, validationResult } = require('express-validator');

class OfficerValidation {
  /**
   * Middleware to check express-validator results
   */
  validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(err => ({
          field: err.path || err.param,
          message: err.msg
        }))
      });
    }
    next();
  };

  /**
   * Validate URL integer ID parameters (e.g. /complaints/:id)
   */
  validateIdParam = [
    param('id')
      .notEmpty().withMessage('ID parameter is required')
      .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    this.validate
  ];

  /**
   * Validate complaint status update payload
   */
  updateComplaintStatusValidation = [
    param('id')
      .notEmpty().withMessage('Complaint ID is required')
      .isInt({ min: 1 }).withMessage('Complaint ID must be a positive integer'),

    body('status')
      .trim()
      .notEmpty().withMessage('Status is required')
      .isIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
      .withMessage('Invalid status value. Must be PENDING, IN_PROGRESS, RESOLVED, or REJECTED'),

    this.validate
  ];

  /**
   * Validate complaint resolution payload
   */
  resolveComplaintValidation = [
    param('id')
      .notEmpty().withMessage('Complaint ID is required')
      .isInt({ min: 1 }).withMessage('Complaint ID must be a positive integer'),

    body('resolution_notes')
      .trim()
      .notEmpty().withMessage('Resolution notes are required')
      .isLength({ min: 5 }).withMessage('Resolution notes must be at least 5 characters long'),

    this.validate
  ];

  /**
   * Validate certificate rejection payload
   */
  rejectCertificateValidation = [
    param('id')
      .notEmpty().withMessage('Application ID is required')
      .isInt({ min: 1 }).withMessage('Application ID must be a positive integer'),

    body('rejection_reason')
      .trim()
      .notEmpty().withMessage('Rejection reason is required')
      .isLength({ min: 5 }).withMessage('Rejection reason must be at least 5 characters long'),

    this.validate
  ];
}

module.exports = new OfficerValidation();
