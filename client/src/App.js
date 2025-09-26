import React from 'react';
import { GameProvider, useGameContext } from './components/GameProvider';
import GameSetup from './components/GameSetup';
import GameRoom from './components/GameRoom';
import ThemeToggle from './components/ThemeToggle';
import Footer from './components/Footer';
import './App.css';

// Main App component that uses the GameProvider
const AppContent = () => {
  const { connection, game } = useGameContext();

  // Handle create game
  const handleCreateGame = (data) => {
    game.createGame(data);
  };

  // Handle join game
  const handleJoinGame = (data) => {
    game.joinGame(data);
  };

  // Handle leave game
  const handleLeaveGame = () => {
    game.leaveGame();
  };

  // Handle toggle role
  const handleToggleRole = () => {
    if (game.gameId) {
      // This will be handled by the GameRoom component directly
    }
  };

  console.log(`[${new Date().toISOString()}] Render check - gameId: ${game.gameId}, game: ${game.game ? 'exists' : 'null'}, isLoading: ${game.isLoading}`);
  
  // Show game room if we have a game
  if (game.gameId && game.game) {
    console.log(`[${new Date().toISOString()}] Rendering GameRoom`);
    return (
      <div>
        <div className="container">
          <GameRoom
            game={game.game}
            playerName={game.playerName}
            isWatcher={game.isWatcher}
            socketId={connection.socketId}
            onToggleRole={handleToggleRole}
          />
        </div>
        
        {/* Connection Status Indicator - Above Footer */}
        {!connection.isConnected && game.gameId && (
          <div className="connection-status" style={{
            padding: '15px',
            textAlign: 'center',
            backgroundColor: connection.isConnecting ? '#fff3cd' : '#f8d7da',
            color: connection.isConnecting ? '#856404' : '#721c24',
            borderTop: '1px solid #f5c6cb',
            margin: '0'
          }}>
            {connection.isConnecting ? (
              <div>🔄 Reconnecting to server...</div>
            ) : (
              <div>❌ Disconnected from server - Refresh to rejoin the game</div>
            )}
          </div>
        )}
        
        <Footer connection={connection} />
      </div>
    );
  }

  // Show loading state when auto-reconnecting
  if (game.isLoading) {
    console.log(`[${new Date().toISOString()}] Rendering auto-reconnect loading state`);
    return (
      <div>
        <div className="container">
          <div className="flex justify-between align-center mb-4">
            <h1>Planning Poker</h1>
            <ThemeToggle inline={true} />
          </div>
          
          <div className="text-center mb-4">
            <div className="card" style={{ background: '#d1ecf1', color: '#0c5460', border: '1px solid #bee5eb' }}>
              <p>🔄 Please wait while you reconnect to the game...</p>
            </div>
          </div>
        </div>
        <Footer connection={connection} />
      </div>
    );
  }

  // Show setup form for joining existing game (when we have gameId but no game data)
  if (game.gameId && !game.game && !game.isLoading) {
    console.log(`[${new Date().toISOString()}] Rendering GameSetup for joining existing game with gameId: ${game.gameId}`);
    return (
      <div>
        <div className="container">
          <div className="flex justify-between align-center mb-4">
            <h1>Planning Poker</h1>
            <ThemeToggle inline={true} />
          </div>
          
          <div className="text-center mb-4">
            <p className="text-muted">Join existing game</p>
          </div>
          
          {game.error && (
            <div className="card" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
              <p>
                {game.error}
                {game.error === 'Game not found.' && (
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
            gameId={game.gameId}
            onCreateGame={handleCreateGame}
            onJoinGame={handleJoinGame}
            prefillName={game.playerName || localStorage.getItem('planningPokerPlayerName') || ''}
          />
        </div>
        
        <Footer connection={connection} />
      </div>
    );
  }

  console.log(`[${new Date().toISOString()}] Rendering GameSetup with gameId: ${game.gameId}`);
  
  return (
    <div>
      <ConnectionIndicator connection={connection} />
      <div className="container">
        <div className="flex justify-between align-center mb-4">
          <h1>Planning Poker</h1>
          <ThemeToggle inline={true} />
        </div>
        
        <div className="mb-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-3">
              <button 
                onClick={() => connection.disconnect()} 
                className="btn btn-sm"
                style={{ marginRight: '10px', backgroundColor: '#dc3545' }}
              >
                Test Disconnect
              </button>
              <button 
                onClick={() => connection.reconnect()} 
                className="btn btn-sm"
                style={{ marginRight: '10px', backgroundColor: '#28a745' }}
              >
                Test Reconnect
              </button>
            </div>
          )}
        </div>
        
        {game.error && (
          <div className="card" style={{ background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' }}>
            <p>
              {game.error}
              {game.error === 'Game not found.' && (
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
          gameId={game.gameId}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          prefillName={game.playerName || localStorage.getItem('planningPokerPlayerName') || ''}
        />
      </div>
      
      {/* Connection Status Indicator - Above Footer */}
      {!connection.isConnected && game.gameId && (
        <div className="connection-status" style={{
          padding: '15px',
          textAlign: 'center',
          backgroundColor: connection.isConnecting ? '#fff3cd' : '#f8d7da',
          color: connection.isConnecting ? '#856404' : '#721c24',
          borderTop: '1px solid #f5c6cb',
          margin: '0'
        }}>
          {connection.isConnecting ? (
            <div>🔄 Reconnecting to server...</div>
          ) : (
            <div>❌ Disconnected from server - Refresh to rejoin the game</div>
          )}
        </div>
      )}
      
      <Footer />
    </div>
  );
};

// Root App component with GameProvider
function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
