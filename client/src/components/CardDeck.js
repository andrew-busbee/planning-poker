import React from 'react';

const CardDeck = ({ deck, onCardSelect, selectedCard, hasVoted, isWatcher, revealed }) => {
  const getCardClass = (card) => {
    let className = 'poker-card';
    
    if (selectedCard === card) {
      className += ' selected';
    }
    
    if (hasVoted && selectedCard === card) {
      className += ' voted';
    }
    
    if (revealed) {
      className += ' revealed';
    }
    
    return className;
  };

  const getCardStyle = (card) => {
    return {
      cursor: (isWatcher || revealed) ? 'not-allowed' : 'pointer',
      opacity: (isWatcher || revealed && selectedCard !== card) ? 0.6 : 1
    };
  };

  const handleCardClick = (card) => {
    if (isWatcher || revealed) return;
    onCardSelect(card);
  };

  return (
    <div className="card">
      <h3>Select Your Card</h3>
      {isWatcher && (
        <p className="text-muted mb-3">
          You're watching this game. You can reveal votes and reset the game, but you cannot vote.
        </p>
      )}
      {revealed && (
        <p className="text-muted mb-3">
          Votes have been revealed! Wait for the game to be reset to vote again.
        </p>
      )}
      <div className="card-selection-grid">
        {deck.cards.map((card, index) => {
          const isSpecialCard = card === '?' || card === '!' || card === '☕';
          
          return (
            <div
              key={index}
              className={`${getCardClass(card)} ${isSpecialCard ? 'special-card' : ''}`}
              onClick={() => handleCardClick(card)}
              style={getCardStyle(card)}
            >
              {card === '☕' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>☕</div>
                  <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Break</div>
                </div>
              ) : card}
            </div>
          );
        })}
      </div>
      {hasVoted && !revealed && (
        <p className="text-muted mt-3">
          ✓ You have voted! Waiting for other players...
        </p>
      )}
    </div>
  );
};

export default CardDeck;
