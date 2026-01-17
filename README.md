# Esteemed

A real-time planning poker application for engineering teams. Estimate story points collaboratively with your team using a clean, modern interface.

## Features

- **Real-time collaboration** - See when teammates join and vote instantly
- **Fun room names** - Memorable URLs like `brave-falcon-42`
- **Fibonacci deck** - 1, 2, 3, 5, 8, 13, 21, ?, ☕
- **Vote statistics** - Average, mode, and consensus detection
- **Session persistence** - Reconnect automatically if you refresh
- **Host controls** - Set topics, reveal votes, reset rounds

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React 19 + TypeScript + Tailwind CSS v4 |
| Backend | Go with hexagonal architecture |
| Linting | Biome (frontend) + golangci-lint (backend) |
| Communication | ConnectRPC (gRPC-Web compatible, no proxy needed) |
| Deployment | Fly.io with GitHub Actions CI/CD |

## Quick Start

### Prerequisites

- Go 1.23+
- Node.js 22+
- [Buf CLI](https://buf.build/docs/installation) (for proto generation)

### Development

```bash
# Install frontend dependencies
cd frontend && npm install && cd ..

# Generate protobuf code (requires buf CLI)
make proto

# Run backend (terminal 1)
make dev-backend

# Run frontend (terminal 2)
make dev-frontend
```

The frontend runs at `http://localhost:5173` and proxies API requests to the backend at `http://localhost:8080`.

### Production Build

```bash
# Build Docker image
make docker-build

# Run container
make docker-run
```

## Project Structure

```
esteemed/
├── api/proto/              # Protobuf service definitions
│   └── esteemed/v1/
│       ├── room.proto      # Room management service
│       └── estimation.proto # Voting service
├── backend/
│   ├── cmd/server/         # Application entrypoint
│   ├── internal/
│   │   ├── domain/         # Core business logic (no dependencies)
│   │   ├── ports/          # Interface definitions
│   │   │   ├── primary/    # Driving ports (how app is used)
│   │   │   └── secondary/  # Driven ports (what app uses)
│   │   ├── adapters/       # Interface implementations
│   │   │   ├── primary/    # ConnectRPC handlers
│   │   │   └── secondary/  # Memory repo, pub/sub broker
│   │   └── app/            # Application services
│   └── gen/                # Generated protobuf code
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── ui/         # Reusable UI components
│   │   │   └── room/       # Room-specific components
│   │   ├── hooks/          # React hooks (useRoom, useVoting)
│   │   ├── lib/            # Utilities and API client
│   │   ├── pages/          # Route pages
│   │   └── gen/            # Generated types
│   └── index.html
├── fly.toml                # Fly.io configuration
├── Dockerfile              # Multi-stage build
├── Makefile                # Build automation
├── buf.yaml                # Buf configuration
└── buf.gen.yaml            # Proto generation config
```

## Architecture

The backend follows **hexagonal architecture** (ports and adapters):

```
┌─────────────────────────────────────┐
│        ConnectRPC Handlers          │  ← Primary Adapters
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      RoomService, EstimationService │  ← Primary Ports (interfaces)
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│        Application Services         │  ← Orchestration
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│             Domain                  │  ← Pure business logic
│   (Room, Participant, Vote, etc.)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  RoomRepository, EventPublisher     │  ← Secondary Ports (interfaces)
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   MemoryRepo, ChannelPubSub         │  ← Secondary Adapters
└─────────────────────────────────────┘
```

**Benefits:**
- Domain logic has zero external dependencies
- Easy to swap implementations (memory → PostgreSQL)
- Testable in isolation
- Clear separation of concerns

## API

### RoomService

| Method | Description |
|--------|-------------|
| `CreateRoom` | Create a room with generated name |
| `JoinRoom` | Join an existing room |
| `LeaveRoom` | Leave a room |
| `GetRoom` | Get current room state |
| `WatchRoom` | Stream real-time room events |

### EstimationService

| Method | Description |
|--------|-------------|
| `CastVote` | Submit your estimate |
| `RevealVotes` | Reveal all votes (host only) |
| `ResetRound` | Clear votes for new round |
| `SetTopic` | Set the current topic |
| `WatchVotes` | Stream real-time vote events |

## Makefile Commands

```bash
make dev            # Run frontend + backend
make dev-backend    # Go server on :8080
make dev-frontend   # Vite on :5173
make proto          # Generate Go + TypeScript from proto
make build          # Build production artifacts
make docker-build   # Build container image
make docker-run     # Run container locally
make deploy         # Deploy to Fly.io
make test           # Run all tests
make lint           # Run all linters (Biome + golangci-lint)
make fmt            # Auto-fix formatting
make clean          # Remove build artifacts
```

## Deployment

### Fly.io (Primary)

The app deploys automatically to [Fly.io](https://fly.io) when pushing to `main`.

**CI/CD Pipeline** (`.github/workflows/ci.yml`):
1. Lint frontend (Biome)
2. Build frontend
3. Build backend
4. Deploy to Fly.io (on main branch only)

**Manual deployment:**
```bash
flyctl deploy
```

**Configuration** (`fly.toml`):
- App: `esteemed-poker`
- Region: `lhr` (London)
- Auto-scaling: scales to 0 when idle

**Required secrets:**
- `FLY_API_TOKEN` - Set in GitHub repository secrets for CI/CD

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server listen port |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `make test` and `make lint`
5. Submit a pull request

## License

MIT
