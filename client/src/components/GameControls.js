import React, { useState, useEffect } from 'react';
import CustomDeckEditor from './CustomDeckEditor';

const GameControls = ({ game, isWatcher, onRevealVotes, onResetGame, onDeckChange }) => {
  const [availableDecks, setAvailableDecks] = useState({});
  const [showCustomDeckEditor, setShowCustomDeckEditor] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  useEffect(() => {
    // Fetch available deck types
    fetch('/api/decks')
      .then(response => response.json())
      .then(data => setAvailableDecks(data))
      .catch(error => console.error('Error fetching decks:', error));
  }, []);

  const canReveal = game.canReveal || false;
  const canReset = game.revealed;

  return (
    <div className="card">
      <h3>Game Controls</h3>
      
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={onRevealVotes}
          disabled={!canReveal}
          className={`btn ${canReveal ? 'btn-success' : 'btn-secondary'}`}
        >
          {canReveal ? 'Reveal Votes' : 'Waiting for votes...'}
        </button>

        <button
          onClick={onResetGame}
          disabled={!canReset}
          className={`btn ${canReset ? 'btn-warning' : 'btn-secondary'}`}
        >
          Start New Round
        </button>

      </div>

      {isWatcher && (
        <div className="mt-3" style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <p className="text-muted mb-0">
            <strong>Watcher Mode:</strong> You can reveal votes and start new rounds, but you cannot vote.
          </p>
        </div>
      )}

      {!game.revealed && (
        <div className="deck-selector">
          <h4>Change Card Deck</h4>
          <p className="text-muted mb-2">
            Changing the deck will reset the current round
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(availableDecks).map(([key, deck]) => (
              <button
                key={key}
                onClick={() => onDeckChange(key)}
                className={`btn ${game.deckType === key ? 'btn-success' : 'btn-primary'}`}
                disabled={game.deckType === key}
              >
                {deck.name}
              </button>
            ))}
            
            {game.customDeck && (
              <button
                onClick={() => onDeckChange('custom')}
                className={`btn ${game.deckType === 'custom' ? 'btn-success' : 'btn-primary'}`}
                disabled={game.deckType === 'custom'}
              >
                {game.customDeck.name}
              </button>
            )}
            
            <div className="custom-deck-actions">
              {game.customDeck ? (
                <button
                  onClick={() => {
                    setIsEditingCustom(true);
                    setShowCustomDeckEditor(true);
                  }}
                  className="btn btn-warning"
                >
                  Edit Custom Deck
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsEditingCustom(false);
                    setShowCustomDeckEditor(true);
                  }}
                  className="btn btn-primary"
                >
                  Create Custom Deck
                </button>
              )}
            </div>
          </div>
        </div>
      )}



      {showCustomDeckEditor && (
        <CustomDeckEditor
          game={game}
          onClose={() => {
            setShowCustomDeckEditor(false);
            setIsEditingCustom(false);
          }}
          isEditing={isEditingCustom}
        />
      )}
    </div>
  );
};

export default GameControls;
