const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { requireRole } = require('../../middleware/role.middleware');

// @route   POST /api/auth/send-otp
// @desc    Initiate registration and send 6-digit OTP to Email or Phone
// @access  Public
router.post('/send-otp', (req, res, next) => authController.sendOtp(req, res, next));

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and complete citizen registration
// @access  Public
router.post('/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next));

// @route   POST /api/auth/register
// @desc    Register a new citizen account (initiates OTP flow or verifies if otpCode is present)
// @access  Public
router.post('/register', (req, res, next) => authController.register(req, res, next));

// @route   POST /api/auth/login
// @desc    Citizen login using Email OR Phone number (issues JWT token)
// @access  Public
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/password-reset/request', (req, res, next) => authController.requestPasswordReset(req, res, next));
router.post('/password-reset/confirm', (req, res, next) => authController.confirmPasswordReset(req, res, next));

router.post('/password-change/request', authMiddleware, (req, res, next) => authController.requestPasswordChange(req, res, next));
router.post('/password-change/confirm', authMiddleware, (req, res, next) => authController.confirmPasswordChange(req, res, next));

// @route   GET /api/auth/me
// @desc    Get current authenticated citizen profile identity
// @access  Protected (Requires valid JWT)
router.get('/me', authMiddleware, (req, res, next) => authController.getProfile(req, res, next));

// @route   GET /api/auth/profile
// @desc    Get current authenticated citizen profile
// @access  Protected (Requires valid JWT)
router.get('/profile', authMiddleware, (req, res, next) => authController.getProfile(req, res, next));

// @route   PATCH /api/auth/profile
// @desc    Update current authenticated citizen profile
// @access  Protected (Requires valid JWT)
router.patch('/profile', authMiddleware, (req, res, next) => authController.updateProfile(req, res, next));

// @route   DELETE /api/auth/profile
// @desc    Delete or deactivate current authenticated citizen account
// @access  Protected (Requires valid JWT)
router.delete('/profile', authMiddleware, (req, res, next) => authController.deleteAccount(req, res, next));

// Admin / user management routes
// @route   GET /api/auth/users
// @desc    List all users (admin only)
// @access  Protected (Requires ADMIN role)
router.get('/users', authMiddleware, requireRole('ADMIN'), (req, res, next) => authController.getAllUsers(req, res, next));

// @route   GET /api/auth/users/:id
// @desc    Get a user by ID
// @access  Protected (Self or ADMIN)
router.get('/users/:id', authMiddleware, (req, res, next) => authController.getUserById(req, res, next));

// @route   PATCH /api/auth/users/:id
// @desc    Update a user by ID
// @access  Protected (Self or ADMIN)
router.patch('/users/:id', authMiddleware, (req, res, next) => authController.updateUser(req, res, next));

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user by ID
// @access  Protected (Self or ADMIN)
router.delete('/users/:id', authMiddleware, (req, res, next) => authController.deleteUser(req, res, next));

module.exports = router;
