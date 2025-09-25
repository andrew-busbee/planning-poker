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

  useEffect(() => {
    // Update URL with game ID
    const url = `${window.location.origin}?game=${game.id}`;
    setGameUrl(url);
    
    // Note: URL updating is now handled in App.js to ensure it happens immediately
    // when gameId is set, not just when GameRoom component renders
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
        />

    </div>
  );
};

export default GameRoom;
