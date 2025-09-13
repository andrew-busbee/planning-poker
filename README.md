[![License](https://img.shields.io/github/license/andrew-busbee/planning-poker?cacheBust=1)](https://github.com/andrew-busbee/planning-poker/blob/main/LICENSE)
<!--
[![Docker Hub Version](https://img.shields.io/docker/v/andrewbusbee/planning-poker?sort=semver&logo=docker)](https://hub.docker.com/r/andrewbusbee/planning-poker/tags)
[![Docker Pulls](https://img.shields.io/docker/pulls/andrewbusbee/planning-poker?logo=docker)](https://hub.docker.com/r/andrewbusbee/planning-poker)
[![Image Size](https://img.shields.io/docker/image-size/andrewbusbee/planning-poker/latest?logo=docker)](https://hub.docker.com/r/andrewbusbee/planning-poker)
-->

<!-- Project / GitHub -->
[![GitHub release](https://img.shields.io/github/v/release/andrew-busbee/planning-poker?logo=github)](https://github.com/andrew-busbee/planning-poker/releases)
[![Last commit](https://img.shields.io/github/last-commit/andrew-busbee/planning-poker?logo=github)](https://github.com/andrew-busbee/planning-poker/commits/main)

<!-- Docker Hub -->
[![Version](https://img.shields.io/docker/v/andrewbusbee/planning-poker?sort=semver&logo=docker&label=Version)](https://hub.docker.com/r/andrewbusbee/planning-poker/tags)
[![Pulls](https://img.shields.io/docker/pulls/andrewbusbee/planning-poker?logo=docker&label=Pulls)](https://hub.docker.com/r/andrewbusbee/planning-poker)
[![Image size](https://img.shields.io/docker/image-size/andrewbusbee/planning-poker/latest?logo=docker&label=Image%20size)](https://hub.docker.com/r/andrewbusbee/planning-poker)





# Planning Poker

A real-time planning poker application for agile estimation, deployable via Docker. No login required - each session creates a unique game URL that can be shared with team members.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://buymeacoffee.com/whatsnewandrew)

## Features

- 🎯 **Real-time voting** with WebSocket communication
- 🃏 **Multiple card decks**: Fibonacci, T-shirt sizing, Powers of 2, Linear, or create your own
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

| **Light Mode** | **Dark Mode** |
| -------------- | -------------- |
| ![New Game Menu - Light Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/new_game_light_mode.png) | ![New Game Menu - Dark Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/new_game_dark_mode.png) |

### Player View

| **Light Mode** | **Dark Mode** |
| -------------- | -------------- |
| ![Player View - Light Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/player_light_mode.png) | ![Player View - Dark Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/player_dark_mode.png) |

### Watcher View

| **Light Mode** | **Dark Mode** |
| -------------- | -------------- |
| ![Watcher View - Light Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/watcher_light_mode.png) | ![Watcher View - Dark Mode](https://github.com/andrew-busbee/planning-poker/blob/main/client/src/assets/watcher_dark_mode.png) |


## Quick Start with Docker

The easiest way to deploy the application is with Docker or Docker Compose.  The [sample docker-compose.yml](https://github.com/andrew-busbee/planning-poker/blob/main/docker-compose.yml) file has an optional healthcheck as well:

### Docker
```bash
docker run -d \
  --name planning-poker \
  -p 3001:3001 \
  -e PORT=3001 \
  --restart unless-stopped \
  andrewbusbee/planning-poker:latest

```

### Docker-compose
```yml
services:
  planning-poker:
    image: andrewbusbee/planning-poker:latest
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
    restart: unless-stopped
```

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions, please create an issue in the repository.

## License

MIT License - see LICENSE file for details