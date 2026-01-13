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

// StartServer starts the HTTP server on the specified port
func StartServer(port int) error {
	mux := http.NewServeMux()

	// Get the project root directory
	projectRoot, err := getProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to get project root: %w", err)
	}

	// Serve static files from web/build directory
	buildDir := filepath.Join(projectRoot, "web", "build")
	if _, err := os.Stat(buildDir); os.IsNotExist(err) {
		return fmt.Errorf("build directory not found: %s. Please build the frontend first", buildDir)
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

	if err := http.ListenAndServe(addr, mux); err != nil {
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

