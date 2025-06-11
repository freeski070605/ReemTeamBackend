const  mongoose = require('mongoose');

// Card schema
const cardSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  suit: {
    type: String,
    required: true,
    enum: ['hearts', 'diamonds', 'clubs', 'spades', '?']
  },
  rank: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Player schema
const playerSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  isAI: {
    type: Boolean,
    default: false
  },
  hand: [cardSchema],
  isDropped: {
    type: Boolean,
    default: false
  },
  canDrop: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  penalties: {
    type: Number,
    default: 0
  },
  avatar: {
    type: String
  }
}, { _id: false });

// Game schema
const gameSchema = new mongoose.Schema({
  players: [playerSchema],
  currentPlayerIndex: {
    type: Number,
    default: 0
  },
  deck: [cardSchema],
  discardPile: [cardSchema],
  status: {
    type: String,
    enum: ['waiting', 'playing', 'ended'],
    default: 'waiting'
  },
  stake: {
    type: Number,
    required: true
  },
  pot: {
    type: Number,
    default: function() {
      return this.stake * 4; // 4 players each contribute the stake amount
    }
  },
  winner: {
    type: String,
    default: null
  },
  winningMultiplier: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActionAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Game', gameSchema);
 