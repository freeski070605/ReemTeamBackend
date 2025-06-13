const  Game = require('../models/Game');
const User = require('../models/User');
const Table = require('../models/Table');
const { createDeck, dealCards, calculateHandScore } = require('../utils/cards');
const { canPlayerDrop, calculateWinningMultiplier, wouldHitSpread } = require('../utils/gameRules');
const { decideDrawSource, decideCardToDiscard, shouldDrop } = require('../utils/ai');

// @route   POST /api/games
// @desc    Create a new game
// @access  Private
exports.createGame = async (req, res) => {
  try {
    const { stake } = req.body;
    
    // Validate stake
    if (!stake || typeof stake !== 'number' || stake <= 0) {
      return res.status(400).json({ error: 'Valid stake amount required' });
    }
    
    // Check if user has sufficient balance
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.balance < stake) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Deduct stake from user's balance
    user.balance -= stake;
    await user.save();
    
    // Create a new deck
    const deck = createDeck();
    
    // Set up players (1 human + 3 AI)
    const players = [
      {
        id: user._id.toString(),
        username: user.username,
        isAI: false,
        hand: [],
        isDropped: false,
        canDrop: false,
        score: 0,
        penalties: 0,
        avatar: user.avatar
      }
    ];
    
    // Add AI players
    for (let i = 0; i < 3; i++) {
      players.push({
        id: `ai-${i + 1}`,
        username: `AI Player ${i + 1}`,
        isAI: true,
        hand: [],
        isDropped: false,
        canDrop: false,
        score: 0,
        penalties: 0,
        avatar: `https://ui-avatars.com/api/?name=AI&background=777777&color=fff`
      });
    }
    
    // Deal cards to players
    const { hands, deck: remainingDeck } = dealCards(deck, 4);
    
    // Assign hands to players
    for (let i = 0; i < players.length; i++) {
      players[i].hand = hands[i];
    }
    
    // Create discard pile with top card from deck
    const discardPile = [remainingDeck.pop()];
    
    // Create new game
    const game = new Game({
      players,
      currentPlayerIndex: 0, // Human player goes first
      deck: remainingDeck,
      discardPile,
      status: 'playing',
      stake,
      pot: stake * 4 // 4 players
    });
    
    // Check if players can drop on first turn
    for (let i = 0; i < players.length; i++) {
      players[i].canDrop = canPlayerDrop(players[i], true);
    }
    
    await game.save();
    
    // Find and update the table with appropriate stake
    const table = await Table.findOne({ amount: stake });
    if (table) {
      table.currentPlayers += 1;
      table.activeGames.push(game._id);
      await table.save();
    }
    
    res.json(game);
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Server error creating game' });
  }
};

// @route   GET /api/games/:id
// @desc    Get game by ID
// @access  Private
exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Hide other players' cards for security
    const userId = req.user.id;
    const gameData = game.toObject();
    
    gameData.players.forEach(player => {
      if (player.id !== userId && !player.isDropped) {
        player.hand = player.hand.map(card => ({
          ...card,
          suit: '?',
          rank: '?',
          value: 0,
          isHidden: true
        }));
      }
    });
    
    res.json(gameData);
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Server error getting game' });
  }
};

// @route   POST /api/games/:id/join
// @desc    Join an existing game
// @access  Private
exports.joinGame = async (req, res) => {
  try {
    const gameId = req.params.id;
    if (!gameId || gameId === 'undefined') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (game.players.some(p => p.id === userId)) {
      // Already joined — just return the game
      return res.json(game);
    }

    if (game.status !== 'waiting') {
      return res.status(400).json({ error: 'Game has already started' });
    }

    if (user.balance < game.stake) {
      return res.status(400).json({ error: 'Insufficient balance to join' });
    }

    const aiIndex = game.players.findIndex(p => p.isAI);
    if (aiIndex === -1) {
      return res.status(400).json({ error: 'No slot available to join' });
    }

    // Deduct stake
    user.balance -= game.stake;
    await user.save();

    // Replace AI with user
    game.players[aiIndex] = {
      id: user._id.toString(),
      username: user.username,
      isAI: false,
      hand: game.players[aiIndex].hand,
      isDropped: false,
      canDrop: canPlayerDrop(game.players[aiIndex], false),
      score: 0,
      penalties: 0,
      avatar: user.avatar
    };

    await game.save();

    // Hide cards of other players for security
    const gameData = game.toObject();
    gameData.players.forEach(p => {
      if (p.id !== userId && !p.isDropped) {
        p.hand = p.hand.map(card => ({
          ...card,
          rank: '?',
          suit: '?',
          value: 0,
          isHidden: true
        }));
      }
    });

    res.json(gameData);
  } catch (err) {
    console.error('Join game error:', err);
    res.status(500).json({ error: 'Server error joining game' });
  }
};


