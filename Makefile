.PHONY: dev dev-backend dev-frontend proto build docker-build k8s-deploy frontend-setup frontend-components clean test up down logs

# Development
dev: dev-backend dev-frontend

dev-backend:
	cd backend && go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

# Proto generation (requires buf CLI)
proto:
	buf generate

proto-lint:
	buf lint

# Build
build: build-backend build-frontend

build-backend:
	cd backend && go build -o bin/server cmd/server/main.go

build-frontend:
	cd frontend && npm run build

# Docker
docker-build:
	docker build -t esteemed:latest .

docker-run:
	docker run -p 8080:8080 esteemed:latest

# Docker Compose (local dev with hot reload)
up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

# Kubernetes
k8s-deploy:
	kubectl apply -k k8s/overlays/production

k8s-delete:
	kubectl delete -k k8s/overlays/production

# Frontend setup
frontend-setup:
	cd frontend && npm install

# Testing
test: test-backend test-frontend

test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm test

# Go dependencies
deps:
	cd backend && go mod download && go mod tidy

# Clean
clean:
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf backend/gen
	rm -rf frontend/src/gen

# Generate TypeScript and Go code from protos
gen: proto

# Format code
fmt:
	cd backend && go fmt ./...
	cd frontend && npm run lint -- --fix

# Help
help:
	@echo "Available targets:"
	@echo "  dev            - Run frontend + backend dev servers"
	@echo "  dev-backend    - Go server on :8080"
	@echo "  dev-frontend   - Vite on :5173"
	@echo "  up             - Start both services with Docker Compose (hot reload)"
	@echo "  down           - Stop Docker Compose services"
	@echo "  logs           - Follow Docker Compose logs"
	@echo "  proto          - Generate Go + TypeScript from proto"
	@echo "  build          - Build production artifacts"
	@echo "  docker-build   - Build container image"
	@echo "  k8s-deploy     - Deploy to Kubernetes"
	@echo "  frontend-setup - npm install"
	@echo "  test           - Run all tests"
	@echo "  clean          - Remove build artifacts"
