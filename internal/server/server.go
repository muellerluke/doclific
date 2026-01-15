package server

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"
)

// corsMiddleware adds CORS headers to all responses
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Continue with the request
		next.ServeHTTP(w, r)
	})
}

// StartServer starts the HTTP server on the specified port
func StartServer(port int) error {
	mux := http.NewServeMux()

	// Find the build directory relative to the executable
	buildDir, err := findBuildDir()
	if err != nil {
		return fmt.Errorf("failed to find build directory: %w", err)
	}

	// Register all API routes
	RegisterRoutes(mux)

	// Serve static files with catch-all for SPA routing
	fs := http.FileServer(http.Dir(buildDir))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Don't interfere with API routes
		if r.URL.Path == "/api" || len(r.URL.Path) > 4 && r.URL.Path[:4] == "/api" {
			http.NotFound(w, r)
			return
		}

		// Check if the requested file exists
		filePath := filepath.Join(buildDir, r.URL.Path)
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// File doesn't exist, serve index.html for SPA routing
			indexPath := filepath.Join(buildDir, "index.html")
			http.ServeFile(w, r, indexPath)
			return
		}

		// File exists, serve it
		fs.ServeHTTP(w, r)
	})

	addr := fmt.Sprintf(":%d", port)
	url := fmt.Sprintf("http://localhost%s", addr)
	
	// Pretty server startup log
	fmt.Println()
	fmt.Println("╔═══════════════════════════════════════════════════════════╗")
	fmt.Println("║                                                           ║")
	fmt.Println("║                   🚀  Doclific Server                     ║")
	fmt.Println("║                                                           ║")
	fmt.Printf("║        Server running at: %-32s║\n", url)
	fmt.Println("║                                                           ║")
	fmt.Println("╚═══════════════════════════════════════════════════════════╝")
	fmt.Println()

	// Open browser in a goroutine with a small delay to ensure server is ready
	go func() {
		time.Sleep(500 * time.Millisecond)
		if err := openBrowser(url); err != nil {
			log.Printf("Failed to open browser: %v", err)
		}
	}()

	// Wrap the mux with CORS middleware
	handler := corsMiddleware(mux)

	if err := http.ListenAndServe(addr, handler); err != nil {
		return fmt.Errorf("server error: %w", err)
	}

	return nil
}

// openBrowser opens the specified URL in the default browser
func openBrowser(url string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default: // linux and others
		cmd = exec.Command("xdg-open", url)
	}
	return cmd.Start()
}

// findBuildDir finds the web/build directory using multiple strategies
func findBuildDir() (string, error) {
	// Strategy 1: Look relative to the executable
	execPath, err := os.Executable()
	if err == nil {
		execDir := filepath.Dir(execPath)
		// Try: executable_dir/web/build
		buildDir := filepath.Join(execDir, "web", "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
		// Try: executable_dir/build (if web/build is copied to build)
		buildDir = filepath.Join(execDir, "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
		// Try: parent of executable_dir/web/build (if executable is in cmd/)
		buildDir = filepath.Join(filepath.Dir(execDir), "web", "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
	}

	// Strategy 2: Look in current working directory
	cwd, err := os.Getwd()
	if err == nil {
		// Try: cwd/web/build
		buildDir := filepath.Join(cwd, "web", "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
		// Try: cwd/build
		buildDir = filepath.Join(cwd, "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
	}

	// Strategy 3: Look for project root (for development)
	projectRoot, err := getProjectRoot()
	if err == nil {
		buildDir := filepath.Join(projectRoot, "web", "build")
		if _, err := os.Stat(buildDir); err == nil {
			return buildDir, nil
		}
	}

	return "", fmt.Errorf("build directory not found. Tried: executable_dir/web/build, executable_dir/build, cwd/web/build, cwd/build, project_root/web/build")
}

// getProjectRoot finds the project root directory by looking for go.mod
func getProjectRoot() (string, error) {
	dir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}

		parent := filepath.Dir(dir)
		if parent == dir {
			return "", fmt.Errorf("could not find project root (go.mod not found)")
		}
		dir = parent
	}
}

