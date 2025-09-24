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
  reconnectionDelay: 500, // Faster initial reconnection delay
  reconnectionAttempts: Infinity, // Keep trying indefinitely
  reconnectionDelayMax: 5000, // Shorter max delay between reconnection attempts
  timeout: 60000, // Aligned with server timeout (1 minute)
  forceNew: false,
  transports: ['websocket', 'polling'], // WebSocket with polling fallback
  upgrade: true, // Allow transport upgrades
  rememberUpgrade: true, // Remember successful upgrades for better performance
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
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);


  useEffect(() => {
    // Check if there's a game ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('game');
    if (urlGameId) {
      setGameId(urlGameId);
    }

    // Connection state management
    socket.on('connect', () => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Connected to server, Socket ID: ${socket.id}, Transport: ${socket.io.engine.transport.name}`);
      setCurrentSocketId(socket.id);
      setIsConnected(true);
      setReconnecting(false);
      setError('');
      setDisconnectReason('');
      setHasAttemptedConnection(true);
      
      // Log connection quality metrics
      console.log(`[${new Date().toISOString()}] [CLIENT] Connection quality: Total pings: ${connectionQuality.totalPings}, Total pongs: ${connectionQuality.totalPongs}, Last latency: ${connectionQuality.lastLatency}ms, Reconnections: ${connectionQuality.reconnectionCount}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Disconnected from server, reason: ${reason}, Socket ID: ${socket.id}, Transport: ${socket.io?.engine?.transport?.name || 'unknown'}`);
      lastDisconnectTime = Date.now();
      connectionQuality.reconnectionCount++;
      setIsConnected(false);
      setDisconnectReason(reason);
      setReconnecting(true); // Show reconnecting state immediately
      setHasAttemptedConnection(true); // Mark that we've attempted connection
      
      // Log problematic disconnects
      if (reason === 'ping timeout' || reason === 'transport close' || reason === 'client namespace disconnect') {
        console.log(`[${new Date().toISOString()}] [CLIENT] Problematic disconnect detected: ${reason}, Connection quality: Pings: ${connectionQuality.totalPings}, Pongs: ${connectionQuality.totalPongs}, Latency: ${connectionQuality.lastLatency}ms, Reconnections: ${connectionQuality.reconnectionCount}`);
      }
      
      // Set a timeout to show disconnection message if reconnecting takes too long
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      const timeout = setTimeout(() => {
        console.log(`[${new Date().toISOString()}] [CLIENT] Reconnection timeout - showing disconnection message`);
        setReconnecting(false);
        setIsConnected(false);
        setReconnectTimeout(null); // Clear the timeout reference
      }, 10000); // Reduced to 10 seconds timeout for faster feedback
      
      setReconnectTimeout(timeout);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Reconnected to server after ${attemptNumber} attempts, New Socket ID: ${socket.id}, Transport: ${socket.io.engine.transport.name}`);
      setReconnecting(false);
      setError('');
      setDisconnectReason('');
      setHasAttemptedConnection(true);
      
      // Clear the reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
      
      // Log reconnection success
      console.log(`[${new Date().toISOString()}] [CLIENT] Reconnection successful, Connection quality: Pings: ${connectionQuality.totalPings}, Pongs: ${connectionQuality.totalPongs}, Latency: ${connectionQuality.lastLatency}ms, Total reconnections: ${connectionQuality.reconnectionCount}`);
      
      // Try to rejoin game if we have current state
      if (gameId && playerName) {
        console.log(`[${new Date().toISOString()}] [CLIENT] Reconnected, rejoining game ${gameId} as ${playerName}...`);
        // Add a small delay to ensure connection is stable
        setTimeout(() => {
          socket.emit('join-game', {
            gameId: gameId,
            playerName: playerName,
            isWatcher: isWatcher
          });
        }, 500); // Reduced delay for faster rejoin
      }
    });

    socket.on('reconnecting', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] Reconnecting... attempt ${attemptNumber}`);
      setReconnecting(true);
      setHasAttemptedConnection(true);
      
      // Clear any existing timeout and set a new one
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      // Exponential backoff for timeout - longer timeout for later attempts
      const timeoutDuration = Math.min(10000 + (attemptNumber * 5000), 30000);
      
      const timeout = setTimeout(() => {
        console.log(`[${new Date().toISOString()}] Reconnection timeout after ${timeoutDuration}ms - showing disconnection message`);
        setReconnecting(false);
        setIsConnected(false);
        setReconnectTimeout(null); // Clear the timeout reference
      }, timeoutDuration);
      
      setReconnectTimeout(timeout);
    });

    socket.on('reconnect_error', (error) => {
      console.error(`[${new Date().toISOString()}] Reconnection error:`, error);
      setError('Connection lost. Attempting to reconnect...');
      setHasAttemptedConnection(true);
    });

    socket.on('reconnect_failed', () => {
      console.error(`[${new Date().toISOString()}] Failed to reconnect`);
      setError('Failed to reconnect. Please refresh the page.');
      setReconnecting(false);
      setHasAttemptedConnection(true);
      
      // Clear the reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        setReconnectTimeout(null);
      }
    });

    // Reconnection attempt handling
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] Reconnection attempt ${attemptNumber}`);
      setReconnecting(true);
    });

    // Handle transport errors specifically
    socket.on('connect_error', (error) => {
      console.error(`[${new Date().toISOString()}] Connection error:`, error);
      setHasAttemptedConnection(true);
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

    // Improved heartbeat mechanism with adaptive frequency
    let heartbeatInterval;
    let lastPongTime = Date.now();
    let connectionQuality = { 
      latency: 0, 
      packetLoss: 0, 
      reconnectionCount: 0,
      totalPings: 0,
      totalPongs: 0,
      lastLatency: 0
    };

    // Track pong responses for connection quality monitoring
    socket.on('pong', () => {
      const now = Date.now();
      const latency = now - lastPongTime;
      connectionQuality.latency = latency;
      connectionQuality.lastLatency = latency;
      connectionQuality.totalPongs++;
      lastPongTime = now;
      
      // Log high latency
      if (latency > 2000) {
        console.log(`[${new Date().toISOString()}] [CLIENT] High latency detected: ${latency}ms`);
      }
    });
    
    const sendPing = () => {
      if (socket.connected) {
        connectionQuality.totalPings++;
        socket.emit('ping');
        // Only log ping every 10th ping to reduce noise
        if (connectionQuality.totalPings % 10 === 0) {
          console.log(`[${new Date().toISOString()}] [CLIENT] Sent ping, Total pings: ${connectionQuality.totalPings}, Total pongs: ${connectionQuality.totalPongs}, Last latency: ${connectionQuality.lastLatency}ms`);
        }
      }
    };
    
    // Start with 15-second heartbeat (aligned with server)
    heartbeatInterval = setInterval(sendPing, 15000);

    // Connection monitoring - less aggressive
    let lastDisconnectTime = 0;
    const connectionCheck = setInterval(() => {
      if (!socket.connected) {
        const timeSinceDisconnect = Date.now() - lastDisconnectTime;
        // Only attempt reconnection if disconnected for more than 30 seconds
        if (timeSinceDisconnect > 30000 && gameId && playerName) {
          console.log(`[${new Date().toISOString()}] Connection lost for ${timeSinceDisconnect}ms, attempting reconnection...`);
          socket.connect();
        }
      }
    }, 15000); // Check every 15 seconds

    // Browser visibility change handlers for better connection management
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App went to background - reduce ping frequency
        if (socket.connected) {
          // Reduce ping frequency when backgrounded
          clearInterval(heartbeatInterval);
          heartbeatInterval = setInterval(sendPing, 60000); // 1 minute when backgrounded
        }
      } else {
        // App came to foreground - check connection and reconnect if needed
        console.log(`[${new Date().toISOString()}] App came to foreground, checking connection...`);
        
        // Resume normal ping frequency
        clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(sendPing, 30000); // 30 seconds when foregrounded
        
        if (!socket.connected) {
          console.log(`[${new Date().toISOString()}] Not connected, attempting reconnection...`);
          lastDisconnectTime = Date.now();
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
      // Clean up on page unload
      if (socket.connected) {
        socket.disconnect();
      }
    };

    // Network quality detection
    const detectNetworkQuality = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        console.log(`[${new Date().toISOString()}] Network type: ${connection.effectiveType}, downlink: ${connection.downlink}Mbps`);
        
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          // Use polling only for slow connections
          console.log(`[${new Date().toISOString()}] Slow connection detected, switching to polling transport`);
          socket.io.opts.transports = ['polling'];
        } else if (connection.effectiveType === '3g') {
          // Use websocket with polling fallback
          socket.io.opts.transports = ['websocket', 'polling'];
        } else {
          // Use websocket first for fast connections
          socket.io.opts.transports = ['websocket', 'polling'];
        }
      }
    };

    // Detect network quality on load
    detectNetworkQuality();

    // Add browser event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(connectionCheck);
      // Clear reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      // Remove browser event listeners
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
        {!isConnected && hasAttemptedConnection && (
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
                style={{ marginRight: '10px', backgroundColor: '#28a745' }}
              >
                Test Reconnect
              </button>
              <button 
                onClick={() => {
                  console.log('Manually triggering reconnection timeout...');
                  setReconnecting(true);
                  const timeout = setTimeout(() => {
                    console.log(`[${new Date().toISOString()}] Manual timeout - showing disconnection message`);
                    setReconnecting(false);
                    setIsConnected(false);
                    setReconnectTimeout(null);
                  }, 2000); // 2 seconds for testing
                  setReconnectTimeout(timeout);
                }}
                className="btn btn-sm"
                style={{ backgroundColor: '#ffc107', color: '#000' }}
              >
                Test Timeout (2s)
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
      {!isConnected && hasAttemptedConnection && (
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
