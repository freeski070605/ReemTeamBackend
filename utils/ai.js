const  { isValidSpread } = require('./cards');
const { wouldHitSpread } = require('./gameRules');

// AI decision making for drawing a card
function decideDrawSource(game, aiPlayer) {
  const discardPile = game.discardPile;
  
  // If discard pile is empty, draw from deck
  if (discardPile.length === 0) {
    return 'deck';
  }
  
  const topDiscard = discardPile[0];
  
  // If taking the discard would hit a spread, take it
  if (wouldImproveHand(aiPlayer.hand, topDiscard)) {
    return 'discard';
  }
  
  // If taking the discard would avoid high-value cards, take it
  if (topDiscard.value <= 5) {
    return 'discard';
  }
  
  // Otherwise, draw from deck
  return 'deck';
}

// AI decision making for discarding a card
function decideCardToDiscard(hand) {
  // If we have only one card, discard it
  if (hand.length === 1) {
    return hand[0].id;
  }
  
  // Never discard cards that are part of a potential spread
  const cardsNotInPotentialSpread = hand.filter(card => !isPartOfPotentialSpread(card, hand));
  
  if (cardsNotInPotentialSpread.length > 0) {
    // Discard highest value card not in a potential spread
    const sortedByValue = [...cardsNotInPotentialSpread].sort((a, b) => b.value - a.value);
    return sortedByValue[0].id;
  }
  
  // If all cards are part of potential spreads, discard the highest value card
  const sortedByValue = [...hand].sort((a, b) => b.value - a.value);
  return sortedByValue[0].id;
}

// Check if a card is part of a potential spread
function isPartOfPotentialSpread(card, hand) {
  const otherCards = hand.filter(c => c.id !== card.id);
  
  // Check for same rank (potential set)
  const sameRank = otherCards.filter(c => c.rank === card.rank);
  if (sameRank.length >= 1) {
    return true;
  }
  
  // Check for sequential cards of same suit (potential run)
  const sameSuit = otherCards.filter(c => c.suit === card.suit);
  if (sameSuit.length >= 1) {
    for (const suitCard of sameSuit) {
      if (Math.abs(suitCard.value - card.value) === 1) {
        return true;
      }
    }
  }
  
  return false;
}

// Determine if AI should drop
function shouldDrop(aiPlayer, game) {
  // If AI has penalties, it can't drop
  if (aiPlayer.penalties > 0) {
    return false;
  }
  
  // Calculate hand score
  const score = aiPlayer.hand.reduce((sum, card) => sum + card.value, 0);
  
  // If score is 11 or under, always drop
  if (score <= 11) {
    return true;
  }
  
  // If score is good (e.g., 25 or less), drop
  if (score <= 25) {
    return true;
  }
  
  // If score is decent (e.g., 35 or less) and there's a risk of being hit, drop
  if (score <= 35 && isAtRiskOfBeingHit(aiPlayer, game)) {
    return true;
  }
  
  // Drop if very close to 50 (don't risk going over)
  if (score >= 45 && score <= 50) {
    return true;
  }
  
  return false;
}

// Check if AI is at risk of being hit by next player
function isAtRiskOfBeingHit(aiPlayer, game) {
  // This would require more complex logic in a real implementation
  // For this simplified version, assume risk increases with more players
  const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
  const nextPlayer = game.players[nextPlayerIndex];
  
  // If next player has few cards, they're more likely to hit
  return nextPlayer.hand.length <= 2;
}

// Check if card would improve hand
function wouldImproveHand(hand, discardCard) {
  // Check if adding this card would create a spread
  for (let i = 0; i < hand.length - 1; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      if (isValidSpread([hand[i], hand[j], discardCard])) {
        return true;
      }
    }
  }
  
  // Check if it's a low value card (better to have low cards)
  return discardCard.value <= 3;
}

module.exports = {
  decideDrawSource,
  decideCardToDiscard,
  shouldDrop
};
 