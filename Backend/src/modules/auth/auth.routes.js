const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authMiddleware = require('../../middleware/auth.middleware');

// @route   POST /api/auth/register
// @desc    Register a new citizen account
// @access  Public
router.post('/register', (req, res, next) => authController.register(req, res, next));

// @route   POST /api/auth/login
// @desc    Citizen login (issues JWT token)
// @access  Public
router.post('/login', (req, res, next) => authController.login(req, res, next));

// @route   GET /api/auth/profile
// @desc    Get current authenticated citizen profile
// @access  Protected (Requires valid JWT)
router.get('/profile', authMiddleware, (req, res, next) => authController.getProfile(req, res, next));

module.exports = router;
