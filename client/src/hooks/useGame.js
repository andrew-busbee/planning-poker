import { useState, useEffect, useCallback, useRef } from 'react';
import { socketService } from '../services/socketService';
import logger from '../utils/logger';

export const useGame = () => {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isWatcher, setIsWatcher] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for timeout management
  const joinTimeoutRef = useRef(null);
  const autoReconnectTimeoutRef = useRef(null);
  const joinInProgressRef = useRef(false);

  // Clear timeouts helper
  const clearTimeouts = useCallback(() => {
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current);
      joinTimeoutRef.current = null;
    }
    if (autoReconnectTimeoutRef.current) {
      clearTimeout(autoReconnectTimeoutRef.current);
      autoReconnectTimeoutRef.current = null;
    }
    joinInProgressRef.current = false;
  }, []);

  // Save game data to localStorage
  const saveGameData = useCallback((data) => {
    try {
      localStorage.setItem('planningPokerGameData', JSON.stringify(data));
      sessionStorage.setItem('wasInGame', 'true');
      logger.debug(`[GAME] Saved game data:`, data);
    } catch (error) {
      logger.error(`[GAME] Failed to save game data:`, error);
    }
  }, []);

  // Load game data from localStorage
  const loadGameData = useCallback(() => {
    try {
      const savedData = localStorage.getItem('planningPokerGameData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Validate the data structure
        if (parsed && typeof parsed === 'object' && 
            typeof parsed.gameId === 'string' && 
            typeof parsed.playerName === 'string' &&
            typeof parsed.isWatcher === 'boolean') {
          return parsed;
        } else {
          localStorage.removeItem('planningPokerGameData');
        }
      }
    } catch (error) {
      logger.error(`[GAME] Failed to load game data:`, error);
      localStorage.removeItem('planningPokerGameData');
    }
    return null;
  }, []);

  // Clear game data from localStorage
  const clearGameData = useCallback(() => {
    localStorage.removeItem('planningPokerGameData');
    sessionStorage.removeItem('wasInGame');
    logger.debug('[GAME] Cleared saved game data');
  }, []);

  // Join game with timeout
  const joinGameWithTimeout = useCallback((gameData, timeoutMs = 10000) => {
    // Prevent duplicate join attempts at the socket level
    if (joinInProgressRef.current) {
      logger.debug('[GAME] Join already in progress, skipping duplicate attempt');
      return;
    }
    
    clearTimeouts();
    joinInProgressRef.current = true;
    
    setIsLoading(true);
    setError('');
    
    // Set timeout for join request
    joinTimeoutRef.current = setTimeout(() => {
      setError('Failed to join game - server did not respond. Please try again.');
      setIsLoading(false);
      joinInProgressRef.current = false;
      logger.warn('[GAME] Join game timeout');
    }, timeoutMs);

    try {
      socketService.joinGame(gameData);
      logger.info(`[GAME] Attempting to join game:`, gameData);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
      joinInProgressRef.current = false;
      clearTimeouts();
    }
  }, [clearTimeouts]);

  // Create game
  const createGame = useCallback((gameData) => {
    clearTimeouts();
    setIsLoading(true);
    setError('');
    setPlayerName(gameData.playerName);
    setIsWatcher(gameData.isWatcher);
    
    // Save name to localStorage for future use
    localStorage.setItem('planningPokerPlayerName', gameData.playerName);
    
    try {
      socketService.createGame(gameData);
      logger.info(`[GAME] Creating game:`, gameData);
    } catch (error) {
      setError(error.message);
      setIsLoading(false);
    }
  }, [clearTimeouts]);

  // Join existing game
  const joinGame = useCallback((gameData) => {
    clearTimeouts();
    setPlayerName(gameData.playerName);
    setIsWatcher(gameData.isWatcher);
    setGameId(gameData.gameId);
    
    // Save name to localStorage for future use
    localStorage.setItem('planningPokerPlayerName', gameData.playerName);
    
    joinGameWithTimeout(gameData);
  }, [joinGameWithTimeout, clearTimeouts]);

  // Leave game
  const leaveGame = useCallback(() => {
    clearTimeouts();
    
    if (gameId) {
      try {
        socketService.leaveGame(gameId);
      } catch (error) {
        logger.error(`[GAME] Error leaving game:`, error);
      }
    }
    
    clearGameData();
    setGame(null);
    setGameId(null);
    setPlayerName('');
    setIsWatcher(false);
    setError('');
    setIsLoading(false);
    
    // Update URL to remove game parameter
    window.history.pushState({}, '', '/');
    logger.info('[GAME] Left game');
  }, [gameId, clearTimeouts, clearGameData]);

  // Auto-reconnect to saved game
  const autoReconnect = useCallback((savedGameData) => {
    if (!savedGameData) return;
    
    logger.info(`[GAME] Auto-reconnecting to saved game:`, savedGameData);
    
    setPlayerName(savedGameData.playerName);
    setIsWatcher(savedGameData.isWatcher);
    setGameId(savedGameData.gameId);
    setIsLoading(true);
    setError('');
    
    // Set auto-reconnect timeout
    autoReconnectTimeoutRef.current = setTimeout(() => {
      setError('Failed to reconnect to game. Please try joining manually.');
      setIsLoading(false);
      logger.warn('[GAME] Auto-reconnect timeout');
    }, 15000);
    
    // Try to join immediately if socket is connected
    if (socketService.isConnected()) {
      setTimeout(() => {
        joinGameWithTimeout({
          gameId: savedGameData.gameId,
          playerName: savedGameData.playerName,
          isWatcher: savedGameData.isWatcher
        });
      }, 100);
    }
  }, [joinGameWithTimeout]);

  // Auto-reconnect to URL game
  const autoReconnectToUrl = useCallback((urlGameId) => {
    logger.info(`[GAME] Auto-reconnecting to URL game:`, urlGameId);
    
    setGameId(urlGameId);
    setIsLoading(true);
    setError('');
    
    // Set auto-reconnect timeout
    autoReconnectTimeoutRef.current = setTimeout(() => {
      setError('Failed to reconnect to game. Please try joining manually.');
      setIsLoading(false);
      logger.warn('[GAME] Auto-reconnect timeout');
    }, 15000);
    
    // Use saved player name if available
    const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
    
    // Try to join immediately if socket is connected
    if (socketService.isConnected()) {
      setTimeout(() => {
        joinGameWithTimeout({
          gameId: urlGameId,
          playerName: savedPlayerName,
          isWatcher: false // Default to player, user can toggle later
        });
      }, 100);
    }
  }, [joinGameWithTimeout]);

  // Setup socket event listeners
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleGameCreated = (data) => {
      logger.info(`[GAME] Game created:`, data);
      setGameId(data.gameId);
      setGame(data.game);
      setError('');
      setIsLoading(false);
      clearTimeouts();
      
      // Update URL immediately with game ID
      window.history.pushState({}, '', `?game=${data.gameId}`);
      
      // Save complete game data to localStorage
      saveGameData({
        gameId: data.gameId,
        playerName: playerName,
        isWatcher: isWatcher,
        lastActivity: new Date().toISOString()
      });
    };

    const handlePlayerJoined = (gameState) => {
      logger.info(`[GAME] Player joined successfully:`, gameState);
      setGame(gameState);
      setError('');
      setIsLoading(false);
      clearTimeouts();
      
      // Update URL immediately with game ID if we have one
      if (gameId) {
        window.history.pushState({}, '', `?game=${gameId}`);
      }
      
      // Sync local isWatcher state with server state
      const currentSocketId = socketService.getSocket()?.id;
      if (currentSocketId) {
        const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
        if (currentPlayer) {
          logger.debug(`[GAME] Player joined - syncing local isWatcher to: ${currentPlayer.isWatcher} for player: ${currentPlayer.name}`);
          setIsWatcher(currentPlayer.isWatcher);
          
          // Save complete game data to localStorage with the correct server state
          if (gameId && playerName) {
            saveGameData({
              gameId: gameId,
              playerName: playerName,
              isWatcher: currentPlayer.isWatcher, // Use server state, not local state
              lastActivity: new Date().toISOString()
            });
          }
        } else {
          logger.warn(`[GAME] Player joined - could not find current player with socket ID: ${currentSocketId}`);
          // Fallback: save with current local state if we can't find the player
          if (gameId && playerName) {
            saveGameData({
              gameId: gameId,
              playerName: playerName,
              isWatcher: isWatcher,
              lastActivity: new Date().toISOString()
            });
          }
        }
      } else {
        logger.warn('[GAME] Player joined - no socket ID available');
        // Fallback: save with current local state if no socket ID
        if (gameId && playerName) {
          saveGameData({
            gameId: gameId,
            playerName: playerName,
            isWatcher: isWatcher,
            lastActivity: new Date().toISOString()
          });
        }
      }
    };

    const handleVoteCast = (gameState) => {
      setGame(gameState);
    };

    const handleVotesRevealed = (gameState) => {
      setGame(gameState);
    };

    const handleGameReset = (gameState) => {
      setGame(gameState);
    };

    const handleDeckChanged = (gameState) => {
      setGame(gameState);
    };

    const handleRoleToggled = (gameState) => {
      setGame(gameState);
      // Update isWatcher state for current player
      // Find the current player by matching the socket ID from the socket service
      const currentSocketId = socketService.getSocket()?.id;
      if (currentSocketId) {
        const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
        if (currentPlayer) {
          logger.debug(`[GAME] Role toggle - updating local isWatcher to: ${currentPlayer.isWatcher} for player: ${currentPlayer.name}`);
          setIsWatcher(currentPlayer.isWatcher);
          
          // Update localStorage with the new role
          if (gameId && playerName) {
            saveGameData({
              gameId: gameId,
              playerName: playerName,
              isWatcher: currentPlayer.isWatcher, // Use server state
              lastActivity: new Date().toISOString()
            });
          }
        } else {
          logger.warn(`[GAME] Role toggle - could not find current player with socket ID: ${currentSocketId}`);
        }
      } else {
        logger.warn('[GAME] Role toggle - no socket ID available');
      }
    };


    const handlePlayerLeft = (gameState) => {
      setGame(gameState);
      
      // Sync local isWatcher state with server state when a player leaves
      const currentSocketId = socketService.getSocket()?.id;
      if (currentSocketId) {
        const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
        if (currentPlayer) {
          logger.debug(`[GAME] Player left - syncing local isWatcher to: ${currentPlayer.isWatcher} for player: ${currentPlayer.name}`);
          setIsWatcher(currentPlayer.isWatcher);
          
          // Update localStorage with the correct server state
          if (gameId && playerName) {
            saveGameData({
              gameId: gameId,
              playerName: playerName,
              isWatcher: currentPlayer.isWatcher, // Use server state, not local state
              lastActivity: new Date().toISOString()
            });
          }
        } else {
          logger.warn(`[GAME] Player left - could not find current player with socket ID: ${currentSocketId}`);
        }
      } else {
        logger.warn('[GAME] Player left - no socket ID available');
      }
    };

    const handleCustomDeckCreated = (gameState) => {
      setGame(gameState);
    };

    const handleCustomDeckEdited = (gameState) => {
      setGame(gameState);
    };

    const handlePlayerNameChanged = (gameState) => {
      setGame(gameState);
      
      // Update local storage with the new name if it's the current player
      const currentSocketId = socketService.getSocket()?.id;
      if (currentSocketId) {
        const currentPlayer = gameState.players.find(p => p.id === currentSocketId);
        if (currentPlayer && currentPlayer.name !== playerName) {
          logger.info(`[GAME] Player name changed locally: ${playerName} -> ${currentPlayer.name}`);
          setPlayerName(currentPlayer.name);
          
          // Update localStorage with the new name
          const savedGameData = loadGameData();
          if (savedGameData) {
            savedGameData.playerName = currentPlayer.name;
            saveGameData(savedGameData);
          }
          
          // Also save the name separately for future games
          localStorage.setItem('planningPokerPlayerName', currentPlayer.name);
        }
      }
    };

    const handleError = (error) => {
      logger.error(`[GAME] Socket error received:`, error.message);
      setError(error.message);
      setIsLoading(false);
      clearTimeouts();
      
      // If the error is "Game not found" and we have saved game data, clear it
      if (error.message === 'Game not found.') {
        clearGameData();
        setGameId(null);
        setPlayerName('');
        setIsWatcher(false);
        setGame(null);
        // Update URL to remove game parameter
        window.history.pushState({}, '', '/');
      }
    };

    // Add event listeners
    socket.on('game-created', handleGameCreated);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('vote-cast', handleVoteCast);
    socket.on('votes-revealed', handleVotesRevealed);
    socket.on('game-reset', handleGameReset);
    socket.on('deck-changed', handleDeckChanged);
    socket.on('role-toggled', handleRoleToggled);
    socket.on('player-left', handlePlayerLeft);
    socket.on('custom-deck-created', handleCustomDeckCreated);
    socket.on('custom-deck-edited', handleCustomDeckEdited);
    socket.on('player-name-changed', handlePlayerNameChanged);
    socket.on('error', handleError);

    // Cleanup
    return () => {
      socket.off('game-created', handleGameCreated);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('vote-cast', handleVoteCast);
      socket.off('votes-revealed', handleVotesRevealed);
      socket.off('game-reset', handleGameReset);
      socket.off('deck-changed', handleDeckChanged);
      socket.off('role-toggled', handleRoleToggled);
      socket.off('player-left', handlePlayerLeft);
      socket.off('custom-deck-created', handleCustomDeckCreated);
      socket.off('custom-deck-edited', handleCustomDeckEdited);
      socket.off('player-name-changed', handlePlayerNameChanged);
      socket.off('error', handleError);
    };
  }, [playerName, isWatcher, gameId, clearTimeouts, saveGameData, clearGameData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    // State
    game,
    gameId,
    playerName,
    isWatcher,
    error,
    isLoading,
    
    // Actions
    createGame,
    joinGame,
    leaveGame,
    autoReconnect,
    autoReconnectToUrl,
    
    // Utilities
    loadGameData,
    saveGameData,
    clearGameData,
    
    // State setters for GameProvider
    setGameIdForJoin: setGameId,
    setIsLoading
  };
};



