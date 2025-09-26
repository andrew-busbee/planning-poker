import React from 'react';

const ConnectionIndicator = ({ connection }) => {
  const getStatus = () => {
    if (connection.isConnected) {
      return { color: 'green', text: 'Connected to Server', emoji: '🟢' };
    }
    if (connection.isConnecting) {
      return { color: 'yellow', text: 'Reconnecting to Server', emoji: '🟡' };
    }
    return { color: 'red', text: 'Disconnected from Server', emoji: '🔴' };
  };

  const status = getStatus();

  return (
    <div className="connection-indicator">
      <span className={`status-dot ${status.color}`}></span>
      <span className="status-text">{status.text}</span>
    </div>
  );
};

export default ConnectionIndicator;
