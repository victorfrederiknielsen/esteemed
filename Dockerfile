# Multi-stage build for Esteemed
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

ARG APP_VERSION=dev
ENV VITE_APP_VERSION=$APP_VERSION
RUN npm run build

# Stage 2: Build backend
FROM golang:1.24-alpine AS backend-builder

WORKDIR /app

# Install dependencies
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy source and build
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -o /server cmd/server/main.go

# Stage 3: Final image
FROM alpine:3.20

RUN apk --no-cache add ca-certificates

WORKDIR /app

# Copy built artifacts
COPY --from=backend-builder /server /app/server
COPY --from=frontend-builder /app/frontend/dist /app/static

# Set environment
ENV PORT=8080

EXPOSE 8080

CMD ["/app/server"]
