const logger = require('./server/utils/logger');

logger.info('Starting Planning Poker server...');

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

logger.info('Dependencies loaded successfully');

logger.info('Creating Express app and HTTP server...');
const app = express();
const server = http.createServer(app);

logger.info('Configuring Socket.IO...');
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,     // 1 minute - faster detection of dead connections
  pingInterval: 15000,    // 15 seconds - more frequent health checks
  connectionStateRecovery: {
    maxDisconnectionDuration: 10 * 60 * 1000, // 10 minutes - extended recovery window
    skipMiddlewares: true,
  },
  transports: ['websocket', 'polling'], // WebSocket with polling fallback
  upgrade: true, // Allow transport upgrades
  rememberUpgrade: true, // Remember transport preference
  serveClient: true, // Serve client files
  allowEIO3: true // Backward compatibility
});
logger.info('Socket.IO configured successfully');

logger.info('Configuring Express middleware...');
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
const staticPath = path.join(__dirname, 'client/build');
logger.info(`Serving static files from: ${staticPath}`);
app.use(express.static(staticPath));
logger.info('Express middleware configured successfully');

// Store active games
const games = new Map();

// Track active connections and their game associations
const activeConnections = new Map(); // socketId -> { gameId, playerName, isWatcher, lastSeen }
const connectionHealth = new Map(); // socketId -> { status, lastPing, latency, disconnectCount, reconnectCount }
const connectionMetrics = {
  totalConnections: 0,
  totalDisconnections: 0,
  totalReconnections: 0,
  disconnectReasons: new Map(),
  startTime: new Date()
};

