import React, { useState, useEffect } from 'react';
import CardBack from './CardBack';
import WatcherCardBack from './WatcherCardBack';
import AndrewWatcherCardBack from './AndrewWatcherCardBack';
import Confetti from 'react-confetti';

const PlayerCard = ({ player, vote, revealed, isCurrentPlayer }) => {
  const [isFlipped, setIsFlipped] = useState(false);

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

  const getStatusClass = () => {
    if (player.isWatcher) return 'watcher';
    if (player.hasVoted) return 'voted';
    return 'waiting';
  };

  const getStatusText = () => {
    if (player.isWatcher) return '👁️ Watcher';
    if (player.hasVoted) return revealed ? '✅ Voted' : '⏳ Voted';
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
            ) : (vote || '?')}
          </div>
          {player.isWatcher && player.name.toLowerCase() === 'andrew' ? <AndrewWatcherCardBack /> : 
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
    </div>
  );
};

export default PlayerCard;
