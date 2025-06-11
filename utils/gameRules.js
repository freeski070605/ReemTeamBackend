const  { isValidSpread } = require('./cards');

// Check if a player can drop
function canPlayerDrop(player, isFirstTurn) {
  // Player with penalties cannot drop
  if (player.penalties > 0) {
    return false;
  }
  
  // Calculate hand score
  const score = player.hand.reduce((sum, card) => sum + card.value, 0);
  
  // Special case: 11 or under is always droppable
  if (score <= 11) {
    return true;
  }
  
  // First turn rule: 41 or less is droppable
  if (isFirstTurn && score <= 41) {
    return true;
  }
  
  // Regular case: 50 or less is droppable
  return score <= 50;
}

// Calculate winning multiplier based on score
function calculateWinningMultiplier(score, isFirstTurn) {
  // Triple payout: 11 and under
  if (score <= 11) {
    return 3;
  }
  
  // Triple payout: 41 on first turn
  if (isFirstTurn && score === 41) {
    return 3;
  }
  
  // Double payout: exactly 50
  if (score === 50) {
    return 2;
  }
  
  return 1;
}

// Check if adding a card would hit a spread
function wouldHitSpread(card, player) {
  // Check if player has more than 2 cards of same rank
  const sameRankCount = player.hand.filter(c => c.rank === card.rank).length;
  if (sameRankCount >= 2) return true;
  
  // Check for sequential cards of same suit
  const sameSuitCards = player.hand.filter(c => c.suit === card.suit);
  if (sameSuitCards.length >= 2) {
    // Sort by value
    const values = sameSuitCards.map(c => c.value).sort((a, b) => a - b);
    
    // Check for sequential cards
    for (let i = 0; i < values.length - 1; i++) {
      // Card could complete a sequence
      if (
        card.value === values[i] - 1 && values[i] === values[i+1] - 1 ||
        card.value === values[i] + 1 && values[i+1] === values[i] + 1 ||
        card.value === values[i+1] + 1 && values[i] === values[i+1] - 1
      ) {
        return true;
      }
    }
  }
  
  return false;
}

module.exports = {
  canPlayerDrop,
  calculateWinningMultiplier,
  wouldHitSpread
};
 