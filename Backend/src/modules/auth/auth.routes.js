const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// @route   POST /api/auth/send-otp
// @desc    Generate and send OTP to Email or Mobile Phone Number
// @access  Public
router.post('/send-otp', (req, res, next) => authController.sendOtp(req, res, next));

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and log in (issues JWT token)
// @access  Public
router.post('/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next));

module.exports = router;
