package server

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"scheduler/internal/config"
)

// Start initializes and starts the HTTP server
func Start(cfg *config.Config) {
	// Create router
	mux := http.NewServeMux()

	// Register handlers
	registerHandlers(mux, cfg)

	// Wrap with logging middleware
	loggedMux := logMiddleware(mux)

	// Start server
	log.Printf("Starting HTTP server on port %s", cfg.HTTPPort)
	if err := http.ListenAndServe(":"+cfg.HTTPPort, loggedMux); err != nil {
		log.Fatalf("HTTP server error: %v", err)
	}
}

// logMiddleware adds request logging to all routes
func logMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log the request before processing
		log.Printf("Request received: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)

		// Call the next handler
		next.ServeHTTP(w, r)

		// Log after processing with duration
		duration := time.Since(start)
		log.Printf("Request completed: %s %s - took %v", r.Method, r.URL.Path, duration)
	})
}

// registerHandlers sets up all HTTP routes
func registerHandlers(mux *http.ServeMux, cfg *config.Config) {
	// Static file server for images
	mux.HandleFunc("/images/", func(w http.ResponseWriter, r *http.Request) {
		serveImageFile(w, r, cfg.ImagesPath)
	})

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Add more handlers as needed
}

// serveImageFile serves static image files
func serveImageFile(w http.ResponseWriter, r *http.Request, basePath string) {
	// Strip the /images/ prefix
	relativePath := strings.TrimPrefix(r.URL.Path, "/images/")
	cleanRelativePath := filepath.Clean(relativePath)
	cleanBasePath := filepath.Clean(basePath)
	fullPath := filepath.Join(cleanBasePath, cleanRelativePath)

	log.Printf("Serving image: %s (full path: %s)", relativePath, fullPath)

	// Security check to prevent directory traversal
	if !strings.HasPrefix(filepath.Clean(fullPath), cleanBasePath) {
		log.Println("Security check failed:", filepath.Clean(fullPath), "doesn't start with", cleanBasePath)
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Check if the file exists
	if _, err := os.Stat(fullPath); os.IsNotExist(err) {
		log.Printf("Image not found: %s", fullPath)
		http.NotFound(w, r)
		return
	}

	// Serve the file
	http.ServeFile(w, r, fullPath)
}
