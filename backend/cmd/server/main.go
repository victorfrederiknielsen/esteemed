package main

import (
	"context"
	"log"
	"math/rand"
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
	"github.com/vicmanager/esteemed/backend/internal/app"
)

func main() {
	// Seed random for room name generation
	rand.Seed(time.Now().UnixNano())

	// Get port from environment or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize secondary adapters (driven)
	roomRepo := memory.NewRoomRepository()
	eventBroker := pubsub.NewBroker()

	// Initialize application services
	roomService := app.NewRoomService(roomRepo, eventBroker)
	estimationService := app.NewEstimationService(roomRepo, eventBroker)

	// Initialize primary adapters (driving)
	roomHandler := connectrpc.NewRoomHandler(roomService)
	estimationHandler := connectrpc.NewEstimationHandler(estimationService)

	// Set up HTTP mux
	mux := http.NewServeMux()

	// Register ConnectRPC handlers
	roomPath, roomSvc := roomHandler.Handler()
	mux.Handle(roomPath, roomSvc)

	estimationPath, estimationSvc := estimationHandler.Handler()
	mux.Handle(estimationPath, estimationSvc)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
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
