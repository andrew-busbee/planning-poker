import React, { createContext, useContext, useEffect } from 'react';
import { useConnection } from '../hooks/useConnection';
import { useGame } from '../hooks/useGame';
import { socketService } from '../services/socketService';

const GameContext = createContext();

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const connection = useConnection();
  const game = useGame();

  // Initialize socket connection on mount
  useEffect(() => {
    socketService.connect();
    
    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle URL-based auto-reconnection
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('game');
    
    if (urlGameId) {
      console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] URL has game ID: ${urlGameId}`);
      
      const savedGameData = game.loadGameData();
      
      if (savedGameData && savedGameData.gameId === urlGameId) {
        // We have matching saved data - auto-reconnect
        console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] Auto-reconnecting to saved game`);
        game.autoReconnect(savedGameData);
      } else {
        // No saved data or different game - try to auto-reconnect to the URL game
        console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] Auto-reconnecting to URL game`);
        game.autoReconnectToUrl(urlGameId);
      }
    }
  }, [game]);

  // Handle connection events for auto-reconnection
  useEffect(() => {
    if (connection.isConnected && !game.game && game.gameId && game.isLoading) {
      // Check if there's actually a game parameter in the URL before trying to rejoin
      const urlParams = new URLSearchParams(window.location.search);
      const urlGameId = urlParams.get('game');
      
      // Only try to rejoin if there's a game parameter in the URL
      if (urlGameId && urlGameId === game.gameId) {
        const savedGameData = game.loadGameData();
        
        if (savedGameData && savedGameData.gameId === game.gameId) {
          console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] Connected, auto-rejoining saved game`);
          setTimeout(() => {
            game.joinGame({
              gameId: savedGameData.gameId,
              playerName: savedGameData.playerName,
              isWatcher: savedGameData.isWatcher
            });
          }, 200);
        } else {
          console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] Connected, auto-rejoining URL game`);
          const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
          setTimeout(() => {
            game.joinGame({
              gameId: game.gameId,
              playerName: savedPlayerName,
              isWatcher: false
            });
          }, 200);
        }
      } else {
        // No URL game parameter, clear the game state to prevent infinite loops
        console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] No URL game parameter, clearing game state`);
        game.clearGameData();
        game.leaveGame();
      }
    }
  }, [connection.isConnected, connection.socketId, game.gameId, game.game, game.isLoading]);

  // Handle browser navigation (back/forward buttons)
  useEffect(() => {
    const handlePopState = (event) => {
      console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] Browser navigation detected`);
      const urlParams = new URLSearchParams(window.location.search);
      const urlGameId = urlParams.get('game');
      
      if (urlGameId !== game.gameId) {
        console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] URL changed, reloading page`);
        // Clear current game state and reload to handle the new URL properly
        game.clearGameData();
        window.location.reload();
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [game.gameId, game]);

  // Handle page visibility changes for better connection management
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && connection.isConnected && !game.game && game.gameId && game.isLoading) {
        // Check if there's actually a game parameter in the URL before trying to rejoin
        const urlParams = new URLSearchParams(window.location.search);
        const urlGameId = urlParams.get('game');
        
        // Only try to rejoin if there's a game parameter in the URL
        if (urlGameId && urlGameId === game.gameId) {
          const savedGameData = game.loadGameData();
          
          if (savedGameData && savedGameData.gameId === game.gameId) {
            console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] App came to foreground, auto-rejoining saved game`);
            game.joinGame({
              gameId: savedGameData.gameId,
              playerName: savedGameData.playerName,
              isWatcher: savedGameData.isWatcher
            });
          } else {
            console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] App came to foreground, auto-rejoining URL game`);
            const savedPlayerName = localStorage.getItem('planningPokerPlayerName') || '';
            game.joinGame({
              gameId: game.gameId,
              playerName: savedPlayerName,
              isWatcher: false
            });
          }
        } else {
          // No URL game parameter, clear the game state to prevent infinite loops
          console.log(`[${new Date().toISOString()}] [GAME_PROVIDER] App came to foreground, no URL game parameter, clearing game state`);
          game.clearGameData();
          game.leaveGame();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connection.isConnected, connection.socketId, game.gameId, game.game, game.isLoading]);

  const contextValue = {
    // Connection state
    connection,
    
    // Game state and actions
    game,
    
    // Socket service for direct access if needed
    socketService
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};



