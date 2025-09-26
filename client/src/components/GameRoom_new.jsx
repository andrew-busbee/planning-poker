import React, { useState, useEffect, useRef } from 'react';
import { useGameContext } from './GameProvider';
import { useGameStore } from '../stores/gameStore';
import CardDeck from './CardDeck';
import PlayerCard from './PlayerCard';
import GameStats from './GameStats';
import GameControls from './GameControls';
import ThemeToggle from './ThemeToggle';
import ConfettiEffect from './ConfettiEffect';

const GameRoom = ({ game, playerName, isWatcher, socketId, onToggleRole }) => {
  const { game: gameContext, socketService } = useGameContext();
  const gameStore = useGameStore();
  
  const [gameUrl, setGameUrl] = useState('');

  useEffect(() => {
    // Update URL with game ID
    const url = `${window.location.origin}?game=${game.id}`;
    setGameUrl(url);
  }, [game.id]);

  // Reset selected card when current player becomes a watcher
  useEffect(() => {
    const currentPlayer = game.players.find(p => p.id === socketId);
    const currentIsWatcher = currentPlayer ? currentPlayer.isWatcher : isWatcher;
    
    // If the current player is a watcher, reset their selected card
    if (currentIsWatcher) {
      gameStore.setSelectedCard(null);
    }
  }, [game.players, socketId, isWatcher, gameStore]);

  const handleCardSelect = (card) => {
    if (isWatcher || game.revealed) return;
    
    gameStore.setSelectedCard(card);
    gameStore.castVote(game.id, card);
  };

  const handleRevealVotes = () => {
    gameStore.revealVotes(game.id);
  };

  const handleResetGame = () => {
    gameStore.resetGame(game.id);
  };

  const handleDeckChange = (deckType) => {
    gameStore.changeDeck(game.id, deckType);
  };

  const handleToggleRole = () => {
    gameStore.toggleRole(game.id);
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


  const currentPlayer = game.players.find(p => p.id === socketId);
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

  // Track previous consensus state to detect changes
  const prevConsensusRef = useRef(false);
  
  // Trigger confetti on consensus
  useEffect(() => {
    const wasConsensus = prevConsensusRef.current;
    const isNowConsensus = isConsensus && game.revealed;
    
    // Only trigger confetti when consensus changes from false to true
    if (!wasConsensus && isNowConsensus) {
      gameStore.setShowConfetti(true);
    }
    
    prevConsensusRef.current = isNowConsensus;
  }, [isConsensus, game.revealed, gameStore]);

  // Reset selected card when game is reset
  useEffect(() => {
    // When game is reset (revealed goes from true to false), clear selection
    if (game.revealed === false) {
      gameStore.setSelectedCard(null);
    }
  }, [game.revealed, gameStore]);

  return (
    <div>
      <ConfettiEffect 
        trigger={gameStore.showConfetti} 
        onComplete={() => gameStore.setShowConfetti(false)} 
      />
      
      <div className="flex justify-between align-center mb-4">
        <div className="flex align-center gap-3">
          <h1>Planning Poker</h1>
          <button onClick={copyGameUrl} className="btn btn-success btn-share">
            Share Game Link
          </button>
          <ThemeToggle inline={true} />
        </div>
        <button
          onClick={handleToggleRole}
          className="btn btn-warning btn-role-toggle"
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
            fontWeight: 'bold'
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
              isCurrentPlayer={player.id === socketId}
              game={game}
            />
          ))}
        </div>
      </div>

      {/* Card Selection (only show when not revealed and not a watcher) */}
      {!game.revealed && !currentIsWatcher && (
        <CardDeck
          deck={game.deck}
          onCardSelect={handleCardSelect}
          selectedCard={gameStore.selectedCard}
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


