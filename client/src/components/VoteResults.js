import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';

const VoteResults = ({ votes, players }) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown Player';
  };

  const getPlayerIsWatcher = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.isWatcher : false;
  };

  const voteEntries = Object.entries(votes);
  const nonWatcherVotes = voteEntries.filter(([playerId]) => !getPlayerIsWatcher(playerId));
  const watcherVotes = voteEntries.filter(([playerId]) => getPlayerIsWatcher(playerId));

  const getVoteStats = () => {
    const voteValues = nonWatcherVotes.map(([, card]) => card);
    const uniqueValues = [...new Set(voteValues)];
    
    return {
      totalVotes: voteValues.length,
      uniqueValues: uniqueValues.length,
      consensus: uniqueValues.length === 1 && voteValues.length > 1
    };
  };

  const stats = getVoteStats();

  // Handle confetti animation
  useEffect(() => {
    if (stats.consensus) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000); // Show confetti for 5 seconds
      return () => clearTimeout(timer);
    }
  }, [stats.consensus]);

  // Handle window resize for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="card">
      {showConfetti && (
        <Confetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.3}
        />
      )}
      
      <h3>Vote Results</h3>
      
      {stats.consensus && (
        <div className="mb-3" style={{ 
          background: '#d4edda', 
          color: '#155724', 
          padding: '12px', 
          borderRadius: '6px',
          border: '1px solid #c3e6cb',
          animation: 'pulse 2s infinite'
        }}>
          🎉 <strong>Consensus reached!</strong> All players voted for the same value.
        </div>
      )}

      <div className="vote-results">
        <h4>Votes ({stats.totalVotes})</h4>
        {nonWatcherVotes.length > 0 ? (
          nonWatcherVotes.map(([playerId, card]) => (
            <div key={playerId} className="vote-item">
              <span className="player-name">{getPlayerName(playerId)}</span>
              <span className="vote-card">{card}</span>
            </div>
          ))
        ) : (
          <p className="text-muted">No votes cast yet</p>
        )}
      </div>

      {watcherVotes.length > 0 && (
        <div className="vote-results mt-3">
          <h4>Watcher Votes</h4>
          {watcherVotes.map(([playerId, card]) => (
            <div key={playerId} className="vote-item">
              <span className="player-name">
                {getPlayerName(playerId)} 
                <span className="watcher-badge">Watcher</span>
              </span>
              <span className="vote-card">{card}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3">
        <p className="text-muted">
          <strong>Summary:</strong> {stats.uniqueValues} unique values from {stats.totalVotes} votes
        </p>
      </div>
    </div>
  );
};

export default VoteResults;
