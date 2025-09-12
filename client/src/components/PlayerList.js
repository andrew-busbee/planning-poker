import React from 'react';

const PlayerList = ({ players, currentPlayerName, revealed }) => {
  const getPlayerStatus = (player) => {
    if (player.isWatcher) {
      return '👁️ Watcher';
    }
    
    if (player.hasVoted) {
      return revealed ? '✅ Voted' : '⏳ Voted';
    }
    
    return '⏳ Waiting...';
  };

  const getStatusColor = (player) => {
    if (player.isWatcher) {
      return '#6c757d';
    }
    
    if (player.hasVoted) {
      return revealed ? '#28a745' : '#ffc107';
    }
    
    return '#dc3545';
  };

  return (
    <div className="card">
      <h3>Players ({players.length})</h3>
      <div className="player-list">
        {players.map((player) => (
          <div key={player.id} className="player-item">
            <div className="flex align-center">
              <span className="player-name">
                {player.name}
                {player.name === currentPlayerName && ' (You)'}
              </span>
              {player.isWatcher && (
                <span className="watcher-badge">Watcher</span>
              )}
            </div>
            <span 
              className="player-status"
              style={{ color: getStatusColor(player) }}
            >
              {getPlayerStatus(player)}
            </span>
          </div>
        ))}
      </div>
      
      {!revealed && (
        <div className="mt-3">
          <p className="text-muted">
            {players.filter(p => !p.isWatcher && p.hasVoted).length} of {players.filter(p => !p.isWatcher).length} players have voted
          </p>
        </div>
      )}
    </div>
  );
};

export default PlayerList;
