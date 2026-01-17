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
```

## Deployment

- **Platform**: Fly.io (auto-deploys on push to main via GitHub Actions)
- **Config**: `fly.toml`
- **CI/CD**: `.github/workflows/ci.yml`

## Linting

- **Frontend**: Biome (`frontend/biome.json`) - lint + format in one tool
- **Backend**: golangci-lint (`backend/.golangci.yml`) - Go meta-linter

## File Locations

- Proto definitions: `api/proto/esteemed/v1/`
- Go handlers: `backend/internal/adapters/primary/connectrpc/`
- React pages: `frontend/src/pages/`
- React hooks: `frontend/src/hooks/`
- UI components: `frontend/src/components/ui/`
