const  express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// @route   POST /api/games
// @desc    Create a new game
// @access  Private
router.post('/', auth, gameController.createGame);

// @route   GET /api/games/:id
// @desc    Get game by ID
// @access  Private
router.get('/:id', auth, gameController.getGameById);

// @route   POST /api/games/:id/join
// @desc    Join an existing game
// @access  Private
router.post('/:id/join', auth, gameController.joinGame);

// @route   POST /api/games/:id/action
// @desc    Perform a game action (draw, discard, drop)
// @access  Private
router.post('/:id/action', auth, gameController.performAction);

module.exports = router;
 