import React, { useState, useEffect } from 'react';

const GameSetup = ({ gameId, onCreateGame, onJoinGame, prefillName = '' }) => {
  const [playerName, setPlayerName] = useState(prefillName);
  const [isWatcher, setIsWatcher] = useState(false);
  const [deckType, setDeckType] = useState('fibonacci');
  const [availableDecks, setAvailableDecks] = useState({});

  useEffect(() => {
    // Fetch available deck types
    fetch('/api/decks')
      .then(response => response.json())
      .then(data => setAvailableDecks(data))
      .catch(error => console.error('Error fetching decks:', error));
  }, []);

  // Update playerName when prefillName changes
  useEffect(() => {
    if (prefillName) {
      setPlayerName(prefillName);
    }
  }, [prefillName]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const data = {
      playerName: playerName.trim(),
      isWatcher,
      deckType
    };

    if (gameId) {
      onJoinGame({ ...data, gameId });
    } else {
      onCreateGame(data);
    }
  };

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>{gameId ? 'Join a Game' : 'Create a New Game'}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="playerName">Your Name:</label>
            <input
              type="text"
              id="playerName"
              className="input"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>


          <div>
            <label>
              <input
                type="checkbox"
                checked={isWatcher}
                onChange={(e) => setIsWatcher(e.target.checked)}
              />
              Join as watcher (can reveal votes and reset game, but cannot vote)
            </label>
          </div>

          {!gameId && (
            <div>
              <label htmlFor="deckType">Card Deck:</label>
              <select
                id="deckType"
                className="select"
                value={deckType}
                onChange={(e) => setDeckType(e.target.value)}
              >
                {Object.entries(availableDecks).map(([key, deck]) => (
                  <option key={key} value={key}>
                    {deck.name}
                  </option>
                ))}
              </select>
              
              {availableDecks[deckType] && (
                <div className="deck-preview">
                  {availableDecks[deckType].cards.map((card, index) => (
                    <span key={index} className="deck-preview-card">
                      {card}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn">
            {gameId ? 'Join a Game' : 'Create a Game'}
          </button>
        </form>
      </div>

      {gameId && (
        <div className="card">
          <h2>Game Information</h2>
          <p>You're about to join game:</p>
          <div className="game-url">
            {window.location.origin}?game={gameId}
          </div>
          <p className="text-muted">
            Share this URL with other team members to invite them to the game.
          </p>
        </div>
      )}

      {!gameId && (
        <div className="card">
          <h2>How to Play</h2>
          <ol style={{ textAlign: 'left', paddingLeft: '20px' }}>
            <li>Create a new game or join an existing one</li>
            <li>Select a card to cast your vote</li>
            <li>Create a new game or join an existing one with a shared URL</li>
            <li>Any player can reveal the votes</li>
            <li>Discuss the results and start a new round</li>
          </ol>
          
          <h3>Features</h3>
          <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
            <li>Multiple card deck options</li>
            <li>Watcher mode for observers</li>
            <li>Real-time updates</li>
            <li>No login required</li>
            <li>Shareable game URLs</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default GameSetup;