// File persistence configuration
logger.info('Setting up file persistence...');
const DATA_DIR = path.join(__dirname, 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
logger.debug(`Data directory: ${DATA_DIR}`);
logger.debug(`Games file: ${GAMES_FILE}`);

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    logger.info(`Creating data directory: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
logger.info('✅ Data directory created successfully');
  } else {
logger.info('✅ Data directory already exists');
  }
  
  // Check if we can write to the data directory
  const testFile = path.join(DATA_DIR, '.write-test');
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
logger.info('✅ Data directory is writable');
  } catch (writeError) {
    logger.error('❌ ERROR: Cannot write to data directory:', writeError.message);
    logger.error('❌ This will cause game saving to fail!');
  }
  
  // Check if games file exists and is readable
  if (fs.existsSync(GAMES_FILE)) {
    try {
      fs.accessSync(GAMES_FILE, fs.constants.R_OK);
      console.log(`[${new Date().toISOString()}] ✅ Games file exists and is readable`);
    } catch (readError) {
      console.error(`[${new Date().toISOString()}] ❌ ERROR: Games file exists but is not readable:`, readError.message);
    }
  } else {
    logger.info('ℹ️  Games file does not exist yet (will be created on first save)');
  }
  
} catch (error) {
  logger.error('❌ CRITICAL ERROR: Failed to set up data directory:', error.message);
  logger.error('❌ Game persistence will not work!');
  logger.error('❌ Error details:', error);
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
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 1000; // 1 second debounce

function saveGames() {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  
  // Set new timeout
  saveTimeout = setTimeout(() => {
    saveGamesImmediate();
  }, SAVE_DEBOUNCE_MS);
}

function loadGames() {
  try {
    if (fs.existsSync(GAMES_FILE)) {
      logger.debug(`Reading games file: ${GAMES_FILE}`);
      const data = JSON.parse(fs.readFileSync(GAMES_FILE, 'utf8'));
      logger.debug(`Parsed ${data.length} games from file`);
      
      data.forEach((gameData, index) => {
        try {
          const game = Game.deserialize(gameData);
          games.set(game.id, game);
        } catch (gameError) {
          logger.warn(`⚠️  WARNING: Failed to deserialize game at index ${index}:`, gameError.message);
          logger.warn('⚠️  Skipping corrupted game data');
        }
      });
      logger.info(`✅ Successfully loaded ${games.size} games from disk`);
    } else {
      logger.info('ℹ️  No games file found, starting with empty game list');
    }
  } catch (error) {
    logger.error('❌ CRITICAL ERROR loading games:', error.message);
    logger.error('❌ Error details:', error);
    logger.error('❌ Continuing with empty game list');
  }
}

function saveGamesImmediate() {
  try {
    logger.debug(`Saving ${games.size} games to disk...`);
    const gamesData = Array.from(games.values()).map(game => game.serialize());
    const jsonData = JSON.stringify(gamesData, null, 2);
    
    // Check if data directory is still writable
    if (!fs.existsSync(DATA_DIR)) {
      logger.error(`❌ ERROR: Data directory no longer exists: ${DATA_DIR}`);
      return;
    }
    
    fs.writeFileSync(GAMES_FILE, jsonData);
    logger.debug(`✅ Successfully saved ${games.size} games to disk`);
  } catch (error) {
    logger.error('❌ ERROR saving games:', error.message);
    logger.error('❌ Error code:', error.code);
    logger.error('❌ Error details:', error);
    
    // Provide specific guidance based on error type
    if (error.code === 'EACCES') {
      logger.error('❌ Permission denied - check file/directory permissions');
    } else if (error.code === 'ENOSPC') {
      logger.error('❌ No space left on device');
    } else if (error.code === 'ENOENT') {
      logger.error('❌ Directory or file not found');
    }
  }
}

// Load games on startup
logger.info('Loading games from disk...');
loadGames();

// Save games every 5 minutes
setInterval(() => {
  saveGamesImmediate();
}, 5 * 60 * 1000); // 5 minutes

// Performance monitoring every 5 minutes
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };
  
  // Count unhealthy connections
  const now = Date.now();
  let unhealthyConnections = 0;
  let highLatencyConnections = 0;
  connectionHealth.forEach((health, socketId) => {
    if (now - health.lastPing > 60000) { // 1 minute without ping
      health.status = 'unhealthy';
      unhealthyConnections++;
    }
    if (health.latency > 1000) { // High latency connections
      highLatencyConnections++;
    }
  });
  
  // Calculate uptime
  const uptime = Math.round((Date.now() - connectionMetrics.startTime.getTime()) / 1000 / 60);
  
  // Log disconnect reasons summary
  const disconnectReasonsSummary = Array.from(connectionMetrics.disconnectReasons.entries())
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(', ');
  
  logger.info(`[METRICS] Performance stats: Active games: ${games.size}, Active connections: ${activeConnections.size}, Unhealthy: ${unhealthyConnections}, High latency: ${highLatencyConnections}, Memory: ${memUsageMB.heapUsed}MB/${memUsageMB.heapTotal}MB heap, ${memUsageMB.rss}MB RSS, Uptime: ${uptime}min`);
  logger.info(`[METRICS] Connection stats: Total connections: ${connectionMetrics.totalConnections}, Total disconnections: ${connectionMetrics.totalDisconnections}, Total reconnections: ${connectionMetrics.totalReconnections}`);
  logger.info(`[METRICS] Disconnect reasons: ${disconnectReasonsSummary}`);
}, 5 * 60 * 1000); // 5 minutes

// Save games on server shutdown
process.on('SIGINT', () => {
  logger.info('Server shutting down, saving games...');
  // Clear any pending save timeout and save immediately
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveGamesImmediate();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Server shutting down, saving games...');
  // Clear any pending save timeout and save immediately
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveGamesImmediate();
  process.exit(0);
});

// Cleanup stale connections periodically
setInterval(() => {
  const now = new Date();
  const staleThreshold = 3 * 60 * 1000; // 3 minutes - faster cleanup for better stability
  
  let staleCount = 0;
  activeConnections.forEach((connection, socketId) => {
    if (now - connection.lastSeen > staleThreshold) {
      staleCount++;
      logger.debug(`[CLEANUP] Cleaning up stale connection: ${socketId}, Last seen: ${connection.lastSeen.toISOString()}, Player: ${connection.playerName}, Game: ${connection.gameId}`);
      const game = games.get(connection.gameId);
      if (game) {
        game.removePlayer(socketId);
        game.lastActivity = new Date(); // Update last activity
        
        if (game.players.size === 0) {
          logger.debug(`[CLEANUP] Game ${connection.gameId} is now empty, will expire in 24 hours (stale cleanup)`);
        } else {
          io.to(connection.gameId).emit('player-left', game.getGameState());
        }
      }
      activeConnections.delete(socketId);
      connectionHealth.delete(socketId);
    }
  });
  
  if (staleCount > 0) {
    logger.info(`[CLEANUP] Removed ${staleCount} stale connections, Active connections: ${activeConnections.size}`);
  }
}, 30000); // Check every 30 seconds - more frequent cleanup

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
    logger.info(`Game ${gameId} expired and deleted (24+ hours old)`);
  });
  
  if (expiredGames.length > 0) {
    saveGamesImmediate(); // Save after cleanup
  }
}, 60 * 60 * 1000); // Check every hour

// Socket.io connection handling
logger.info('Setting up Socket.IO event handlers...');
io.on('connection', (socket) => {
  connectionMetrics.totalConnections++;
  logger.info(`[CONNECT] User connected: ${socket.id}, Total connections: ${connectionMetrics.totalConnections}, Active connections: ${activeConnections.size + 1}`);
  
  // Track connection
  activeConnections.set(socket.id, {
    gameId: null,
    playerName: null,
    isWatcher: false,
    lastSeen: new Date(),
    connectedAt: new Date(),
    transport: socket.conn.transport.name
  });
  
  // Initialize connection health tracking
  connectionHealth.set(socket.id, {
    status: 'healthy',
    lastPing: Date.now(),
    latency: 0,
    disconnectCount: 0,
    reconnectCount: 0,
    transport: socket.conn.transport.name
  });
  
  logger.debug(`[CONNECT] Connection details: ${socket.id}, Transport: ${socket.conn.transport.name}`);

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
    
    // Save game to disk immediately after creation
    saveGames();
    logger.info(`Game created and saved to disk: ${gameId}, Total games: ${games.size}`);
    
    socket.emit('game-created', { gameId, game: game.getGameState() });
  });

  socket.on('join-game', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Join game failed: ${socket.id}, Game not found: ${data.gameId}`);
      socket.emit('error', { message: 'Game not found.' });
      return;
    }

    // Update last activity when someone joins
    game.lastActivity = new Date();

    // Check if player is already in the game (reconnection scenario)
    const existingPlayer = game.players.get(socket.id);
    let playerAdded = false;
    
    if (existingPlayer) {
      // Update existing player info and last seen
      existingPlayer.name = data.playerName || existingPlayer.name;
      // Only update isWatcher if explicitly provided and different from current state
      // This prevents reconnections from accidentally changing player roles
      if (data.isWatcher !== undefined && data.isWatcher !== existingPlayer.isWatcher) {
        existingPlayer.isWatcher = data.isWatcher;
        logger.info(`Player role updated on reconnection: ${socket.id}, Player: ${existingPlayer.name}, New role: ${data.isWatcher ? 'Watcher' : 'Player'}, Game: ${data.gameId}`);
      }
      existingPlayer.lastSeen = new Date();
      existingPlayer.hasVoted = false; // Reset vote status on reconnection
      logger.info(`Player reconnected: ${socket.id}, Player: ${existingPlayer.name}, Game: ${data.gameId}`);
    } else {
      game.addPlayer(socket.id, data.playerName, data.isWatcher);
      playerAdded = true;
      logger.info(`New player joined: ${socket.id}, Player: ${data.playerName}, Game: ${data.gameId}`);
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
    
    // Only save and emit if this was a new player join (not a reconnection)
    if (playerAdded) {
      // Save game to disk immediately after new player joins
      saveGames();
      logger.info(`Player joined and game saved to disk: ${data.gameId}: ${data.playerName}, Players in game: ${game.players.size}`);
      
      io.to(data.gameId).emit('player-joined', game.getGameState());
    } else {
      // For reconnections, just send the current game state without triggering save
      socket.emit('game-state', game.getGameState());
    }
  });

  // Heartbeat mechanism with health tracking
  socket.on('ping', () => {
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.lastSeen = new Date();
    }
    
    // Track connection health
    const now = Date.now();
    const health = connectionHealth.get(socket.id) || { status: 'healthy', lastPing: now, latency: 0, disconnectCount: 0, reconnectCount: 0 };
    const previousPing = health.lastPing;
    health.lastPing = now;
    health.status = 'healthy';
    
    // Calculate latency if we have a previous ping
    if (previousPing && previousPing !== now) {
      health.latency = now - previousPing;
    }
    
    connectionHealth.set(socket.id, health);
    
    // Log high latency connections
    if (health.latency > 2000) { // Log if latency > 2 seconds
      logger.warn(`[HEARTBEAT] High latency detected: ${socket.id}, Latency: ${health.latency}ms, Player: ${connection?.playerName || 'Unknown'}, Game: ${connection?.gameId || 'None'}`);
    }
    
    socket.emit('pong');
  });

  // Socket error handling
  socket.on('error', (error) => {
    logger.error(`[ERROR] Socket error: ${socket.id}, Error: ${error.message}`);
  });


  socket.on('cast-vote', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Vote cast failed: ${socket.id}, Game not found: ${data.gameId}`);
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
      logger.info(`Vote cast: ${socket.id}, Player: ${playerName}, Card: ${data.card}, Game: ${data.gameId}`);
      
      // Check if all players have voted
      const gameState = game.getGameState();
      if (gameState.allVoted) {
        logger.info(`All players voted: Game ${data.gameId}, ${game.votes.size} votes`);
      }
      
      // Save game to disk immediately after vote is cast
      saveGames();
      
      io.to(data.gameId).emit('vote-cast', game.getGameState());
    } else {
      const player = game.players.get(socket.id);
      const playerName = player ? player.name : 'Unknown';
      logger.warn(`[WARN] Invalid vote attempt: ${socket.id}, Player: ${playerName}, Card: ${data.card}, Game: ${data.gameId}`);
    }
  });

  socket.on('reveal-votes', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Reveal votes failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.revealVotes();
    game.lastActivity = new Date(); // Update last activity
    logger.info(`Votes revealed: Game ${data.gameId}, ${game.votes.size} votes`);
    
    // Check for consensus (all votes are the same)
    const votes = Array.from(game.votes.values());
    if (votes.length > 1) {
      const firstVote = votes[0];
      const allSame = votes.every(vote => vote === firstVote);
      if (allSame) {
        logger.info(`Consensus reached: Game ${data.gameId}, Card: ${firstVote}, Players: ${votes.length}`);
      }
    }
    
    // Save game to disk immediately after votes are revealed
    saveGames();
    
    io.to(data.gameId).emit('votes-revealed', game.getGameState());
  });

  socket.on('reset-game', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Game reset failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.resetGame();
    game.lastActivity = new Date(); // Update last activity
    logger.info(`Game reset: Game ${data.gameId}`);
    
    // Save game to disk immediately after game is reset
    saveGames();
    
    io.to(data.gameId).emit('game-reset', game.getGameState());
  });

  socket.on('change-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Deck change failed: ${socket.id}, Game not found: ${data.gameId}`);
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
    logger.info(`Deck changed: Game ${data.gameId}, New deck: ${data.deckType}`);
    
    // Save game to disk immediately after deck is changed
    saveGames();
    
    io.to(data.gameId).emit('deck-changed', game.getGameState());
  });

  socket.on('create-custom-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Custom deck creation failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.createCustomDeck(data.name, data.cards);
    game.lastActivity = new Date(); // Update last activity
    logger.info(`Custom deck created: Game ${data.gameId}, Deck: ${data.name}, Cards: ${data.cards.length}`);
    
    // Save game to disk immediately after custom deck is created
    saveGames();
    
    io.to(data.gameId).emit('custom-deck-created', game.getGameState());
  });

  socket.on('edit-custom-deck', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Custom deck edit failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    game.editCustomDeck(data.name, data.cards);
    game.lastActivity = new Date(); // Update last activity
    logger.info(`Custom deck edited: Game ${data.gameId}, Deck: ${data.name}, Cards: ${data.cards.length}`);
    
    // Save game to disk immediately after custom deck is edited
    saveGames();
    
    io.to(data.gameId).emit('custom-deck-edited', game.getGameState());
  });

  socket.on('change-player-name', (data) => {
    logger.debug(`[SERVER] Received change-player-name event:`, data);
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Player name change failed: ${socket.id}, Game not found: ${data.gameId}`);
      socket.emit('error', { message: 'Game not found.' });
      return;
    }

    const player = game.players.get(socket.id);
    if (!player) {
      logger.error(`[ERROR] Player name change failed: ${socket.id}, Player not found in game: ${data.gameId}`);
      socket.emit('error', { message: 'You are not in this game.' });
      return;
    }

    // Validate the new name
    if (!data.newName || typeof data.newName !== 'string') {
      socket.emit('error', { message: 'Invalid name provided.' });
      return;
    }

    const trimmedName = data.newName.trim();
    if (trimmedName.length === 0 || trimmedName.length > 20) {
      socket.emit('error', { message: 'Name must be between 1 and 20 characters.' });
      return;
    }

    // Update the player's name
    const oldName = player.name;
    player.name = trimmedName;
    player.lastSeen = new Date();
    game.lastActivity = new Date();
    
    // Update connection tracking
    const connection = activeConnections.get(socket.id);
    if (connection) {
      connection.playerName = trimmedName;
      connection.lastSeen = new Date();
    }
    
    // Save game to disk
    saveGames();
    
    logger.info(`Player name changed: ${socket.id}, Old name: ${oldName}, New name: ${trimmedName}, Game: ${data.gameId}`);
    
    // Notify all players in the game
    io.to(data.gameId).emit('player-name-changed', game.getGameState());
  });

  socket.on('toggle-role', (data) => {
    const game = games.get(data.gameId);
    if (!game) {
      logger.error(`[ERROR] Role toggle failed: ${socket.id}, Game not found: ${data.gameId}`);
      return;
    }

    const player = game.players.get(socket.id);
    if (!player) {
      logger.error(`[ERROR] Role toggle failed: ${socket.id}, Player not found in game: ${data.gameId}`);
      return;
    }

    // Log current state before toggle
    console.log(`[${new Date().toISOString()}] Role toggle request: ${socket.id}, Player: ${player.name}, Current role: ${player.isWatcher ? 'Watcher' : 'Player'}, Game: ${data.gameId}`);

    // Toggle role
    player.isWatcher = !player.isWatcher;

    // If switching to watcher, remove their vote
    if (player.isWatcher) {
      game.votes.delete(socket.id);
      player.hasVoted = false;
    }

    game.lastActivity = new Date(); // Update last activity
    console.log(`[${new Date().toISOString()}] Role toggled: ${socket.id}, Player: ${player.name}, New role: ${player.isWatcher ? 'Watcher' : 'Player'}, Game: ${data.gameId}`);
    
    // Save game to disk immediately after role is toggled
    saveGames();
    
    io.to(data.gameId).emit('role-toggled', game.getGameState());
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
    connectionMetrics.totalDisconnections++;
    
    // Track disconnect reasons
    const currentCount = connectionMetrics.disconnectReasons.get(reason) || 0;
    connectionMetrics.disconnectReasons.set(reason, currentCount + 1);
    
    const connection = activeConnections.get(socket.id);
    const health = connectionHealth.get(socket.id);
    const playerInfo = connection ? 
      `Player: ${connection.playerName}, Game: ${connection.gameId}` : 
      'Unknown player';
    
    // Calculate connection duration
    const connectionDuration = connection ? 
      Math.round((Date.now() - connection.connectedAt.getTime()) / 1000) : 0;
    
    console.log(`[${new Date().toISOString()}] [DISCONNECT] User disconnected: ${socket.id}, Reason: ${reason}, ${playerInfo}, Connection duration: ${connectionDuration}s, Transport: ${health?.transport || 'unknown'}`);
    
    // Log if this was a problematic disconnect
    if (reason === 'ping timeout' || reason === 'transport close') {
      console.log(`[${new Date().toISOString()}] [DISCONNECT] Problematic disconnect detected: ${socket.id}, Reason: ${reason}, Last ping: ${health?.lastPing ? new Date(health.lastPing).toISOString() : 'never'}, Latency: ${health?.latency || 0}ms`);
    }
    
    // Clean up connection tracking
    activeConnections.delete(socket.id);
    connectionHealth.delete(socket.id);
    
    // Find and remove player from all games
    games.forEach((game, currentGameId) => {
      if (game.players.has(socket.id)) {
        game.removePlayer(socket.id);
        game.lastActivity = new Date(); // Update last activity
        
        if (game.players.size === 0) {
          console.log(`[${new Date().toISOString()}] [DISCONNECT] Game ${currentGameId} is now empty, will expire in 24 hours`);
        } else {
          console.log(`[${new Date().toISOString()}] [DISCONNECT] Notifying remaining players in game ${currentGameId}, Players remaining: ${game.players.size}`);
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

// Connection health monitoring endpoint
app.get('/api/health', (req, res) => {
  const now = Date.now();
  let healthyConnections = 0;
  let unhealthyConnections = 0;
  let highLatencyConnections = 0;
  let totalLatency = 0;
  let latencyCount = 0;
  
  connectionHealth.forEach((health, socketId) => {
    if (now - health.lastPing > 60000) { // 1 minute without ping
      unhealthyConnections++;
    } else {
      healthyConnections++;
    }
    
    if (health.latency > 1000) { // High latency connections
      highLatencyConnections++;
    }
    
    if (health.latency > 0) {
      totalLatency += health.latency;
      latencyCount++;
    }
  });
  
  const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
  const uptime = Math.round((Date.now() - connectionMetrics.startTime.getTime()) / 1000);
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptime,
    connections: {
      total: activeConnections.size,
      healthy: healthyConnections,
      unhealthy: unhealthyConnections,
      highLatency: highLatencyConnections
    },
    games: {
      total: games.size,
      active: Array.from(games.values()).filter(game => game.players.size > 0).length
    },
    metrics: {
      totalConnections: connectionMetrics.totalConnections,
      totalDisconnections: connectionMetrics.totalDisconnections,
      totalReconnections: connectionMetrics.totalReconnections,
      avgLatency: avgLatency,
      disconnectReasons: Object.fromEntries(connectionMetrics.disconnectReasons)
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    }
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
logger.info(`Starting server on port ${PORT}...`);

server.on('error', (error) => {
  console.error(`[${new Date().toISOString()}] ❌ Server error:`, error);
});

server.listen(PORT, () => {
  logger.info(`✅ Server successfully started and running on port ${PORT}`);
  logger.info('✅ Planning Poker server is ready to accept connections');
});
