package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"

	"github.com/vicmanager/esteemed/backend/internal/adapters/primary/connectrpc"
	"github.com/vicmanager/esteemed/backend/internal/adapters/secondary/memory"
	"github.com/vicmanager/esteemed/backend/internal/adapters/secondary/pubsub"
	"github.com/vicmanager/esteemed/backend/internal/adapters/secondary/sqlite"
	"github.com/vicmanager/esteemed/backend/internal/app"
)

func main() {

	// Get port from environment or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Get SQLite path from environment or use smart default
	sqlitePath := os.Getenv("SQLITE_PATH")
	if sqlitePath == "" {
		// Use /data in production (Fly.io volume), otherwise local file
		if _, err := os.Stat("/data"); err == nil {
			sqlitePath = "/data/analytics.db"
		} else {
			sqlitePath = "./analytics.db"
		}
	}

	// Initialize secondary adapters (driven)
	roomRepo := memory.NewRoomRepository()
	eventBroker := pubsub.NewBroker()
	appEventBroker := pubsub.NewAppEventBroker()

	// Initialize analytics repository (optional - log error but continue if fails)
	analyticsRepo, err := sqlite.NewAnalyticsRepository(sqlitePath)
	if err != nil {
		log.Printf("Warning: Failed to initialize analytics: %v (analytics will be disabled)", err)
	}

	// Initialize application services
	roomService := app.NewRoomService(roomRepo, eventBroker, analyticsRepo, appEventBroker)
	estimationService := app.NewEstimationService(roomRepo, eventBroker, analyticsRepo, appEventBroker)
	analyticsService := app.NewAnalyticsService(analyticsRepo)

	// Initialize and start room cleaner
	roomCleaner := app.NewRoomCleaner(roomRepo, eventBroker)
	cleanupCtx, cleanupCancel := context.WithCancel(context.Background())
	roomCleaner.Start(cleanupCtx)

	// Initialize primary adapters (driving)
	roomHandler := connectrpc.NewRoomHandler(roomService)
	estimationHandler := connectrpc.NewEstimationHandler(estimationService)
	analyticsHandler := connectrpc.NewAnalyticsHandler(analyticsService)
	eventHandler := connectrpc.NewEventHandler(appEventBroker)

	// Set up HTTP mux
	mux := http.NewServeMux()

	// Register ConnectRPC handlers
	roomPath, roomSvc := roomHandler.Handler()
	mux.Handle(roomPath, roomSvc)

	estimationPath, estimationSvc := estimationHandler.Handler()
	mux.Handle(estimationPath, estimationSvc)

	analyticsPath, analyticsSvc := analyticsHandler.Handler()
	mux.Handle(analyticsPath, analyticsSvc)

	eventPath, eventSvc := eventHandler.Handler()
	mux.Handle(eventPath, eventSvc)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// Serve static files from /app/static (production) or fall back to API-only mode
	staticDir := "./static"
	if _, err := os.Stat(staticDir); err == nil {
		// Serve static files, with SPA fallback to index.html
		mux.Handle("/", spaHandler(staticDir))
	}

	// CORS middleware for development
	handler := corsMiddleware(mux)

	// Use h2c for HTTP/2 without TLS (required for Connect)
	server := &http.Server{
		Addr:    ":" + port,
		Handler: h2c.NewHandler(handler, &http2.Server{}),
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Println("Shutting down server...")

		// Stop room cleaner
		cleanupCancel()

		// Close analytics database
		if analyticsRepo != nil {
			if err := analyticsRepo.Close(); err != nil {
				log.Printf("Error closing analytics database: %v", err)
			}
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Printf("Error during shutdown: %v", err)
		}
	}()

	log.Printf("Server starting on :%s", port)
	if err := server.ListenAndServe(); err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}

// corsMiddleware adds CORS headers for development
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow requests from Vite dev server
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, Connect-Protocol-Version, Connect-Timeout-Ms")
		w.Header().Set("Access-Control-Expose-Headers", "Connect-Protocol-Version, Grpc-Status, Grpc-Message, Grpc-Status-Details-Bin")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// spaHandler serves static files and falls back to index.html for SPA routing
func spaHandler(staticDir string) http.Handler {
	fs := http.Dir(staticDir)
	fileServer := http.FileServer(fs)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Try to serve the file directly
		filePath := filepath.Join(staticDir, path)
		if info, err := os.Stat(filePath); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(w, r)
			return
		}

		// Check if it's a static asset request (has file extension)
		if strings.Contains(path, ".") {
			// File not found, return 404
			http.NotFound(w, r)
			return
		}

		// SPA fallback: serve index.html for all other routes
		http.ServeFile(w, r, filepath.Join(staticDir, "index.html"))
	})
}
