# Esteemed - Claude Context

Planning poker web application for agile estimation. Teams create rooms, vote on story points, and see results in real-time.

## What This Is

- **Live**: https://esteemed.fly.dev
- **GitHub**: https://github.com/victorfrederiknielsen/esteemed
- **Frontend**: React + TypeScript + Tailwind v4 at `frontend/`
- **Backend**: Go with hexagonal architecture at `backend/`
- **API**: ConnectRPC (gRPC-Web) defined in `api/proto/`

## Key Concepts

- **Rooms** have fun names like `brave-falcon-42` and auto-delete when empty
- **Participants** join with a name, get a session token for reconnection
- **Voting** uses Fibonacci cards (1, 2, 3, 5, 8, 13, 21, ?, ☕)
- **Host** can set topics, reveal votes, and reset rounds
- **Streaming** provides real-time updates via server-sent events

## Architecture

Backend uses hexagonal (ports & adapters) pattern:
- `domain/` - Pure business logic, no external deps
- `ports/` - Interfaces for driving (primary) and driven (secondary) sides
- `adapters/` - Implementations (ConnectRPC handlers, memory storage, pub/sub)
- `app/` - Application services that orchestrate domain logic

## Common Tasks

```bash
make dev-frontend   # Start Vite dev server
make dev-backend    # Start Go server
make proto          # Regenerate protobuf code
make build          # Production build
make docker-build   # Build container
make deploy         # Deploy to Fly.io
make lint           # Run all linters (Biome + golangci-lint)
make fmt            # Auto-fix formatting issues
make release        # Tag, create GitHub release, push to main
```

## Releasing to Main

**IMPORTANT**: Never push directly to main. Always use the release flow:

1. When asked to push to main, first ask: "Ready to release? This will auto-increment the version (currently vX.Y.Z) or you can specify a version."
2. Use `make release` to tag, create GitHub release, and push to main
3. To specify a version: `make release VERSION=v1.1.0`
4. Without VERSION, it auto-increments the patch version (v1.0.0 → v1.0.1)

This ensures every push to main has a corresponding GitHub release and tag.

## Infrastructure

### Fly.io Configuration

| Setting | Value |
|---------|-------|
| App name | `esteemed-poker` |
| Region | `lhr` (London) |
| VM | 256MB RAM, shared CPU |
| Auto-scaling | Scales to zero when idle |

### Persistent Storage

SQLite database stored on a Fly.io volume:

```
Volume: esteemed_data (1GB)
Mount:  /data
File:   /data/analytics.db
```

**Volume management:**
```bash
fly volumes list                    # List volumes
fly volumes create esteemed_data --size 1 --region lhr  # Create (one-time)
fly volumes extend <vol-id> --size 2  # Resize if needed
```

**Important**: Volumes are region-specific. The app and volume must be in the same region.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP server port |
| `SQLITE_PATH` | Auto-detected | Path to SQLite database |

**SQLITE_PATH auto-detection:**
- If `/data` exists → `/data/analytics.db` (production)
- Otherwise → `./analytics.db` (local development)

### Deployment

- **Platform**: Fly.io (auto-deploys on push to main via GitHub Actions)
- **Config**: `fly.toml`
- **CI/CD**: `.github/workflows/ci.yml`

```bash
fly deploy              # Manual deploy
fly logs                # View logs
fly ssh console         # SSH into container
fly apps restart        # Restart app
```

## Linting

- **Frontend**: Biome (`frontend/biome.json`) - lint + format in one tool
- **Backend**: golangci-lint (`backend/.golangci.yml`) - Go meta-linter

## Analytics

The app tracks usage analytics persisted to SQLite.

### Events Tracked
- `room_created` - When a new room is created
- `room_closed` - When a room is deleted (all participants left)
- `vote_cast` - Each vote submitted
- `vote_revealed` - When votes are revealed

### Storage
- **Production**: SQLite on Fly.io volume at `/data/analytics.db`
- **Local**: Auto-creates `./analytics.db` in backend directory
- Uses WAL mode for concurrent read/write performance

### API
ConnectRPC service at `esteemed.v1.AnalyticsService`:

```protobuf
rpc GetAnalytics(GetAnalyticsRequest) returns (GetAnalyticsResponse);
```

**Date Ranges & Granularity**:
| DateRange | Granularity | Labels |
|-----------|-------------|--------|
| TODAY | Hourly | "2 PM" |
| LAST_7_DAYS | Daily | "Jan 15" |
| LAST_30_DAYS | Daily | "Jan 15" |
| LAST_90_DAYS | Weekly | "Week 3" |
| ALL_TIME | Monthly | "Jan 2024" |

**Response includes**:
- Summary totals (rooms, votes, reveals, closures)
- Trend percentages vs previous period
- Time-series buckets with labels

### Fly.io Volume Setup
```bash
# One-time setup (already done)
fly volumes create esteemed_data --size 1 --region lhr
```

Volume mount configured in `fly.toml`:
```toml
[mounts]
  source = "esteemed_data"
  destination = "/data"
```

## File Locations

- Proto definitions: `api/proto/esteemed/v1/`
- Go handlers: `backend/internal/adapters/primary/connectrpc/`
- React pages: `frontend/src/pages/`
- React hooks: `frontend/src/hooks/`
- UI components: `frontend/src/components/ui/`
- Analytics SQLite adapter: `backend/internal/adapters/secondary/sqlite/`
