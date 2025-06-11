const  Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');

// @route   POST /api/withdrawals
// @desc    Submit withdrawal request
// @access  Private
exports.submitWithdrawal = async (req, res) => {
  try {
    const { amount, cashAppTag } = req.body;
    
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    if (!cashAppTag || typeof cashAppTag !== 'string' || !cashAppTag.startsWith('$')) {
      return res.status(400).json({ error: 'Valid CashApp tag required' });
    }
    
    // Check if user has sufficient balance
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Deduct amount from user's balance
    user.balance -= amount;
    await user.save();
    
    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId: user._id,
      amount,
      cashAppTag,
      status: 'pending'
    });
    
    await withdrawal.save();
    
    res.json(withdrawal);
  } catch (error) {
    console.error('Submit withdrawal error:', error);
    res.status(500).json({ error: 'Server error submitting withdrawal' });
  }
};

// @route   GET /api/withdrawals
// @desc    Get user's withdrawal history
// @access  Private
exports.getWithdrawalHistory = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user.id })
      .sort({ timestamp: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get withdrawal history error:', error);
    res.status(500).json({ error: 'Server error getting withdrawal history' });
  }
};

// @route   GET /api/withdrawals/pending
// @desc    Get all pending withdrawals (admin only)
// @access  Private/Admin
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .sort({ createdAt: 1 })
      .populate('userId', 'username email');
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({ error: 'Server error getting pending withdrawals' });
  }
};

// @route   PUT /api/withdrawals/:id
// @desc    Process a withdrawal (admin only)
// @access  Private/Admin
exports.processWithdrawal = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required' });
    }
    
    const withdrawal = await Withdrawal.findById(req.params.id);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ error: 'Withdrawal has already been processed' });
    }
    
    // Update withdrawal
    withdrawal.status = status;
    withdrawal.adminNotes = adminNotes || '';
    withdrawal.processedAt = Date.now();
    withdrawal.processedBy = req.user.id;
    
    // If rejected, refund the user
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.userId);
      
      if (user) {
        user.balance += withdrawal.amount;
        await user.save();
      }
    }
    
    await withdrawal.save();
    
    res.json(withdrawal);
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({ error: 'Server error processing withdrawal' });
  }
};
 