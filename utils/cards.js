//  Deck creation and management functions

// Create a deck for Tonk (standard deck minus 8s, 9s, and 10s)
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', 'J', 'Q', 'K'];
  const values = {'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, 'J': 10, 'Q': 10, 'K': 10};
  
  let deck = [];
  let id = 0;
  
  for (let suit of suits) {
    for (let rank of ranks) {
      deck.push({
        id: `card-${id++}`,
        suit,
        rank,
        value: values[rank],
        isHidden: false
      });
    }
  }
  
  return shuffle(deck);
}

// Fisher-Yates shuffle algorithm
function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue, randomIndex;

  // While there remain elements to shuffle
  while (currentIndex !== 0) {
    // Pick a remaining element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // Swap it with the current element
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Deal cards to players
function dealCards(deck, playerCount) {
  const hands = Array(playerCount).fill().map(() => []);
  
  // Deal 5 cards to each player
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < playerCount; j++) {
      if (deck.length > 0) {
        hands[j].push(deck.pop());
      }
    }
  }
  
  return { hands, deck };
}

// Check if a set of cards forms a valid spread
function isValidSpread(cards) {
  if (cards.length < 3) return false;
  
  // Check if it's a set (same rank)
  const isSet = cards.every(card => card.rank === cards[0].rank);
  if (isSet) return true;
  
  // Check if it's a run (sequential cards of the same suit)
  const sameSuit = cards.every(card => card.suit === cards[0].suit);
  if (!sameSuit) return false;
  
  // Order by value
  const ordered = [...cards].sort((a, b) => a.value - b.value);
  
  // Check if sequential
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].value !== ordered[i-1].value + 1) {
      return false;
    }
  }
  
  return true;
}

// Calculate hand score
function calculateHandScore(hand) {
  return hand.reduce((sum, card) => sum + card.value, 0);
}

module.exports = {
  createDeck,
  shuffle,
  dealCards,
  isValidSpread,
  calculateHandScore
};
 