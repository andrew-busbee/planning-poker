import React, { useState, useEffect } from 'react';
import CardBack from './CardBack';
import WatcherCardBack from './WatcherCardBack';
import AndrewWatcherCardBack from './AndrewWatcherCardBack';
import Confetti from 'react-confetti';
import NameChangeModal from './NameChangeModal';
import logger from '../utils/logger';

const PlayerCard = ({ player, vote, revealed, isCurrentPlayer, game }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [previousName, setPreviousName] = useState(player?.name);

  useEffect(() => {
    if (revealed && vote) {
      // Delay the flip based on player index for staggered animation
      const delay = Math.random() * 500 + 200; // 200-700ms delay
      const timer = setTimeout(() => {
        setIsFlipped(true);
      }, delay);
      return () => clearTimeout(timer);
    } else {
      // Reset flip state when not revealed or no vote
      setIsFlipped(false);
    }
  }, [revealed, vote]);

  // Close modal when player name changes (indicating successful update)
  useEffect(() => {
    if (showNameModal && player?.name && previousName && player.name !== previousName) {
      logger.info(`[PLAYERCARD] Player name changed from "${previousName}" to "${player.name}", closing modal`);
      setShowNameModal(false);
    }
    setPreviousName(player?.name);
  }, [player?.name, showNameModal, previousName]);

  const getStatusClass = () => {
    if (player.isWatcher) return 'watcher';
    if (player.hasVoted) return 'voted';
    if (revealed) return 'no-vote';
    return 'waiting';
  };

  const getStatusText = () => {
    if (player.isWatcher) return '👁️ Watcher';
    if (player.hasVoted) return '✅ Voted';
    if (revealed) return '❌ No Vote';
    return '⏳ Waiting...';
  };

  return (
    <div className="player-card">
      <div className="card-flip">
        <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
          <div className="card-front">
            {vote === '☕' ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>☕</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Break</div>
              </div>
            ) : (vote || '')}
          </div>
          {player.isWatcher && player.name.toLowerCase() === 'yukon' ? <AndrewWatcherCardBack /> : 
           player.isWatcher ? <WatcherCardBack /> : <CardBack />}
        </div>
      </div>
      <div className="player-name">
        {player.name}
        {isCurrentPlayer && ' (You)'}
      </div>
      <div className={`player-status ${getStatusClass()}`}>
        {getStatusText()}
      </div>
      {isCurrentPlayer && (
        <div className="player-actions">
          <button 
            className="change-name-link"
            onClick={(e) => {
              e.stopPropagation();
              setShowNameModal(true);
            }}
            title="Change your name"
          >
            ✏️ Change name
          </button>
        </div>
      )}
      {showNameModal && (
        <NameChangeModal
          game={game}
          currentPlayer={player}
          onClose={() => {
            setShowNameModal(false);
          }}
        />
      )}
    </div>
  );
};

export default PlayerCard;
