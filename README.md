# Planning Poker

A real-time planning poker application for agile estimation, deployable via Docker. No login required - each session creates a unique game URL that can be shared with team members.

## Features

- 🎯 **Real-time voting** with WebSocket communication
- 🃏 **Multiple card decks**: Fibonacci, T-shirt sizing, Powers of 2, and Linear
- 👁️ **Watcher mode** for observers who can reveal votes and reset games
- 🔗 **Shareable game URLs** - no login required
- 📱 **Responsive design** that works on desktop and mobile
- 🌓 **Light and dark modes** with theme toggle
- 🐳 **Docker deployment** ready
- ⚡ **Instant updates** when players join, vote, or reveal results

## Card Decks

### Fibonacci (Default)
0, 1, 2, 3, 5, 8, 13, ?, !, ☕

### T-Shirt Sizing
XS, S, M, L, XL, XXL, ?, !, ☕

### Powers of 2
0, 1, 2, 4, 8, 16, 32, ?, !, ☕

### Linear (1-10)
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ?, !, ☕

### Custom Deck
Create your own custom deck to use during the game

Special cards:
- `?` - Need more information
- `!` - Too complex to estimate
- `☕` - Take a break

## Screenshots

### New Game Menu
<table>
<tr>
<td width="50%"><strong>Light Mode</strong></td>
<td width="50%"><strong>Dark Mode</strong></td>
</tr>
<tr>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/new_game_light_mode.png" alt="New Game Menu - Light Mode" width="100%"></td>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/new_game_dark_mode.png" alt="New Game Menu - Dark Mode" width="100%"></td>
</tr>
</table>

### Player View
<table>
<tr>
<td width="50%"><strong>Light Mode</strong></td>
<td width="50%"><strong>Dark Mode</strong></td>
</tr>
<tr>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/player_light_mode.png" alt="Player View - Light Mode" width="100%"></td>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/player_dark_mode.png" alt="Player View - Dark Mode" width="100%"></td>
</tr>
</table>

### Watcher View
<table>
<tr>
<td width="50%"><strong>Light Mode</strong></td>
<td width="50%"><strong>Dark Mode</strong></td>
</tr>
<tr>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/watcher_light_mode.png" alt="Watcher View - Light Mode" width="100%"></td>
<td><img src="https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/watcher_dark_mode.png" alt="Watcher View - Dark Mode" width="100%"></td>
</tr>
</table>


## Quick Start with Docker

### Using Docker Compose (Recommended)

1. Clone this repository:
   ```bash
   git clone https://github.com/andrew-busbee/planning-poker.git
   cd planning-poker
   ```

2. Run the application:
   ```bash
   docker-compose up -d
   ```

3. Open your browser to `http://localhost:3001`

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
