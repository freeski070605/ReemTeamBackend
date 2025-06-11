const  mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  tableId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  maxPlayers: {
    type: Number,
    default: 4
  },
  currentPlayers: {
    type: Number,
    default: 0
  },
  activeGames: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Table', tableSchema);
 