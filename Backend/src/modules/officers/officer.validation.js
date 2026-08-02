const { body, validationResult } = require('express-validator');

class OfficerValidation {
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

  loginValidation = [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isString().withMessage('Password must be a string'),

    this.validate
  ];
}

module.exports = new OfficerValidation();
