const  express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET /api/tables
// @desc    Get all tables
// @access  Public
router.get('/', tableController.getTables);

// @route   POST /api/tables/initialize
// @desc    Initialize default tables (admin only)
// @access  Private/Admin
router.post('/initialize', auth, admin, tableController.initializeTables);

// @route   GET /api/tables/:tableId
// @desc    Get table by ID
// @access  Public
router.get('/:tableId', tableController.getTableById);

// @route   GET /api/tables/:tableId/games
// @desc    Get active games for a table
// @access  Public
router.get('/:tableId/games', tableController.getTableGames);

// @route   GET /api/tables/player-count
// @desc    Get current total player count
// @access  Public
router.get('/player-count', tableController.getPlayerCount);

// @route   PUT /api/tables/:tableId
// @desc    Update table (admin only)
// @access  Private/Admin
router.put('/:tableId', auth, admin, tableController.updateTable);

module.exports = router;
 