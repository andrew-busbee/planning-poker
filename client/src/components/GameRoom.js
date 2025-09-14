import React, { useState, useEffect } from 'react';
import CardDeck from './CardDeck';
import PlayerCard from './PlayerCard';
import GameStats from './GameStats';
import GameControls from './GameControls';
import ThemeToggle from './ThemeToggle';
import ConfettiEffect from './ConfettiEffect';

const GameRoom = ({ game, playerName, isWatcher, socket, currentSocketId, onToggleRole }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [gameUrl, setGameUrl] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [consensusPulse, setConsensusPulse] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [newName, setNewName] = useState(playerName);

  useEffect(() => {
    // Update URL with game ID
    const url = `${window.location.origin}?game=${game.id}`;
    setGameUrl(url);
    
    // Update browser URL without reload
    window.history.pushState({}, '', `?game=${game.id}`);
  }, [game.id]);

  // Listen for role toggle updates
  useEffect(() => {
    const handleRoleToggled = (updatedGame) => {
      // The game state will be updated by the parent component
      // This listener ensures we're aware of role changes
    };

    socket.on('role-toggled', handleRoleToggled);

    return () => {
      socket.off('role-toggled', handleRoleToggled);
    };
  }, [socket]);

  // Reset selected card when current player becomes a watcher
  useEffect(() => {
    const currentPlayer = game.players.find(p => p.id === currentSocketId);
    const currentIsWatcher = currentPlayer ? currentPlayer.isWatcher : isWatcher;
    
    // If the current player is a watcher, reset their selected card
    if (currentIsWatcher) {
      setSelectedCard(null);
    }
  }, [game.players, currentSocketId, isWatcher]);

  // Listen for deck changes and reset selected card
  useEffect(() => {
    const handleDeckChanged = (updatedGame) => {
      // Reset selected card when deck changes
      setSelectedCard(null);
    };

    socket.on('deck-changed', handleDeckChanged);

    return () => {
      socket.off('deck-changed', handleDeckChanged);
    };
  }, [socket]);

  const handleCardSelect = (card) => {
    if (isWatcher || game.revealed) return;
    
    setSelectedCard(card);
    socket.emit('cast-vote', {
      gameId: game.id,
      card: card
    });
  };

  const handleRevealVotes = () => {
    socket.emit('reveal-votes', { gameId: game.id });
    // Keep selectedCard highlighted until game is reset
  };

  const handleResetGame = () => {
    socket.emit('reset-game', { gameId: game.id });
    // Clear card selection immediately
    setSelectedCard(null);
  };

  const handleDeckChange = (deckType) => {
    socket.emit('change-deck', { gameId: game.id, deckType });
  };

  const handleToggleRole = () => {
    socket.emit('toggle-role', { gameId: game.id });
  };

  const copyGameUrl = () => {
    navigator.clipboard.writeText(gameUrl).then(() => {
      alert('Game URL copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = gameUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Game URL copied to clipboard!');
    });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNameChange = () => {
    const currentPlayer = game.players.find(p => p.id === currentSocketId);
    const currentPlayerName = currentPlayer ? currentPlayer.name : playerName;
    
    if (newName.trim() && newName.trim() !== currentPlayerName) {
      socket.emit('change-name', { 
        gameId: game.id, 
        newName: newName.trim() 
      });
      setShowNameEdit(false);
    }
  };

  const handleCancelNameEdit = () => {
    const currentPlayer = game.players.find(p => p.id === currentSocketId);
    const currentPlayerName = currentPlayer ? currentPlayer.name : playerName;
    setNewName(currentPlayerName);
    setShowNameEdit(false);
  };

  // Update newName when playerName changes
  useEffect(() => {
    const currentPlayer = game.players.find(p => p.id === currentSocketId);
    const currentPlayerName = currentPlayer ? currentPlayer.name : playerName;
    setNewName(currentPlayerName);
  }, [playerName, game.players, currentSocketId]);

  const currentPlayer = game.players.find(p => p.id === currentSocketId);
  const hasVoted = currentPlayer ? currentPlayer.hasVoted : false;
  const currentIsWatcher = currentPlayer ? currentPlayer.isWatcher : isWatcher;

  // Check for consensus
  const checkConsensus = () => {
    if (!game.revealed || !game.votes) return false;
    
    const nonWatcherVotes = Object.entries(game.votes).filter(([playerId]) => {
      const player = game.players.find(p => p.id === playerId);
      return player && !player.isWatcher;
    });

    if (nonWatcherVotes.length < 2) return false;
    
    const voteValues = nonWatcherVotes.map(([, card]) => card);
    const uniqueValues = [...new Set(voteValues)];
    
    return uniqueValues.length === 1;
  };

  const isConsensus = checkConsensus();

  // Trigger confetti on consensus
  useEffect(() => {
    if (isConsensus && game.revealed) {
      setShowConfetti(true);
      setConsensusPulse(true);
      
      // Stop pulse after 5 seconds
      const timer = setTimeout(() => {
        setConsensusPulse(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isConsensus, game.revealed]);

  // Reset selected card when game is reset
  useEffect(() => {
    // When game is reset (revealed goes from true to false), clear selection
    if (game.revealed === false) {
      setSelectedCard(null);
    }
  }, [game.revealed]);

  // Timer logic
  useEffect(() => {
    // Start timer when second person joins (2+ players) and game is not revealed
    if (game.players.length >= 2 && !game.revealed) {
      setTimerActive(true);
    } else {
      setTimerActive(false);
    }
  }, [game.players.length, game.revealed]);

  // Timer countdown effect
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!timerActive && timer !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive, timer]);

  // Reset timer when new round starts
  useEffect(() => {
    if (game.revealed === false && timer > 0) {
      setTimer(0);
    }
  }, [game.revealed]);

  return (
    <div>
      <ConfettiEffect 
        trigger={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
      <ThemeToggle />
      
      <div className="flex justify-between align-center mb-4">
        <div className="flex align-center gap-3">
          <h1>Planning Poker</h1>
          {timer > 0 && (
            <div style={{
              background: 'var(--accent-color)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '18px',
              fontWeight: 'bold',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              ⏱️ {formatTimer(timer)}
            </div>
          )}
          <button onClick={copyGameUrl} className="btn btn-success">
            Share Game Link
          </button>
        </div>
        <button
          onClick={onToggleRole}
          className="btn btn-warning"
        >
          {currentIsWatcher ? 'Switch to Player' : 'Switch to Watcher'}
        </button>
      </div>

      {/* Players with Cards */}
      <div className="card">
        <h3>Players ({game.players.length})</h3>
        {isConsensus && game.revealed && (
          <div style={{ 
            background: 'var(--success-color)', 
            color: 'white', 
            padding: '12px', 
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '16px',
            fontWeight: 'bold',
            animation: consensusPulse ? 'pulse 2s infinite' : 'none'
          }}>
            🎉🎉 Consensus Reached! 🎉🎉
          </div>
        )}
        <div className="players-grid">
          {game.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              vote={game.votes[player.id]}
              revealed={game.revealed}
              isCurrentPlayer={player.id === currentSocketId}
              onEditName={() => setShowNameEdit(true)}
            />
          ))}
        </div>
      </div>

      {/* Card Selection (only show when not revealed and not a watcher) */}
      {!game.revealed && !currentIsWatcher && (
        <CardDeck
          deck={game.deck}
          onCardSelect={handleCardSelect}
          selectedCard={selectedCard}
          hasVoted={hasVoted}
          isWatcher={currentIsWatcher}
          revealed={game.revealed}
        />
      )}

      {/* Game Statistics (only show when revealed) */}
      {game.revealed && (
        <GameStats
          votes={game.votes}
          players={game.players}
          deck={game.deck}
        />
      )}

      {/* Game Controls */}
        <GameControls
          game={game}
          isWatcher={currentIsWatcher}
          onRevealVotes={handleRevealVotes}
          onResetGame={handleResetGame}
          onDeckChange={handleDeckChange}
          socket={socket}
        />

      {/* Name Edit Modal */}
      {showNameEdit && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: 'var(--card-shadow)',
            border: '1px solid var(--border-color)',
            minWidth: '300px',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '16px', textAlign: 'center' }}>Edit Name</h3>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNameChange()}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Enter your name"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleNameChange}
                className="btn btn-success"
                disabled={!newName.trim()}
              >
                Save
              </button>
              <button
                onClick={handleCancelNameEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
