import React from 'react';

const GameStatistics = ({ votes, players, deck }) => {
  const nonWatcherVotes = Object.entries(votes).filter(([playerId]) => {
    const player = players.find(p => p.id === playerId);
    return player && !player.isWatcher;
  });

  const getNumericValue = (card) => {
    // Handle special cards
    if (card === '?' || card === '!' || card === '☕') return null;
    
    // Handle T-shirt sizes
    const tshirtValues = { 'XS': 1, 'S': 2, 'M': 3, 'L': 5, 'XL': 8, 'XXL': 13 };
    if (tshirtValues[card] !== undefined) return tshirtValues[card];
    
    // Handle numeric values
    const num = parseFloat(card);
    return isNaN(num) ? null : num;
  };

  const numericVotes = nonWatcherVotes
    .map(([, card]) => getNumericValue(card))
    .filter(val => val !== null);

  const calculateStats = () => {
    if (numericVotes.length === 0) {
      return {
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        consensus: false,
        totalVotes: nonWatcherVotes.length,
        uniqueValues: 0
      };
    }

    const sorted = [...numericVotes].sort((a, b) => a - b);
    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    const average = sum / numericVotes.length;
    
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    const uniqueValues = [...new Set(numericVotes)].length;
    const consensus = uniqueValues === 1 && numericVotes.length > 1;

    return {
      average: Math.round(average * 10) / 10,
      median: Math.round(median * 10) / 10,
      min: Math.min(...numericVotes),
      max: Math.max(...numericVotes),
      consensus,
      totalVotes: nonWatcherVotes.length,
      uniqueValues
    };
  };

  const stats = calculateStats();

  return (
    <div className="game-stats">
      <h3>Game Statistics</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.average}</div>
          <div className="stat-label">Average</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.median}</div>
          <div className="stat-label">Median</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.min}</div>
          <div className="stat-label">Min</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.max}</div>
          <div className="stat-label">Max</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.totalVotes}</div>
          <div className="stat-label">Votes</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.uniqueValues}</div>
          <div className="stat-label">Unique</div>
        </div>
      </div>
      
      {stats.consensus && (
        <div style={{ 
          marginTop: '16px',
          padding: '12px',
          background: 'var(--success-color)',
          color: 'white',
          borderRadius: '8px',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          🎉 Consensus Reached!
        </div>
      )}

      <div style={{ 
        marginTop: '16px',
        fontSize: '14px',
        color: 'var(--text-secondary)',
        textAlign: 'center'
      }}>
        Deck: <strong>{deck.name}</strong> • 
        Players: <strong>{players.length}</strong>
      </div>
    </div>
  );
};

export default GameStatistics;
