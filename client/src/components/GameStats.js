import React from 'react';

const GameStats = ({ votes, players, deck }) => {
  const nonWatcherVotes = Object.entries(votes).filter(([playerId]) => {
    const player = players.find(p => p.id === playerId);
    return player && !player.isWatcher;
  });

  const getNumericValue = (card) => {
    // Handle special cards
    if (card === '?' || card === '!' || card === '⏸️') return null;
    
    // Handle T-shirt sizes
    const tshirtValues = { 'XS': 1, 'S': 2, 'M': 3, 'L': 5, 'XL': 8, 'XXL': 13 };
    if (tshirtValues[card] !== undefined) return tshirtValues[card];
    
    // Handle numeric values
    const num = parseFloat(card);
    return isNaN(num) ? null : num;
  };

  const getVoteDistribution = () => {
    const distribution = {};
    
    nonWatcherVotes.forEach(([, card]) => {
      distribution[card] = (distribution[card] || 0) + 1;
    });
    
    return distribution;
  };

  const getAverage = () => {
    const numericVotes = nonWatcherVotes
      .map(([, card]) => getNumericValue(card))
      .filter(val => val !== null);

    if (numericVotes.length === 0) return 0;
    
    const sum = numericVotes.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / numericVotes.length);
  };

  const getNearestFibonacci = (num) => {
    const fibonacci = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    
    if (num <= 0) return 0;
    if (num >= 89) return 89;
    
    let closest = fibonacci[0];
    let minDiff = Math.abs(num - fibonacci[0]);
    
    for (let i = 1; i < fibonacci.length; i++) {
      const diff = Math.abs(num - fibonacci[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = fibonacci[i];
      }
    }
    
    return closest;
  };

  const distribution = getVoteDistribution();
  const average = getAverage();
  const nearestFibonacci = getNearestFibonacci(average);
  const totalVotes = nonWatcherVotes.length;

  if (totalVotes === 0) {
    return null;
  }

  // Determine which statistics to show based on deck type
  const shouldShowAverage = deck.name !== 'T-Shirt Sizing';
  const shouldShowNearestFibonacci = deck.name === 'Fibonacci';

  return (
    <div className="card game-stats-revealed">
      <h3>Vote Statistics</h3>
      
      <div className="stats-summary">
        {shouldShowAverage && (
          <div className="stat-highlight">
            <div className="stat-value">{average}</div>
            <div className="stat-label">Average</div>
          </div>
        )}
        {shouldShowNearestFibonacci && (
          <div className="stat-highlight">
            <div className="stat-value">{nearestFibonacci}</div>
            <div className="stat-label">Nearest Fibonacci</div>
          </div>
        )}
        <div className="stat-highlight">
          <div className="stat-value">{totalVotes}</div>
          <div className="stat-label">Total Votes</div>
        </div>
      </div>

      <div className="vote-distribution">
        <h4>Vote Distribution</h4>
        <div className="distribution-grid">
          {Object.entries(distribution)
            .sort(([a], [b]) => {
              // Sort numeric values first, then special cards
              const aNum = getNumericValue(a);
              const bNum = getNumericValue(b);
              
              if (aNum !== null && bNum !== null) {
                return aNum - bNum;
              }
              if (aNum !== null) return -1;
              if (bNum !== null) return 1;
              return a.localeCompare(b);
            })
            .map(([card, count]) => (
              <div key={card} className="distribution-item">
                <div className="card-value">{card === '⏸️' ? '⏸️' : card}</div>
                <div className="vote-count">{count}</div>
                <div className="vote-bar">
                  <div 
                    className="vote-bar-fill" 
                    style={{ 
                      width: `${(count / totalVotes) * 100}%`,
                      backgroundColor: card === '?' || card === '!' || card === '⏸️' 
                        ? 'var(--warning-color)' 
                        : 'var(--accent-color)'
                    }}
                  ></div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GameStats;
