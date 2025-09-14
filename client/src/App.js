import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import GameSetup from './components/GameSetup';
import GameRoom from './components/GameRoom';
import ThemeToggle from './components/ThemeToggle';
import Footer from './components/Footer';
import './App.css';

const socket = io();

function App() {
  const [gameId, setGameId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [isWatcher, setIsWatcher] = useState(false);
  const [game, setGame] = useState(null);
  const [error, setError] = useState('');
  const [currentSocketId, setCurrentSocketId] = useState(null);

  useEffect(() => {
    // Check if there's a game ID in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('game');
    if (urlGameId) {
      setGameId(urlGameId);
    }

    // Capture socket ID when connected
    socket.on('connect', () => {
      setCurrentSocketId(socket.id);
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

    return () => {
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
    };
  }, []);

  const handleCreateGame = (data) => {
    setPlayerName(data.playerName);
    setIsWatcher(data.isWatcher);
    socket.emit('create-game', data);
  };

  const handleJoinGame = (data) => {
    setPlayerName(data.playerName);
    setIsWatcher(data.isWatcher);
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
        />
      </div>
      <Footer />
    </div>
  );
}

export default App;
