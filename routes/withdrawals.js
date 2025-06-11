const  express = require('express');
const router = express.Router();
const withdrawalController = require('../controllers/withdrawalController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/withdrawals
// @desc    Submit withdrawal request
// @access  Private
router.post('/', auth, withdrawalController.submitWithdrawal);

// @route   GET /api/withdrawals
// @desc    Get user's withdrawal history
// @access  Private
router.get('/', auth, withdrawalController.getWithdrawalHistory);

// @route   GET /api/withdrawals/pending
// @desc    Get all pending withdrawals (admin only)
// @access  Private/Admin
router.get('/pending', auth, admin, withdrawalController.getPendingWithdrawals);

// @route   PUT /api/withdrawals/:id
// @desc    Process a withdrawal (admin only)
// @access  Private/Admin
router.put('/:id', auth, admin, withdrawalController.processWithdrawal);

module.exports = router;
 