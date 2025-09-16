const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 90000,    // 90 seconds - longer timeout for mobile connections
  pingInterval: 30000,   // 30 seconds - ping every 30 seconds
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  // Mobile optimizations
  transports: ['websocket', 'polling'], // Fallback to polling for mobile
  upgrade: true, // Allow transport upgrades
  rememberUpgrade: true, // Remember transport preference
  serveClient: true, // Serve client files
  allowEIO3: true // Backward compatibility
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// Store active games
const games = new Map();

// Track active connections and their game associations
const activeConnections = new Map(); // socketId -> { gameId, playerName, isWatcher, lastSeen }

// File persistence configuration
const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Card deck configurations
const CARD_DECKS = {
  fibonacci: {
    name: 'Fibonacci',
    cards: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '∞', '?', '☕']
  },
  tshirt: {
    name: 'T-Shirt Sizing',
    cards: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕']
  },
  powersOf2: {
    name: 'Powers of 2',
    cards: ['0', '1', '2', '4', '8', '16', '32', '?', '☕']
  },
  linear: {
    name: 'Linear (1-10)',
    cards: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕']
  }
};

// Game state management
class Game {
  constructor(id, deckType = 'fibonacci') {
    this.id = id;
    this.deckType = deckType;
    this.players = new Map();
    this.votes = new Map();
    this.revealed = false;
    this.deck = CARD_DECKS[deckType] || CARD_DECKS.fibonacci;
    this.customDeck = null; // Store custom deck data
    this.createdAt = new Date();
  }

  addPlayer(socketId, name, isWatcher = false) {
    // Check if player already exists and update their info
    const existingPlayer = this.players.get(socketId);
    if (existingPlayer) {
      existingPlayer.name = name || existingPlayer.name;
      existingPlayer.isWatcher = isWatcher;
      existingPlayer.lastSeen = new Date();
      return existingPlayer;
    }

    this.players.set(socketId, {
      id: socketId,
      name: name || `Player ${this.players.size + 1}`,
      isWatcher: isWatcher,
      hasVoted: false,
      lastSeen: new Date()
    });
    return this.players.get(socketId);
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.votes.delete(socketId);
  }

  castVote(socketId, card) {
    if (this.revealed) return false;
    
    const player = this.players.get(socketId);
    if (!player || player.isWatcher) return false;

    this.votes.set(socketId, card);
    player.hasVoted = true;
    return true;
  }

  revealVotes() {
    this.revealed = true;
    return true;
  }

  resetGame() {
    this.votes.clear();
    this.revealed = false;
    this.players.forEach(player => {
      player.hasVoted = false;
    });
  }

  createCustomDeck(name, cards) {
    this.customDeck = {
      name: name.trim(),
      cards: cards.filter(card => card.trim() !== '') // Remove empty cards
    };
    this.deckType = 'custom';
    this.deck = this.customDeck;
    this.resetGame(); // Reset votes when changing deck
  }

  editCustomDeck(name, cards) {
    if (this.customDeck) {
      this.customDeck.name = name.trim();
      this.customDeck.cards = cards.filter(card => card.trim() !== '');
      this.deck = this.customDeck;
      this.resetGame(); // Reset votes when editing deck
    }
  }

  getGameState() {
    const nonWatcherPlayers = Array.from(this.players.values()).filter(p => !p.isWatcher);
    const hasAnyVotes = this.votes.size > 0;
    
    return {
      id: this.id,
      deckType: this.deckType,
      deck: this.deck,
      customDeck: this.customDeck,
      players: Array.from(this.players.values()),
      votes: this.revealed ? Object.fromEntries(this.votes) : {},
      revealed: this.revealed,
      allVoted: Array.from(this.players.values()).every(p => p.isWatcher || p.hasVoted),
      canReveal: hasAnyVotes && !this.revealed
    };
  }

  serialize() {
    return {
      id: this.id,
      deckType: this.deckType,
      deck: this.deck,
      customDeck: this.customDeck,
      players: Array.from(this.players.entries()),
      votes: Array.from(this.votes.entries()),
      revealed: this.revealed,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity || this.createdAt
    };
  }

  static deserialize(data) {
    const game = new Game(data.id, data.deckType);
    game.deck = data.deck;
    game.customDeck = data.customDeck;
    game.players = new Map(data.players);
    game.votes = new Map(data.votes);
    game.revealed = data.revealed;
    game.createdAt = new Date(data.createdAt);
    game.lastActivity = new Date(data.lastActivity);
    return game;
  }
}

