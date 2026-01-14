package core

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// VersionInfo holds version information
type VersionInfo struct {
	Version string `json:"version"`
}

// GetCurrentVersion reads the version from the embedded version file or returns unknown
func GetCurrentVersion() (string, error) {
	// Try to read from embedded version file
	execPath, err := os.Executable()
	if err != nil {
		return "unknown", err
	}

	execDir := filepath.Dir(execPath)
	versionFile := filepath.Join(execDir, "version.json")

	// Try executable_dir/version.json
	if data, err := os.ReadFile(versionFile); err == nil {
		var v VersionInfo
		if err := json.Unmarshal(data, &v); err == nil {
			return v.Version, nil
		}
	}

	// Try build/version.json (if build dir exists)
	buildVersionFile := filepath.Join(execDir, "build", "version.json")
	if data, err := os.ReadFile(buildVersionFile); err == nil {
		var v VersionInfo
		if err := json.Unmarshal(data, &v); err == nil {
			return v.Version, nil
		}
	}

	return "unknown", fmt.Errorf("version file not found")
}

// GetLatestVersion fetches the latest version from GitHub releases
func GetLatestVersion() (string, error) {
	resp, err := http.Get("https://api.github.com/repos/muellerluke/doclific/releases/latest")
	if err != nil {
		return "", fmt.Errorf("failed to fetch latest version: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch latest version: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var release struct {
		TagName string `json:"tag_name"`
	}
	if err := json.Unmarshal(body, &release); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return release.TagName, nil
}

// CompareVersions compares two version strings (e.g., "v1.2.3")
// Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
func CompareVersions(v1, v2 string) int {
	// Remove 'v' prefix if present
	v1 = strings.TrimPrefix(v1, "v")
	v2 = strings.TrimPrefix(v2, "v")

	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	for i := 0; i < maxLen; i++ {
		var p1, p2 int
		if i < len(parts1) {
			fmt.Sscanf(parts1[i], "%d", &p1)
		}
		if i < len(parts2) {
			fmt.Sscanf(parts2[i], "%d", &p2)
		}

		if p1 < p2 {
			return -1
		}
		if p1 > p2 {
			return 1
		}
	}

	return 0
}

// IsLatestVersion checks if the current version is the latest
func IsLatestVersion() (bool, string, string, error) {
	current, err := GetCurrentVersion()
	if err != nil {
		return false, current, "", err
	}

	latest, err := GetLatestVersion()
	if err != nil {
		return false, current, "", err
	}

	isLatest := CompareVersions(current, latest) >= 0
	return isLatest, current, latest, nil
}

// InstallLatestVersion installs the latest version using the install script
func InstallLatestVersion() error {
	// Get the install script URL
	installScriptURL := "https://raw.githubusercontent.com/muellerluke/doclific/main/scripts/install.sh"

	// Download the install script
	resp, err := http.Get(installScriptURL)
	if err != nil {
		return fmt.Errorf("failed to download install script: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download install script: status %d", resp.StatusCode)
	}

	// Create a temporary file for the script
	tmpFile, err := os.CreateTemp("", "doclific-install-*.sh")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	// Write the script to the temp file
	if _, err := io.Copy(tmpFile, resp.Body); err != nil {
		return fmt.Errorf("failed to write install script: %w", err)
	}
	tmpFile.Close()

	// Make it executable
	if err := os.Chmod(tmpFile.Name(), 0755); err != nil {
		return fmt.Errorf("failed to make script executable: %w", err)
	}

	// Execute the install script
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		// On Windows, we might need to use bash (if available via Git Bash or WSL)
		cmd = exec.Command("bash", tmpFile.Name())
	} else {
		cmd = exec.Command("sh", tmpFile.Name())
	}

	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("install script failed: %w", err)
	}

	return nil
}
