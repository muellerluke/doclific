package core

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	gitignore "github.com/sabhiram/go-gitignore"
)

// FileNode represents a file or directory in the file system
type FileNode struct {
	Path     string      `json:"path"`
	Name     string      `json:"name"`
	Type     string      `json:"type"` // "file" or "directory"
	Children []FileNode  `json:"children,omitempty"`
}

// Create the doclific folder
func CreateDoclificFolder() error {
	cwd, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current working directory: %w", err)
	}
	doclificFolder := filepath.Join(cwd, "doclific")
	return os.MkdirAll(doclificFolder, 0755)
}

// GetFolderContents gets all contents of a folder given a filePath
func GetFolderContents(filePath string) ([]FileNode, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get current working directory: %w", err)
	}

	var fullPath string
	if filePath != "" {
		fullPath = filepath.Join(cwd, filePath)
	} else {
		fullPath = cwd
	}

	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory: %w", err)
	}

	var nodes []FileNode
	for _, entry := range entries {
		nodeType := "file"
		if entry.IsDir() {
			nodeType = "directory"
		}

		var nodePath string
		if filePath != "" {
			nodePath = filepath.Join(filePath, entry.Name())
		} else {
			nodePath = entry.Name()
		}

		// Normalize path separators to forward slashes for consistency
		nodePath = strings.ReplaceAll(nodePath, string(filepath.Separator), "/")

		nodes = append(nodes, FileNode{
			Path: nodePath,
			Name: entry.Name(),
			Type: nodeType,
		})
	}

	return nodes, nil
}

// GetFileContents reads a file and returns its contents as a string
func GetFileContents(filePath string) (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get current working directory: %w", err)
	}

	fullPath := filepath.Join(cwd, filePath)
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to get file contents for %s: %w", filePath, err)
	}

	return string(content), nil
}

// GetFlatFileList recursively scans a directory and returns a flat list of all file paths
// It respects .gitignore patterns and excludes .git directories
func GetFlatFileList(dir string, fileList []string, baseDir string, ignoreInstance *gitignore.GitIgnore) ([]string, error) {
	// Use current directory if dir is empty
	if dir == "" {
		var err error
		dir, err = os.Getwd()
		if err != nil {
			return nil, fmt.Errorf("failed to get current working directory: %w", err)
		}
	}

	// Use dir as baseDir if baseDir is empty
	if baseDir == "" {
		baseDir = dir
	}

	// Load .gitignore on first call
	if ignoreInstance == nil {
		gitignorePath := filepath.Join(baseDir, ".gitignore")
		var gitignoreContent string
		if _, err := os.Stat(gitignorePath); err == nil {
			content, err := os.ReadFile(gitignorePath)
			if err == nil {
				gitignoreContent = string(content)
			}
		}
		ignoreInstance = gitignore.CompileIgnoreLines(strings.Split(gitignoreContent, "\n")...)
	}

	items, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory %s: %w", dir, err)
	}

	for _, item := range items {
		fullPath := filepath.Join(dir, item.Name())
		relativePath, err := filepath.Rel(baseDir, fullPath)
		if err != nil {
			continue
		}

		// Normalize path separators for gitignore matching
		relativePathNormalized := strings.ReplaceAll(relativePath, string(filepath.Separator), "/")

		// Check if path should be ignored
		// For directories, also check with trailing slash to match patterns like "node_modules/"
		shouldIgnore := ignoreInstance.MatchesPath(relativePathNormalized) ||
			strings.HasPrefix(relativePathNormalized, ".git")
		
		if !shouldIgnore && item.IsDir() {
			// Check directory pattern with trailing slash
			shouldIgnore = ignoreInstance.MatchesPath(relativePathNormalized + "/")
		}

		if shouldIgnore {
			continue
		}

		info, err := item.Info()
		if err != nil {
			continue
		}

		if info.IsDir() {
			// Include directory path itself with trailing slash
			fileList = append(fileList, relativePathNormalized+"/")
			// Recurse into the subdirectory
			fileList, err = GetFlatFileList(fullPath, fileList, baseDir, ignoreInstance)
			if err != nil {
				return nil, err
			}
		} else {
			fileList = append(fileList, relativePathNormalized)
		}
	}

	return fileList, nil
}

