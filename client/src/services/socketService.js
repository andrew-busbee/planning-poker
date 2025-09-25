import io from 'socket.io-client';

// Socket.IO configuration
const socketConfig = {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 5000,
  timeout: 60000,
  forceNew: false,
  transports: ['websocket', 'polling'],
  upgrade: true,
  rememberUpgrade: true,
  randomizationFactor: 0.5,
  maxReconnectionAttempts: Infinity
};

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(serverUrl = '') {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(serverUrl, socketConfig);
    this.setupEventListeners();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Game operations
  createGame(gameData) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('create-game', gameData);
  }

  joinGame(gameData) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('join-game', gameData);
  }

  leaveGame(gameId) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('leave-game', { gameId });
  }

  castVote(gameId, card) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('cast-vote', { gameId, card });
  }

  revealVotes(gameId) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('reveal-votes', { gameId });
  }

  resetGame(gameId) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('reset-game', { gameId });
  }

  changeDeck(gameId, deckType) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('change-deck', { gameId, deckType });
  }

  toggleRole(gameId) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('toggle-role', { gameId });
  }


  createCustomDeck(gameId, deckData) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('create-custom-deck', { gameId, ...deckData });
  }

  editCustomDeck(gameId, deckData) {
    if (!this.socket) throw new Error('Socket not connected');
    this.socket.emit('edit-custom-deck', { gameId, ...deckData });
  }

  // Event listener management
  on(event, callback) {
    if (!this.socket) throw new Error('Socket not connected');
    
    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.socket) return;
    
    this.socket.off(event, callback);
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Cleanup all listeners
  removeAllListeners() {
    if (!this.socket) return;
    
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.off(event, callback);
      });
    });
    this.listeners.clear();
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log(`[${new Date().toISOString()}] [SOCKET] Connected to server, Socket ID: ${this.socket.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[${new Date().toISOString()}] [SOCKET] Disconnected from server, reason: ${reason}`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`[${new Date().toISOString()}] [SOCKET] Reconnected after ${attemptNumber} attempts`);
    });

    this.socket.on('connect_error', (error) => {
      console.error(`[${new Date().toISOString()}] [SOCKET] Connection error:`, error);
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;



