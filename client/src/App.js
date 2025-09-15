import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameSetup from './components/GameSetup';
import GameRoom from './components/GameRoom';
import ThemeToggle from './components/ThemeToggle';
import Footer from './components/Footer';
import './App.css';

const socket = io({
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500, // Faster initial reconnection for mobile
  reconnectionAttempts: Infinity, // Keep trying indefinitely for mobile
  reconnectionDelayMax: 10000, // Max delay between reconnection attempts
  timeout: 60000, // Much longer timeout for mobile
  forceNew: false,
  // Mobile optimizations
  transports: ['polling', 'websocket'], // Start with polling for mobile stability
  upgrade: true, // Allow transport upgrades
  rememberUpgrade: false, // Don't remember upgrade for mobile (start fresh each time)
  // Additional mobile settings
  randomizationFactor: 0.5, // Add randomness to prevent thundering herd
  maxReconnectionAttempts: Infinity
});

function App() {
  const [gameId, setGameId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isWatcher, setIsWatcher] = useState(false);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [currentSocketId, setCurrentSocketId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState('');
  const [reconnectTimeout, setReconnectTimeout] = useState(null);


  useEffect(() => {
    // Check if there's a game ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('game');
    if (urlGameId) {
      setGameId(urlGameId);
    }

    // Connection state management
    socket.on('connect', () => {
      console.log(`[${new Date().toISOString()}] Connected to server`);
      setCurrentSocketId(socket.id);
      setIsConnected(true);
      setReconnecting(false);
      setError('');
      setDisconnectReason('');
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${new Date().toISOString()}] Disconnected from server, reason:`, reason);
      setIsConnected(false);
      setDisconnectReason(reason);
      setReconnecting(true); // Show reconnecting state immediately
    });

    socket.on('reconnect', () => {
      console.log(`[${new Date().toISOString()}] Reconnected to server`);
      setReconnecting(false);
      setError('');
      setDisconnectReason('');
      
      // Clear the reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
      
      // For mobile users, try to rejoin game if we have current state
      if (gameId && playerName) {
        console.log(`[${new Date().toISOString()}] Mobile reconnected, rejoining game...`);
        socket.emit('join-game', {
          gameId: gameId,
          playerName: playerName,
          isWatcher: isWatcher
        });
      }
    });

    socket.on('reconnecting', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] Reconnecting... attempt ${attemptNumber}`);
      setReconnecting(true);
      
      // Set a timeout to show disconnection message if reconnecting takes too long
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      const timeout = setTimeout(() => {
        console.log(`[${new Date().toISOString()}] Reconnection timeout - showing disconnection message`);
        setReconnecting(false);
        setIsConnected(false);
      }, 10000); // 10 seconds timeout
      
      setReconnectTimeout(timeout);
    });

    socket.on('reconnect_error', (error) => {
      console.error(`[${new Date().toISOString()}] Reconnection error:`, error);
      setError('Connection lost. Attempting to reconnect...');
    });

    socket.on('reconnect_failed', () => {
      console.error(`[${new Date().toISOString()}] Failed to reconnect`);
      setError('Failed to reconnect. Please refresh the page.');
      setReconnecting(false);
      
      // Clear the reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
    });

    // Mobile-specific reconnection handling
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] Reconnection attempt ${attemptNumber} for mobile`);
      setReconnecting(true);
    });

    // Handle transport errors specifically
    socket.on('connect_error', (error) => {
      console.error(`[${new Date().toISOString()}] Connection error:`, error);
      if (error.type === 'TransportError') {
        console.log(`[${new Date().toISOString()}] Transport error detected, will retry...`);
        setError('Connection issue detected. Retrying...');
      }
    });

    // Socket event listeners
    socket.on('game-created', (data) => {
      setGameId(data.gameId);
      setGame(data.game);
      setError('');
    });

    socket.on('player-joined', (gameState) => {
      setGame(gameState);
      setError('');
    });

    socket.on('vote-cast', (gameState) => {
      setGame(gameState);
    });

    socket.on('votes-revealed', (gameState) => {
      setGame(gameState);
    });

    socket.on('game-reset', (gameState) => {
      setGame(gameState);
    });

    socket.on('deck-changed', (gameState) => {
      setGame(gameState);
    });

    socket.on('role-toggled', (gameState) => {
      setGame(gameState);
      // Update isWatcher state for current player
      const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
      if (currentPlayer) {
        setIsWatcher(currentPlayer.isWatcher);
      }
    });

    socket.on('name-changed', (gameState) => {
      setGame(gameState);
      // Update playerName state for current player
      const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
      if (currentPlayer) {
        setPlayerName(currentPlayer.name);
      }
    });

    socket.on('player-left', (gameState) => {
      setGame(gameState);
    });

    socket.on('custom-deck-created', (gameState) => {
      setGame(gameState);
    });

    socket.on('custom-deck-edited', (gameState) => {
      setGame(gameState);
    });

    socket.on('error', (error) => {
      setError(error.message);
    });

    // Heartbeat mechanism
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 20000); // Send ping every 20 seconds

    // Mobile-specific connection monitoring
    const mobileConnectionCheck = setInterval(() => {
      if (!socket.connected) {
        // Check if we have current game state to rejoin
        if (gameId && playerName) {
          console.log(`[${new Date().toISOString()}] Mobile connection lost, attempting reconnection...`);
          socket.connect();
        }
      }
    }, 5000); // Check every 5 seconds for mobile

    // Mobile-specific event handlers
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - send heartbeat to keep connection alive
        if (socket.connected) {
          socket.emit('mobile-background');
        }
      } else {
        // App came to foreground - check connection and reconnect if needed
        console.log(`[${new Date().toISOString()}] App came to foreground, checking connection...`);
        if (!socket.connected) {
          console.log(`[${new Date().toISOString()}] Not connected, attempting reconnection...`);
          socket.connect();
        } else {
          // Already connected, try to rejoin immediately if we have game state
          if (gameId && playerName) {
            console.log(`[${new Date().toISOString()}] Already connected, rejoining game immediately...`);
            socket.emit('join-game', {
              gameId: gameId,
              playerName: playerName,
              isWatcher: isWatcher
            });
          }
        }
      }
    };

    const handleBeforeUnload = () => {
      if (socket.connected) {
        socket.emit('mobile-unload');
      }
    };

    // Add mobile event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(mobileConnectionCheck);
      // Clear reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      // Remove mobile event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Remove socket event listeners
      socket.off('game-created');
      socket.off('player-joined');
      socket.off('vote-cast');
      socket.off('votes-revealed');
      socket.off('game-reset');
      socket.off('deck-changed');
      socket.off('role-toggled');
      socket.off('player-left');
      socket.off('custom-deck-created');
      socket.off('custom-deck-edited');
      socket.off('error');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('reconnect');
      socket.off('reconnecting');
      socket.off('reconnect_error');
      socket.off('reconnect_failed');
    };
  }, []);

  const handleCreateGame = (data) => {
    setPlayerName(data.playerName);
    setIsWatcher(data.isWatcher);
    // Save name to localStorage for future use
    localStorage.setItem('planningPokerPlayerName', data.playerName);
    socket.emit('create-game', data);
  };

  const handleJoinGame = (data) => {
    setPlayerName(data.playerName);
    setIsWatcher(data.isWatcher);
    // Save name to localStorage for future use
    localStorage.setItem('planningPokerPlayerName', data.playerName);
    socket.emit('join-game', data);
  };

  const handleLeaveGame = () => {
    // Notify server that player is leaving
    if (gameId) {
      socket.emit('leave-game', { gameId });
    }
    
    setGameId(null);
    setGame(null);
    setPlayerName('');
    setIsWatcher(false);
    setError('');
    // Update URL to remove game parameter
    window.history.pushState({}, '', '/');
  };

  const handleToggleRole = () => {
    if (gameId) {
      socket.emit('toggle-role', { gameId });
    }
  };

  if (gameId && game) {
    return (
      <div>
        <div className="container">
          <GameRoom
            game={game}
            playerName={playerName}
            isWatcher={isWatcher}
            socket={socket}
            currentSocketId={currentSocketId}
            onToggleRole={handleToggleRole}
          />
        </div>
        
        {/* Connection Status Indicator - Above Footer */}
        {!isConnected && (
          <div className="connection-status" style={{
            padding: '15px',
            textAlign: 'center',
            backgroundColor: reconnecting ? '#fff3cd' : '#f8d7da',
            color: reconnecting ? '#856404' : '#721c24',
            borderTop: '1px solid #f5c6cb',
            margin: '0'
          }}>
            {reconnecting ? (
              <div>🔄 Reconnecting to server...</div>
            ) : (
              <div>❌ Disconnected from server - Refresh to rejoin the game</div>
            )}
          </div>
        )}

        
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <div className="container">
        <ThemeToggle />
        
        <div className="text-center mb-4">
          <h1>Planning Poker</h1>
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-3">
              <button 
                onClick={() => socket.disconnect()} 
                className="btn btn-sm"
                style={{ marginRight: '10px', backgroundColor: '#dc3545' }}
              >
                Test Disconnect
              </button>
              <button 
                onClick={() => socket.connect()} 
                className="btn btn-sm"
                style={{ backgroundColor: '#28a745' }}
              >
                Test Reconnect
              </button>
            </div>
          )}
        </div>
        

        {error && (
          <div className="card" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
            <p>
              {error}
              {error === 'Game not found.' && (
                <span>
                  {' '}
                  <a 
                    href="/" 
                    style={{ color: '#721c24', textDecoration: 'underline', fontWeight: 'bold' }}
                    onClick={(e) => {
                      e.preventDefault();
                      window.location.href = '/';
                    }}
                  >
                    Click here to start a new game!
                  </a>
                </span>
              )}
            </p>
          </div>
        )}

        <GameSetup
          gameId={gameId}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          prefillName={playerName}
        />
      </div>
      
      {/* Connection Status Indicator - Above Footer */}
      {!isConnected && (
        <div className="connection-status" style={{
          padding: '15px',
          textAlign: 'center',
          backgroundColor: reconnecting ? '#fff3cd' : '#f8d7da',
          color: reconnecting ? '#856404' : '#721c24',
          borderTop: '1px solid #f5c6cb',
          margin: '0'
        }}>
          {reconnecting ? (
            <div>🔄 Reconnecting to server...</div>
          ) : (
            <div>❌ Disconnected from server - Refresh to rejoin the game</div>
          )}
        </div>
      )}

      
      <Footer />
    </div>
  );
}

export default App;