// @route   POST /api/games/:id/action
// @desc    Perform a game action (draw, discard, drop)
// @access  Private
exports.performAction = async (req, res) => {
  try {
    const { action, cardId } = req.body;
    const userId = req.user.id;
    
    const game = await Game.findById(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.status !== 'playing') {
      return res.status(400).json({ error: 'Game is not in progress' });
    }
    
    // Find player index
    const playerIndex = game.players.findIndex(p => p.id === userId);
    
    if (playerIndex === -1) {
      return res.status(400).json({ error: 'Not a player in this game' });
    }
    
    // Check if it's the player's turn
    if (game.currentPlayerIndex !== playerIndex) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    // Get current player
    const currentPlayer = game.players[playerIndex];
    
    // Check if player is already dropped
    if (currentPlayer.isDropped) {
      return res.status(400).json({ error: 'You have already dropped' });
    }
    
    let nextPlayerIndex;
    let updatedGame;
    
    // Process action
    switch (action) {
      case 'draw':
        updatedGame = await handleDraw(game, playerIndex, cardId === 'discard');
        break;
      
      case 'discard':
        if (!cardId) {
          return res.status(400).json({ error: 'Card ID required for discard' });
        }
        updatedGame = await handleDiscard(game, playerIndex, cardId);
        break;
      
      case 'drop':
        updatedGame = await handleDrop(game, playerIndex);
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
    
    // Process AI turns if game is still in progress
    if (updatedGame.status === 'playing') {
      updatedGame = await processAITurns(updatedGame);
    }
    
    // Save the updated game
    await updatedGame.save();
    
    // Hide other players' cards for security
    const gameData = updatedGame.toObject();
    
    gameData.players.forEach(player => {
      if (player.id !== userId && !player.isDropped) {
        player.hand = player.hand.map(card => ({
          ...card,
          suit: '?',
          rank: '?',
          value: 0,
          isHidden: true
        }));
      }
    });
    
    res.json(gameData);
  } catch (error) {
    console.error('Perform action error:', error);
    res.status(500).json({ error: 'Server error performing action' });
  }
};

// Helper function to handle draw action
async function handleDraw(game, playerIndex, fromDiscard) {
  const player = game.players[playerIndex];
  
  // Check draw source
  if (fromDiscard) {
    // Drawing from discard pile
    if (game.discardPile.length === 0) {
      throw new Error('Discard pile is empty');
    }
    
    const card = game.discardPile.shift();
    player.hand.push(card);
  } else {
    // Drawing from deck
    if (game.deck.length === 0) {
      // If deck is empty, shuffle discard pile to create new deck
      if (game.discardPile.length === 0) {
        throw new Error('No cards available to draw');
      }
      
      // Keep the top discard card separate
      const topDiscard = game.discardPile.shift();
      game.deck = [...game.discardPile];
      game.discardPile = [topDiscard];
      
      // Shuffle the deck
      for (let i = game.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [game.deck[i], game.deck[j]] = [game.deck[j], game.deck[i]];
      }
    }
    
    const card = game.deck.pop();
    player.hand.push(card);
    
    // Check if drawing would hit a spread (penalty)
    for (let i = 0; i < game.players.length; i++) {
      if (i !== playerIndex && wouldHitSpread(card, game.players[i])) {
        game.players[i].penalties += 1;
      }
    }
    
    // Self-hit penalty (if applicable)
    if (wouldHitSpread(card, player)) {
      player.penalties += 1;
    }
  }
  
  // Update canDrop status
  player.canDrop = canPlayerDrop(player, false);
  
  // After drawing, the player must discard (don't advance turn yet)
  return game;
}

// Helper function to handle discard action
async function handleDiscard(game, playerIndex, cardId) {
  const player = game.players[playerIndex];
  
  // Find the card in player's hand
  const cardIndex = player.hand.findIndex(card => card.id === cardId);
  
  if (cardIndex === -1) {
    throw new Error('Card not found in hand');
  }
  
  // Remove card from hand and add to discard pile
  const card = player.hand.splice(cardIndex, 1)[0];
  game.discardPile.unshift(card);
  
  // Move to next player
  game.currentPlayerIndex = (playerIndex + 1) % game.players.length;
  
  // Skip players who have already dropped
  while (game.players[game.currentPlayerIndex].isDropped) {
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  }
  
  // Check if any players have penalties and decrement them
  game.players.forEach(p => {
    if (p.penalties > 0) {
      p.penalties -= 1;
    }
    // Update canDrop status
    p.canDrop = canPlayerDrop(p, false);
  });
  
  return game;
}

// Helper function to handle drop action
async function handleDrop(game, playerIndex) {
  const player = game.players[playerIndex];
  
  // Check if player can drop
  if (!player.canDrop) {
    throw new Error('Cannot drop at this time');
  }
  
  // Calculate score
  const score = calculateHandScore(player.hand);
  player.score = score;
  player.isDropped = true;
  
  // Calculate multiplier
  const isFirstTurn = game.players.every(p => !p.isDropped || p.id === player.id);
  const multiplier = calculateWinningMultiplier(score, isFirstTurn);
  
  // Check if game is over (only one player left or all dropped)
  const activePlayers = game.players.filter(p => !p.isDropped);
  
  if (activePlayers.length <= 1) {
    // Game over - determine winner
    await endGame(game, player.id, multiplier);
  } else {
    // Game continues
    // Move to next player
    game.currentPlayerIndex = (playerIndex + 1) % game.players.length;
    
    // Skip players who have already dropped
    while (game.players[game.currentPlayerIndex].isDropped) {
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    }
  }
  
  return game;
}

// Helper function to end the game
async function endGame(game, winnerId, multiplier = 1) {
  game.status = 'ended';
  game.winner = winnerId;
  game.winningMultiplier = multiplier;
  
  // Calculate winnings
  const winnings = game.pot * multiplier;
  
  // If winner is a human player, update their balance
  if (!winnerId.startsWith('ai-')) {
    const user = await User.findById(winnerId);
    
    if (user) {
      user.balance += winnings;
      user.gamesWon += 1;
      await user.save();
    }
  }
  
  // Update stats for human players
  for (const player of game.players) {
    if (!player.id.startsWith('ai-')) {
      const user = await User.findById(player.id);
      
      if (user) {
        user.gamesPlayed += 1;
        await user.save();
      }
    }
  }
  
  // Update table
  const table = await Table.findOne({ amount: game.stake });
  if (table) {
    table.currentPlayers = Math.max(0, table.currentPlayers - 1);
    table.activeGames = table.activeGames.filter(gameId => gameId.toString() !== game._id.toString());
    await table.save();
  }
  
  return game;
}

// Process AI turns
async function processAITurns(game) {
  let currentPlayerIndex = game.currentPlayerIndex;
  
  // Process AI turns until it's a human player's turn or game ends
  while (game.status === 'playing' && game.players[currentPlayerIndex].isAI) {
    // Get AI player
    const aiPlayer = game.players[currentPlayerIndex];
    
    // Skip if AI player is dropped
    if (aiPlayer.isDropped) {
      currentPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
      continue;
    }
    
    // First: AI decides whether to draw from deck or discard
    const drawSource = decideDrawSource(game, aiPlayer);
    
    // Draw card
    if (drawSource === 'discard') {
      await handleDraw(game, currentPlayerIndex, true);
    } else {
      await handleDraw(game, currentPlayerIndex, false);
    }
    
    // After drawing, AI must discard
    const cardToDiscard = decideCardToDiscard(aiPlayer.hand);
    await handleDiscard(game, currentPlayerIndex, cardToDiscard);
    
    // After discard, check if AI should drop
    if (aiPlayer.canDrop && shouldDrop(aiPlayer, game)) {
      await handleDrop(game, currentPlayerIndex);
    }
    
    // Move to next player (handleDiscard already did this)
    currentPlayerIndex = game.currentPlayerIndex;
    
    // Add a small delay to avoid infinite loops in case of bugs
    if (game.players.every(p => p.isAI)) {
      // If all players are AI, make sure we don't get stuck
      let activeAICount = game.players.filter(p => p.isAI && !p.isDropped).length;
      if (activeAICount <= 1) {
        // End game if only one AI left
        const lastAI = game.players.find(p => p.isAI && !p.isDropped);
        if (lastAI) {
          await handleDrop(game, game.players.indexOf(lastAI));
        }
      }
    }
  }
  
  return game;
}
 