// File persistence functions
function loadGames() {
  try {
    if (fs.existsSync(GAMES_FILE)) {
      const data = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
      data.forEach(gameData => {
        const game = Game.deserialize(gameData);
        games.set(game.id, game);
      });
      console.log(`[${new Date().toISOString()}] Loaded ${games.size} games from disk`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error loading games:`, error);
  }
}

function saveGames() {
  try {
    const gamesData = Array.from(games.values()).map(game => game.serialize());
    fs.writeFileSync(GAMES_FILE, JSON.stringify(gamesData, null, 2));
    console.log(`[${new Date().toISOString()}] Saved ${games.size} games to disk`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving games:`, error);
  }
}

// Load games on startup
loadGames();

// Save games every 1 minute
setInterval(() => {
  saveGames();
}, 1 * 60 * 1000); // 1 minute

// Performance monitoring every 5 minutes
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  console.log(`[${new Date().toISOString()}] Performance stats: Active games: ${games.size}, Active connections: ${activeConnections.size}, Memory: ${memUsageMB.heapUsed}MB/${memUsageMB.heapTotal}MB heap, ${memUsageMB.rss}MB RSS`);
}, 5 * 60 * 1000); // 5 minutes

// Save games on server shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Server shutting down, saving games...`);
  saveGames();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] Server shutting down, saving games...`);
  saveGames();
  process.exit(0);
});

// Cleanup stale connections periodically
setInterval(() => {
  const now = new Date();
  const staleThreshold = 2 * 60 * 1000; // 2 minutes
  
  activeConnections.forEach((connection, socketId) => {
    if (now - connection.lastSeen > staleThreshold) {
      console.log(`[${new Date().toISOString()}] Cleaning up stale connection: ${socketId}`);
      const game = games.get(connection.gameId);
      if (game) {
        game.removePlayer(socketId);
        game.lastActivity = new Date(); // Update last activity
        
        if (game.players.size === 0) {
          console.log(`[${new Date().toISOString()}] Game ${connection.gameId} is now empty, will expire in 24 hours (stale cleanup)`);
        } else {
          io.to(connection.gameId).emit('player-left', game.getGameState());
        }
      }
      activeConnections.delete(socketId);
    }
  });
}, 30000); // Check every 30 seconds

// Cleanup expired games (24 hours) every hour
setInterval(() => {
  const now = new Date();
  const expiredGames = [];
  
  games.forEach((game, gameId) => {
    const timeSinceLastActivity = now - game.lastActivity;
    if (timeSinceLastActivity > 24 * 60 * 60 * 1000) { // 24 hours
      expiredGames.push(gameId);
    }
  });
  
  expiredGames.forEach(gameId => {
    games.delete(gameId);
    console.log(`[${new Date().toISOString()}] Game ${gameId} expired and deleted (24+ hours old)`);
  });
  
  if (expiredGames.length > 0) {
    saveGames(); // Save after cleanup
  }
}, 60 * 60 * 1000); // Check every hour

// Socket.io connection handling
io.on('connection', (socket) => {
  // Detect mobile connections
  const userAgent = socket.handshake.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  console.log(`[${new Date().toISOString()}] User connected: ${socket.id}${isMobile ? ' (Mobile)' : ''}`);
  
  // Track connection with mobile info
  activeConnections.set(socket.id, {
    gameId: null,
    playerName: null,
    isWatcher: false,
    lastSeen: new Date(),
    isMobile: isMobile,
    userAgent: userAgent
  });
  
  // Apply mobile-specific settings
  if (isMobile) {
    // More lenient settings for mobile
    socket.pingTimeout = 120000; // 2 minutes for mobile
    socket.pingInterval = 45000; // 45 seconds for mobile
  }

  socket.on('create-game', (data) => {
    const gameId = uuidv4().substring(0, 8);
    const game = new Game(gameId, data.deckType || 'fibonacci');
    game.lastActivity = new Date();
    games.set(gameId, game);
    
    game.addPlayer(socket.id, data.playerName, data.isWatcher);
    socket.join(gameId);
    
    // Update connection tracking
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.gameId = gameId;
      connection.playerName = data.playerName;
      connection.isWatcher = data.isWatcher;
      connection.lastSeen = new Date();
    }
    
    socket.emit('game-created', { gameId, game: game.getGameState() });
    console.log(`[${new Date().toISOString()}] Game created: ${gameId}, Total games: ${games.size}`);
  });

  socket.on('join-game', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Join game failed: ${socket.id}, Game not found: ${data.gameId}`);
      socket.emit('error', { message: 'Game not found.' });
      return;
    }

    // Update last activity when someone joins
    game.lastActivity = new Date();

    // Check if player is already in the game (reconnection scenario)
    const existingPlayer = game.players.get(socket.id);
    if (existingPlayer) {
      // Update existing player info and last seen
      existingPlayer.name = data.playerName || existingPlayer.name;
      existingPlayer.isWatcher = data.isWatcher;
      existingPlayer.lastSeen = new Date();
      existingPlayer.hasVoted = false; // Reset vote status on reconnection
    } else {
      game.addPlayer(socket.id, data.playerName, data.isWatcher);
    }
    
    socket.join(data.gameId);
    
    // Update connection tracking
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.gameId = data.gameId;
      connection.playerName = data.playerName;
      connection.isWatcher = data.isWatcher;
      connection.lastSeen = new Date();
    }
    
    io.to(data.gameId).emit('player-joined', game.getGameState());
    console.log(`[${new Date().toISOString()}] Player joined game ${data.gameId}: ${data.playerName}, Players in game: ${game.players.size}`);
  });

  // Heartbeat mechanism
  socket.on('ping', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
    }
    socket.emit('pong');
  });

  // Socket error handling
  socket.on('error', (error) => {
    console.log(`[${new Date().toISOString()}] [ERROR] Socket error: ${socket.id}, Error: ${error.message}`);
  });

  // Mobile-specific event handlers
  socket.on('mobile-background', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
      const playerInfo = connection.playerName ? `Player: ${connection.playerName}` : 'Unknown player';
      console.log(`[${new Date().toISOString()}] App backgrounded: ${socket.id}, ${playerInfo}${connection.isMobile ? ' (Mobile)' : ''}`);
    }
  });

  socket.on('mobile-unload', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      const playerInfo = connection.playerName ? `Player: ${connection.playerName}` : 'Unknown player';
      console.log(`[${new Date().toISOString()}] App unloading: ${socket.id}, ${playerInfo}${connection.isMobile ? ' (Mobile)' : ''}`);
    }
  });

  // Handle mobile reconnection attempts
  socket.on('mobile-reconnect', (data) => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
      const playerInfo = connection.playerName ? `Player: ${connection.playerName}` : 'Unknown player';
      console.log(`[${new Date().toISOString()}] Mobile reconnection attempt: ${socket.id}, ${playerInfo}${connection.isMobile ? ' (Mobile)' : ''}`);
    }
  });

  // Handle mobile app resumed from background
  socket.on('mobile-resume', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
      const playerInfo = connection.playerName ? `Player: ${connection.playerName}` : 'Unknown player';
      console.log(`[${new Date().toISOString()}] App resumed: ${socket.id}, ${playerInfo}${connection.isMobile ? ' (Mobile)' : ''}`);
    }
  });

  // Handle mobile ping/pong
  socket.on('mobile-ping', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
      const playerInfo = connection.playerName ? `Player: ${connection.playerName}` : 'Unknown player';
      console.log(`[${new Date().toISOString()}] Mobile ping: ${socket.id}, ${playerInfo}${connection.isMobile ? ' (Mobile)' : ''}`);
      socket.emit('mobile-pong');
    }
  });

  socket.on('cast-vote', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Vote cast failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    // Update last seen
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
    }

    const success = game.castVote(socket.id, data.card);
    if (success) {
      game.lastActivity = new Date(); // Update last activity
      const player = game.players.get(socket.id);
      const playerName = player ? player.name : 'Unknown';
      console.log(`[${new Date().toISOString()}] Vote cast: ${socket.id}, Player: ${playerName}, Card: ${data.card}, Game: ${data.gameId}`);
      
      // Check if all players have voted
      const gameState = game.getGameState();
      if (gameState.allVoted) {
        console.log(`[${new Date().toISOString()}] All players voted: Game ${data.gameId}, ${game.votes.size} votes`);
      }
      
      io.to(data.gameId).emit('vote-cast', game.getGameState());
    } else {
      const player = game.players.get(socket.id);
      const playerName = player ? player.name : 'Unknown';
      console.log(`[${new Date().toISOString()}] [WARN] Invalid vote attempt: ${socket.id}, Player: ${playerName}, Card: ${data.card}, Game: ${data.gameId}`);
    }
  });

  socket.on('reveal-votes', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Reveal votes failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.revealVotes();
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Votes revealed: Game ${data.gameId}, ${game.votes.size} votes`);
    
    // Check for consensus (all votes are the same)
    const votes = Array.from(game.votes.values());
    if (votes.length > 1) {
      const firstVote = votes[0];
      const allSame = votes.every(vote => vote === firstVote);
      if (allSame) {
        console.log(`[${new Date().toISOString()}] Consensus reached: Game ${data.gameId}, Card: ${firstVote}, Players: ${votes.length}`);
      }
    }
    
    io.to(data.gameId).emit('votes-revealed', game.getGameState());
  });

  socket.on('reset-game', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Game reset failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.resetGame();
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Game reset: Game ${data.gameId}`);
    io.to(data.gameId).emit('game-reset', game.getGameState());
  });

  socket.on('change-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Deck change failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    if (data.deckType === 'custom' && game.customDeck) {
      game.deckType = 'custom';
      game.deck = game.customDeck;
    } else {
      game.deckType = data.deckType;
      game.deck = CARD_DECKS[data.deckType] || CARD_DECKS.fibonacci;
    }
    game.resetGame();
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Deck changed: Game ${data.gameId}, New deck: ${data.deckType}`);
    
    io.to(data.gameId).emit('deck-changed', game.getGameState());
  });

  socket.on('create-custom-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Custom deck creation failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.createCustomDeck(data.name, data.cards);
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Custom deck created: Game ${data.gameId}, Deck: ${data.name}, Cards: ${data.cards.length}`);
    io.to(data.gameId).emit('custom-deck-created', game.getGameState());
  });

  socket.on('edit-custom-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Custom deck edit failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.editCustomDeck(data.name, data.cards);
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Custom deck edited: Game ${data.gameId}, Deck: ${data.name}, Cards: ${data.cards.length}`);
    io.to(data.gameId).emit('custom-deck-edited', game.getGameState());
  });

  socket.on('toggle-role', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Role toggle failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    const player = game.players.get(socket.id);
    if (!player) {
      console.log(`[${new Date().toISOString()}] [ERROR] Role toggle failed: ${socket.id}, Player not found in game: ${data.gameId}`);
      return;
    }

    // Toggle role
    player.isWatcher = !player.isWatcher;

    // If switching to watcher, remove their vote
    if (player.isWatcher) {
      game.votes.delete(socket.id);
      player.hasVoted = false;
    }

    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Role toggled: ${socket.id}, Player: ${player.name}, New role: ${player.isWatcher ? 'Watcher' : 'Player'}, Game: ${data.gameId}`);
    io.to(data.gameId).emit('role-toggled', game.getGameState());
  });

  socket.on('change-name', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Name change failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    const player = game.players.get(socket.id);
    if (!player) {
      console.log(`[${new Date().toISOString()}] [ERROR] Name change failed: ${socket.id}, Player not found in game: ${data.gameId}`);
      return;
    }

    // Check if name is valid
    const trimmedName = data.newName.trim();
    if (!trimmedName || trimmedName.length > 50) {
      console.log(`[${new Date().toISOString()}] [WARN] Invalid name change attempt: ${socket.id}, Name: ${data.newName}, Game: ${data.gameId}`);
      return;
    }

    // Update player name
    const oldName = player.name;
    player.name = trimmedName;

    // Notify all players in the game
    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Name changed: ${socket.id}, Old: ${oldName}, New: ${trimmedName}, Game: ${data.gameId}`);
    io.to(data.gameId).emit('name-changed', game.getGameState());
  });

  socket.on('leave-game', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      console.log(`[${new Date().toISOString()}] [ERROR] Leave game failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    // Remove player from game
    game.removePlayer(socket.id);
    socket.leave(data.gameId);

    // Update last activity instead of deleting immediately
    game.lastActivity = new Date();

    if (game.players.size === 0) {
      console.log(`[${new Date().toISOString()}] Game ${data.gameId} is now empty, will expire in 24 hours`);
    } else {
      // Notify remaining players
      const player = game.players.get(socket.id);
      const playerName = player ? player.name : 'Unknown';
      console.log(`[${new Date().toISOString()}] Player left: ${socket.id}, Player: ${playerName}, Game: ${data.gameId}`);
      io.to(data.gameId).emit('player-left', game.getGameState());
    }
  });

  socket.on('disconnect', (reason) => {
    const connection = activeConnections.get(socket.id);
    const playerInfo = connection ? 
      `Player: ${connection.playerName}, Game: ${connection.gameId}${connection.isMobile ? ' (Mobile)' : ''}` : 
      'Unknown player';
    
    console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}, Reason: ${reason}, ${playerInfo}`);
    
    // Clean up connection tracking
    activeConnections.delete(socket.id);
    
    // Find and remove player from all games
    games.forEach((game, currentGameId) => {
      if (game.players.has(socket.id)) {
        game.removePlayer(socket.id);
        game.lastActivity = new Date(); // Update last activity
        
        if (game.players.size === 0) {
          console.log(`[${new Date().toISOString()}] Game ${currentGameId} is now empty, will expire in 24 hours`);
        } else {
          io.to(currentGameId).emit('player-left', game.getGameState());
        }
      }
    });
  });
});

// API routes
app.get('/api/decks', (req, res) => {
  res.json(CARD_DECKS);
});

// Read version once at startup for security
const APP_VERSION = require('./package.json').version;

app.get('/api/version', (req, res) => {
  // Return pre-loaded version (no file system access at runtime)
  res.json({ version: APP_VERSION });
});

app.get('/api/game/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found.' });
  }
  res.json(game.getGameState());
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
});
