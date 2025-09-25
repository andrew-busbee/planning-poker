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
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);
  const [autoReconnectTimeout, setAutoReconnectTimeout] = useState(null);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [joinGameTimeout, setJoinGameTimeout] = useState(null);

  // Helper function to join game with timeout
  const joinGameWithTimeout = (gameData, timeoutMs = 10000) => {
    console.log(`[${new Date().toISOString()}] [CLIENT] Attempting to join game with timeout: ${timeoutMs}ms`);
    
    // Clear any existing join timeout
    if (joinGameTimeout) {
      clearTimeout(joinGameTimeout);
      setJoinGameTimeout(null);
    }
    
    // Set a timeout for the join request
    const timeout = setTimeout(() => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Join game timeout - no response from server`);
      setError('Failed to join game - server did not respond. Please try again.');
      setIsAutoReconnecting(false);
      setJoinGameTimeout(null);
    }, timeoutMs);
    setJoinGameTimeout(timeout);
    
    // Attempt to join the game
    socket.emit('join-game', gameData);
  };

  useEffect(() => {
    // Check if there's a game ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('game');
    
    // Check for saved game data
    const savedGameData = localStorage.getItem('planningPokerGameData');
    let savedGame = null;
    if (savedGameData) {
      try {
        const parsed = JSON.parse(savedGameData);
        // Validate the data structure
        if (parsed && typeof parsed === 'object' && 
            typeof parsed.gameId === 'string' && 
            typeof parsed.playerName === 'string' &&
            typeof parsed.isWatcher === 'boolean') {
          savedGame = parsed;
          console.log(`[${new Date().toISOString()}] Found valid saved game data:`, savedGame);
        } else {
          console.error(`[${new Date().toISOString()}] Invalid saved game data structure:`, parsed);
          localStorage.removeItem('planningPokerGameData');
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error parsing saved game data:`, error);
        localStorage.removeItem('planningPokerGameData');
      }
    }
    
    console.log(`[${new Date().toISOString()}] Simple refresh logic - urlGameId: ${urlGameId}, savedGame: ${savedGame ? savedGame.gameId : 'none'}`);
    
    // SIMPLE LOGIC: 
    // 1. If URL has game ID, use it
    // 2. If no URL game ID but we have saved game data, redirect to saved game
    // 3. Otherwise show create page
    
    if (urlGameId) {
      // URL has a game ID - we're in a game
      console.log(`[${new Date().toISOString()}] URL has game ID: ${urlGameId}`);
      console.log(`[${new Date().toISOString()}] Saved game data:`, savedGame);
      
      if (savedGame && savedGame.gameId === urlGameId) {
        // We have matching saved data - auto-reconnect
        console.log(`[${new Date().toISOString()}] Auto-reconnecting to game ${urlGameId}`);
        setPlayerName(savedGame.playerName || '');
        setIsWatcher(savedGame.isWatcher || false);
        setGameId(urlGameId);
        setIsAutoReconnecting(true);
        
        // Set a timeout for auto-reconnect (15 seconds)
        const timeout = setTimeout(() => {
          console.log(`[${new Date().toISOString()}] [CLIENT] Auto-reconnect timeout - showing join page for game ${urlGameId}`);
          console.log(`[${new Date().toISOString()}] [CLIENT] Socket connected: ${socket.connected}, Socket ID: ${socket.id}`);
          setIsAutoReconnecting(false);
          setAutoReconnectTimeout(null);
        }, 15000);
        setAutoReconnectTimeout(timeout);
        
        // Auto-reconnect immediately if socket is already connected
        if (socket.connected) {
          setTimeout(() => {
            joinGameWithTimeout({
              gameId: savedGame.gameId,
              playerName: savedGame.playerName,
              isWatcher: savedGame.isWatcher
            });
          }, 100);
        }
      } else {
        // No saved data or different game - try to auto-reconnect to the URL game
        console.log(`[${new Date().toISOString()}] No matching saved data - attempting auto-reconnect to game ${urlGameId}`);
        console.log(`[${new Date().toISOString()}] Setting gameId to: ${urlGameId}`);
        setGameId(urlGameId);
        setIsAutoReconnecting(true);
        
        // Set a timeout for auto-reconnect (15 seconds)
        const timeout = setTimeout(() => {
          console.log(`[${new Date().toISOString()}] [CLIENT] Auto-reconnect timeout - showing join page for game ${urlGameId}`);
          console.log(`[${new Date().toISOString()}] [CLIENT] Socket connected: ${socket.connected}, Socket ID: ${socket.id}`);
          setIsAutoReconnecting(false);
          setAutoReconnectTimeout(null);
        }, 15000);
        setAutoReconnectTimeout(timeout);
        
        // Try to auto-reconnect immediately if socket is already connected
        if (socket.connected && !hasAttemptedJoin) {
          // Use saved player name if available, otherwise use empty string
          const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
          console.log(`[${new Date().toISOString()}] [CLIENT] Socket already connected, attempting immediate join to game ${urlGameId}`);
          setHasAttemptedJoin(true);
          setTimeout(() => {
            joinGameWithTimeout({
              gameId: urlGameId,
              playerName: savedPlayerName,
              isWatcher: false // Default to player, user can toggle later
            });
          }, 100);
        } else if (!socket.connected) {
          console.log(`[${new Date().toISOString()}] [CLIENT] Socket not connected yet, will auto-reconnect when connection is established`);
        } else {
          console.log(`[${new Date().toISOString()}] [CLIENT] Already attempted join, skipping duplicate attempt`);
        }
        // Don't return here - let it fall through to show auto-reconnect state
      }
    } else {
      // No URL game ID - always show create page (don't auto-redirect to saved games)
      console.log(`[${new Date().toISOString()}] Showing create page - no game ID in URL`);
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
      
      // Auto-reconnect to saved game if we're in auto-reconnect mode
      if (isAutoReconnecting && !game) {
        const savedGameData = localStorage.getItem('planningPokerGameData');
        if (savedGameData) {
          try {
            const gameData = JSON.parse(savedGameData);
            console.log(`[${new Date().toISOString()}] [CLIENT] Auto-reconnecting to saved game: ${gameData.gameId} as ${gameData.playerName} (${gameData.isWatcher ? 'watcher' : 'player'})`);
            // Add a small delay to ensure connection is stable
            setTimeout(() => {
              joinGameWithTimeout({
                gameId: gameData.gameId,
                playerName: gameData.playerName,
                isWatcher: gameData.isWatcher
              });
            }, 200);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Error parsing saved game data for auto-reconnect:`, error);
            setIsAutoReconnecting(false);
            // Clear timeout if it exists
            if (autoReconnectTimeout) {
              clearTimeout(autoReconnectTimeout);
              setAutoReconnectTimeout(null);
            }
          }
        } else if (gameId && !hasAttemptedJoin) {
          // No saved game data but we have a gameId from URL - try to reconnect
          console.log(`[${new Date().toISOString()}] [CLIENT] No saved game data, but attempting to reconnect to URL game: ${gameId}`);
          setHasAttemptedJoin(true);
          const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
          setTimeout(() => {
            joinGameWithTimeout({
              gameId: gameId,
              playerName: savedPlayerName,
              isWatcher: false // Default to player, user can toggle later
            });
          }, 200);
        } else {
          console.log(`[${new Date().toISOString()}] [CLIENT] No saved game data and no gameId, clearing auto-reconnect flag`);
          setIsAutoReconnecting(false);
          // Clear timeout if it exists
          if (autoReconnectTimeout) {
            clearTimeout(autoReconnectTimeout);
            setAutoReconnectTimeout(null);
          }
        }
      }
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
      
      // Try to rejoin game if we have current state or are auto-reconnecting
      if (isAutoReconnecting && !game) {
        // We're in auto-reconnect mode, use saved game data
        const savedGameData = localStorage.getItem('planningPokerGameData');
        if (savedGameData) {
          try {
            const gameData = JSON.parse(savedGameData);
            console.log(`[${new Date().toISOString()}] [CLIENT] Reconnected, auto-rejoining game ${gameData.gameId} as ${gameData.playerName}...`);
            setTimeout(() => {
              joinGameWithTimeout({
                gameId: gameData.gameId,
                playerName: gameData.playerName,
                isWatcher: gameData.isWatcher
              });
            }, 200);
          } catch (error) {
            console.error(`[${new Date().toISOString()}] Error parsing saved game data on reconnect:`, error);
            setIsAutoReconnecting(false);
            // Clear timeout if it exists
            if (autoReconnectTimeout) {
              clearTimeout(autoReconnectTimeout);
              setAutoReconnectTimeout(null);
            }
          }
        } else if (gameId) {
          // No saved game data but we have a gameId from URL - try to reconnect
          console.log(`[${new Date().toISOString()}] [CLIENT] Reconnected, attempting to rejoin URL game ${gameId}...`);
          const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
          setTimeout(() => {
            joinGameWithTimeout({
              gameId: gameId,
              playerName: savedPlayerName,
              isWatcher: false // Default to player, user can toggle later
            });
          }, 200);
        } else {
          setIsAutoReconnecting(false);
          // Clear timeout if it exists
          if (autoReconnectTimeout) {
            clearTimeout(autoReconnectTimeout);
            setAutoReconnectTimeout(null);
          }
        }
      } else if (gameId && playerName && !game) {
        // Fallback: try to rejoin with current state
        console.log(`[${new Date().toISOString()}] [CLIENT] Reconnected, rejoining game ${gameId} as ${playerName}...`);
        setTimeout(() => {
          joinGameWithTimeout({
            gameId: gameId,
            playerName: playerName,
            isWatcher: isWatcher
          });
        }, 200);
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
      
      // Update URL immediately with game ID
      window.history.pushState({}, '', `?game=${data.gameId}`);
      
      // Save complete game data to localStorage for auto-reconnection
      const gameData = {
        gameId: data.gameId,
        playerName: playerName,
        isWatcher: isWatcher,
        lastActivity: new Date().toISOString()
      };
      localStorage.setItem('planningPokerGameData', JSON.stringify(gameData));
      // Mark that user is in a game for refresh detection
      sessionStorage.setItem('wasInGame', 'true');
      console.log(`[${new Date().toISOString()}] [CLIENT] Saved game data to localStorage:`, gameData);
    });

    socket.on('player-joined', (gameState) => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Player joined successfully, game state received`);
      setGame(gameState);
      setError('');
      setIsAutoReconnecting(false); // Clear auto-reconnecting flag
      setHasAttemptedJoin(false); // Reset join attempt flag
      
      // Clear auto-reconnect timeout if it exists
      if (autoReconnectTimeout) {
        clearTimeout(autoReconnectTimeout);
        setAutoReconnectTimeout(null);
      }
      
      // Clear join game timeout if it exists
      if (joinGameTimeout) {
        clearTimeout(joinGameTimeout);
        setJoinGameTimeout(null);
      }
      
      // Update URL immediately with game ID if we have one
      if (gameId) {
        window.history.pushState({}, '', `?game=${gameId}`);
      }
      
      // Save complete game data to localStorage for auto-reconnection
      if (gameId && playerName) {
        const gameData = {
          gameId: gameId,
          playerName: playerName,
          isWatcher: isWatcher,
          lastActivity: new Date().toISOString()
        };
        localStorage.setItem('planningPokerGameData', JSON.stringify(gameData));
        // Mark that user is in a game for refresh detection
        sessionStorage.setItem('wasInGame', 'true');
        console.log(`[${new Date().toISOString()}] [CLIENT] Updated game data in localStorage:`, gameData);
      }
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
      console.log(`[${new Date().toISOString()}] [CLIENT] Socket error received: ${error.message}`);
      setError(error.message);
      setIsAutoReconnecting(false); // Clear auto-reconnecting flag
      setHasAttemptedJoin(false); // Reset join attempt flag
      
      // Clear auto-reconnect timeout if it exists
      if (autoReconnectTimeout) {
        clearTimeout(autoReconnectTimeout);
        setAutoReconnectTimeout(null);
      }
      // Clear join game timeout if it exists
      if (joinGameTimeout) {
        clearTimeout(joinGameTimeout);
        setJoinGameTimeout(null);
      }
      
      // If the error is "Game not found" and we have saved game data, clear it
      if (error.message === 'Game not found.') {
        const savedGameData = localStorage.getItem('planningPokerGameData');
        if (savedGameData) {
          console.log(`[${new Date().toISOString()}] [CLIENT] Game not found, clearing saved game data`);
          localStorage.removeItem('planningPokerGameData');
          sessionStorage.removeItem('wasInGame');
          setGameId(null);
          setPlayerName('');
          setIsWatcher(false);
          setGame(null);
          // Update URL to remove game parameter
          window.history.pushState({}, '', '/');
        }
      }
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
          // Already connected, try to rejoin immediately if we're auto-reconnecting
          if (isAutoReconnecting && !game) {
            const savedGameData = localStorage.getItem('planningPokerGameData');
            if (savedGameData) {
              try {
                const gameData = JSON.parse(savedGameData);
                console.log(`[${new Date().toISOString()}] Already connected, auto-rejoining game immediately...`);
                joinGameWithTimeout({
                  gameId: gameData.gameId,
                  playerName: gameData.playerName,
                  isWatcher: gameData.isWatcher
                });
              } catch (error) {
                console.error(`[${new Date().toISOString()}] Error parsing saved game data on visibility change:`, error);
                setIsAutoReconnecting(false);
                // Clear timeout if it exists
                if (autoReconnectTimeout) {
                  clearTimeout(autoReconnectTimeout);
                  setAutoReconnectTimeout(null);
                }
              }
            } else if (gameId) {
              // No saved game data but we have a gameId from URL - try to reconnect
              console.log(`[${new Date().toISOString()}] Already connected, attempting to rejoin URL game immediately...`);
              const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
              joinGameWithTimeout({
                gameId: gameId,
                playerName: savedPlayerName,
                isWatcher: false // Default to player, user can toggle later
              });
            } else {
              setIsAutoReconnecting(false);
              // Clear timeout if it exists
              if (autoReconnectTimeout) {
                clearTimeout(autoReconnectTimeout);
                setAutoReconnectTimeout(null);
              }
            }
          } else if (gameId && playerName && !game) {
            // Fallback: try to rejoin with current state
            console.log(`[${new Date().toISOString()}] Already connected, rejoining game immediately...`);
            joinGameWithTimeout({
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
      // If we're in a game, mark that we were in a game for refresh detection
      // Check both gameId state and saved game data to be more reliable
      const savedGameData = localStorage.getItem('planningPokerGameData');
      let currentGameId = gameId;
      if (!currentGameId && savedGameData) {
        try {
          const parsedSavedGame = JSON.parse(savedGameData);
          currentGameId = parsedSavedGame.gameId;
        } catch (error) {
          // Ignore parsing errors
        }
      }
      if (currentGameId) {
        sessionStorage.setItem('wasInGame', 'true');
        console.log(`[${new Date().toISOString()}] [CLIENT] Marking wasInGame=true before unload for game ${currentGameId}`);
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

    // Handle browser navigation (back/forward buttons)
    const handlePopState = (event) => {
      console.log(`[${new Date().toISOString()}] [CLIENT] Browser navigation detected, checking URL...`);
      const urlParams = new URLSearchParams(window.location.search);
      const urlGameId = urlParams.get('game');
      
      if (urlGameId !== gameId) {
        console.log(`[${new Date().toISOString()}] [CLIENT] URL changed from ${gameId} to ${urlGameId}, updating state...`);
        // Clear current game state
        setGame(null);
        setGameId(null);
        setPlayerName('');
        setIsWatcher(false);
        setError('');
        setIsAutoReconnecting(false);
        
        // Clear timeouts
        if (autoReconnectTimeout) {
          clearTimeout(autoReconnectTimeout);
          setAutoReconnectTimeout(null);
        }
        
        // Trigger a page reload to handle the new URL properly
        window.location.reload();
      }
    };

    // Add browser event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(connectionCheck);
      // Clear reconnection timeout
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      // Clear auto-reconnect timeout
      if (autoReconnectTimeout) {
        clearTimeout(autoReconnectTimeout);
      }
      // Clear join game timeout
      if (joinGameTimeout) {
        clearTimeout(joinGameTimeout);
      }
      // Remove browser event listeners
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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

  // Simple effect to ensure URL is updated when gameId changes
  useEffect(() => {
    if (gameId && !isAutoReconnecting) {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('game') !== gameId) {
        window.history.pushState({}, '', `?game=${gameId}`);
        console.log(`[${new Date().toISOString()}] Updated URL to include game ID: ${gameId}`);
      }
    }
  }, [gameId, isAutoReconnecting]);

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
    joinGameWithTimeout(data);
  };

  const handleLeaveGame = () => {
    // Notify server that player is leaving
    if (gameId) {
      socket.emit('leave-game', { gameId });
    }
    
    // Clear saved game data from localStorage
    localStorage.removeItem('planningPokerGameData');
    // Clear session flag since user is no longer in a game
    sessionStorage.removeItem('wasInGame');
    console.log(`[${new Date().toISOString()}] [CLIENT] Cleared saved game data on leave`);
    
    setGameId(null);
    setGame(null);
    setPlayerName('');
    setIsWatcher(false);
    setError('');
    setIsAutoReconnecting(false); // Clear auto-reconnecting flag
    // Update URL to remove game parameter
    window.history.pushState({}, '', '/');
  };

  const handleToggleRole = () => {
    if (gameId) {
      socket.emit('toggle-role', { gameId });
    }
  };

  console.log(`[${new Date().toISOString()}] Render check - gameId: ${gameId}, game: ${game ? 'exists' : 'null'}, isAutoReconnecting: ${isAutoReconnecting}`);
  
  if (gameId && game) {
    console.log(`[${new Date().toISOString()}] Rendering GameRoom`);
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

  // Show loading state when auto-reconnecting
  if (isAutoReconnecting) {
    console.log(`[${new Date().toISOString()}] Rendering auto-reconnect loading state`);
    const savedGameData = localStorage.getItem('planningPokerGameData');
    let savedGameId = '';
    let displayPlayerName = '';
    
    if (savedGameData) {
      try {
        const gameData = JSON.parse(savedGameData);
        savedGameId = gameData.gameId;
        displayPlayerName = gameData.playerName;
      } catch (error) {
        // Ignore parsing errors
      }
    }
    
    // If no saved game data, use current gameId and saved player name
    if (!savedGameId && gameId) {
      savedGameId = gameId;
      displayPlayerName = localStorage.getItem('planningPokerPlayerName') || 'Player';
    }
    
    return (
      <div>
        <div className="container">
          <ThemeToggle />
          
          <div className="text-center mb-4">
            <h1>Planning Poker</h1>
            <div className="card" style={{ background: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' }}>
              <p>🔄 Reconnecting to your game...</p>
              <p>Please wait while we reconnect you to game <strong>{savedGameId}</strong>{displayPlayerName && ` as ${displayPlayerName}`}</p>
              <button 
                onClick={() => {
                  console.log(`[${new Date().toISOString()}] [CLIENT] Manual cancel auto-reconnect`);
                  setIsAutoReconnecting(false);
                  if (autoReconnectTimeout) {
                    clearTimeout(autoReconnectTimeout);
                    setAutoReconnectTimeout(null);
                  }
                }}
                className="btn btn-sm"
                style={{ marginTop: '10px', backgroundColor: '#dc3545', color: 'white' }}
              >
                Cancel Auto-Reconnect
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  console.log(`[${new Date().toISOString()}] Rendering GameSetup with gameId: ${gameId}`);
  
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
          prefillName={playerName || localStorage.getItem('planningPokerPlayerName') || ''}
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
