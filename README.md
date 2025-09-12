# Planning Poker Application

A real-time planning poker application for agile estimation, deployable via Docker. No login required - each session creates a unique game URL that can be shared with team members.

## Features

- 🎯 **Real-time voting** with WebSocket communication
- 🃏 **Multiple card decks**: Fibonacci, T-shirt sizing, Powers of 2, and Linear
- 👁️ **Watcher mode** for observers who can reveal votes and reset games
- 🔗 **Shareable game URLs** - no login required
- 📱 **Responsive design** that works on desktop and mobile
- 🐳 **Docker deployment** ready
- ⚡ **Instant updates** when players join, vote, or reveal results

## Card Decks

### Fibonacci (Default)
0, 1, 2, 3, 5, 8, 13, ?, !, ⏸️

### T-Shirt Sizing
XS, S, M, L, XL, XXL, ?, !, ⏸️

### Powers of 2
0, 1, 2, 4, 8, 16, 32, ?, !, ⏸️

### Linear (1-10)
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?, !, ⏸️

Special cards:
- `?` - Need more information
- `!` - Too complex to estimate
- `⏸️` - Take a break

## Quick Start with Docker

### Using Docker Compose (Recommended)

1. Clone or download this repository
2. Run the application:
   ```bash
   docker-compose up -d
   ```
3. Open your browser to `http://localhost:3001`

### Using Docker directly

1. Build the image:
   ```bash
   docker build -t planning-poker .
   ```
2. Run the container:
   ```bash
   docker run -p 3001:3001 planning-poker
   ```
3. Open your browser to `http://localhost:3001`

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm 9+

### Setup
1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The application will be available at `http://localhost:3001`

### Build Optimization
The project uses optimized build settings to minimize warnings:
- **npm ci** for faster, reliable builds
- **Updated dependencies** to latest stable versions
- **Suppressed warnings** for cleaner build output
- **Node.js 18+** requirement for modern features

## How to Use

1. **Create a Game**: Enter your name and select a card deck type
2. **Share the URL**: Copy the generated game URL and share it with your team
3. **Join the Game**: Team members can join using the shared URL
4. **Cast Votes**: Select a card to cast your vote (hidden from others)
5. **Reveal Results**: Any player can reveal all votes when ready
6. **Start New Round**: Reset the game to start a new estimation round

### Watcher Mode
- Join as a watcher to observe without voting
- Watchers can reveal votes and start new rounds
- Perfect for stakeholders and managers

## API Endpoints

- `GET /api/decks` - Get available card deck configurations
- `GET /api/game/:gameId` - Get game state
- `GET /` - Serve the React application

## WebSocket Events

### Client to Server
- `create-game` - Create a new game
- `join-game` - Join an existing game
- `cast-vote` - Cast a vote
- `reveal-votes` - Reveal all votes
- `reset-game` - Start a new round
- `change-deck` - Change the card deck

### Server to Client
- `game-created` - Game created successfully
- `player-joined` - Player joined the game
- `vote-cast` - Vote was cast
- `votes-revealed` - Votes have been revealed
- `game-reset` - Game has been reset
- `deck-changed` - Card deck has been changed
- `player-left` - Player left the game

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

### Docker Configuration
The application includes:
- Multi-stage Docker build for optimized production image
- Health checks for container monitoring
- Non-root user for security
- Proper signal handling for graceful shutdowns

## Deployment

### Docker Compose
The included `docker-compose.yml` provides:
- Port mapping (3001:3001)
- Health checks
- Restart policy
- Traefik labels for reverse proxy (optional)

### Production Considerations
- Use a reverse proxy (nginx, Traefik) for SSL termination
- Set up proper logging and monitoring
- Consider using Docker secrets for sensitive configuration
- Use a container orchestration platform for high availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Change the port in docker-compose.yml or use a different port
docker-compose up -d --scale planning-poker=0
docker-compose up -d
```

**Container won't start**
```bash
# Check logs
docker-compose logs planning-poker

# Rebuild the image
docker-compose build --no-cache
```

**WebSocket connection issues**
- Ensure your reverse proxy supports WebSocket upgrades
- Check firewall settings
- Verify the correct port is exposed

## Support

For issues and questions, please create an issue in the repository.
