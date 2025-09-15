import React, { useState, useEffect } from 'react';
import CardBack from './CardBack';
import WatcherCardBack from './WatcherCardBack';
import AndrewWatcherCardBack from './AndrewWatcherCardBack';
import Confetti from 'react-confetti';

const PlayerCard = ({ player, vote, revealed, isCurrentPlayer, onEditName }) => {
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
    if (player.hasVoted) return '✅ Voted';
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
        <button
          onClick={() => onEditName && onEditName()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            margin: '6px auto 0',
            transition: 'color 0.2s ease',
            whiteSpace: 'nowrap',
            minWidth: '0'
          }}
          onMouseEnter={(e) => e.target.style.color = 'var(--accent-color)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          title="Edit name"
        >
          ✏️ Change name
        </button>
      )}
    </div>
  );
};

export default PlayerCard;
