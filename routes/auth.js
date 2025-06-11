const  express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', [
  check('username', 'Username is required').not().isEmpty(),
  check('username', 'Username must be between 3 and 20 characters').isLength({ min: 3, max: 20 }),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
], authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  check('username', 'Username is required').not().isEmpty(),
  check('password', 'Password is required').exists()
], authController.login);

// @route   GET /api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, authController.getUser);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, authController.updateProfile);

// @route   PUT /api/auth/balance
// @desc    Update user balance (for testing only)
// @access  Private
router.put('/balance', auth, authController.updateBalance);

module.exports = router;
 