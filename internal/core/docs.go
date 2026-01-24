package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

	"github.com/google/uuid"
)

// FolderStructure represents a folder in the documentation structure
type FolderStructure struct {
	Name     string            `json:"name"`
	Title    string            `json:"title"`
	Icon     *string           `json:"icon,omitempty"`
	Order    int               `json:"order"`
	Children []FolderStructure `json:"children"`
}

// Config represents the config.json file structure
type Config struct {
	Title string  `json:"title"`
	Icon  *string `json:"icon,omitempty"`
	Order int     `json:"order"`
}

// scanDirectory recursively scans a directory and builds the folder structure
func scanDirectory(dirPath string) ([]FolderStructure, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read directory %s: %w", dirPath, err)
	}

	folders := []FolderStructure{}

	for _, entry := range entries {
		if entry.IsDir() {
			fullPath := filepath.Join(dirPath, entry.Name())
			children, err := scanDirectory(fullPath)
			if err != nil {
				return nil, err
			}

			// Default config
			config := Config{
				Title: entry.Name(),
				Icon:  nil,
			}

			// Try to read config.json file
			configPath := filepath.Join(fullPath, "config.json")
			configFile, err := os.ReadFile(configPath)
			if err != nil {
				return nil, fmt.Errorf("config file not found for %s: %w", entry.Name(), err)
			}

			if err := json.Unmarshal(configFile, &config); err != nil {
				return nil, fmt.Errorf("failed to parse config.json for %s: %w", entry.Name(), err)
			}

			// Ensure children is always an empty array, not nil
			if children == nil {
				children = []FolderStructure{}
			}

			folders = append(folders, FolderStructure{
				Name:     entry.Name(),
				Title:    config.Title,
				Icon:     config.Icon,
				Order:    config.Order,
				Children: children,
			})
		}
	}

	// Sort folders by order
	sort.Slice(folders, func(i, j int) bool {
		return folders[i].Order < folders[j].Order
	})

	return folders, nil
}

// GetDocs scans the doclific folder and returns the folder structure
func GetDocs() ([]FolderStructure, error) {
	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get current working directory: %w", err)
	}

	docsFolder := filepath.Join(cwd, "doclific")

	// Check if doclific folder exists
	if _, err := os.Stat(docsFolder); os.IsNotExist(err) {
		return []FolderStructure{}, nil
	}

	return scanDirectory(docsFolder)
}

// CreateDocResponse represents the response from CreateDoc
type CreateDocResponse struct {
	FilePath string  `json:"filePath"`
	URL      string  `json:"url"`
	Title    string  `json:"title"`
	Icon     *string `json:"icon,omitempty"`
}

// getDoclificPath returns the full path to a file/directory in the doclific folder
func getDoclificPath(filePath string) (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get current working directory: %w", err)
	}
	return filepath.Join(cwd, "doclific", filePath), nil
}

// GetDoc reads the content.mdx file from the specified doclific path
func GetDoc(filePath string) (string, error) {
	fullPath, err := getDoclificPath(filePath)
	if err != nil {
		return "", err
	}

	contentPath := filepath.Join(fullPath, "content.mdx")
	content, err := os.ReadFile(contentPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil // Return empty string if file doesn't exist (matching TypeScript undefined behavior)
		}
		return "", fmt.Errorf("failed to read content.mdx: %w", err)
	}

	return string(content), nil
}

// UpdateDoc writes content to the content.mdx file at the specified path
func UpdateDoc(filePath string, content string) error {
	fullPath, err := getDoclificPath(filePath)
	if err != nil {
		return err
	}

	contentPath := filepath.Join(fullPath, "content.mdx")
	if err := os.WriteFile(contentPath, []byte(content), 0644); err != nil {
		return fmt.Errorf("failed to write content.mdx: %w", err)
	}

	return nil
}

// CreateDoc creates a new documentation folder with a UUID name
func CreateDoc(filePath string, title string, icon *string) (*CreateDocResponse, error) {
	fullPath, err := getDoclificPath(filePath)
	if err != nil {
		return nil, err
	}

	// Generate a new UUID for the folder name
	newFolderName := uuid.New().String()
	newFolderPath := filepath.Join(fullPath, newFolderName)

	// Create the directory (recursive)
	if err := os.MkdirAll(newFolderPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create directory: %w", err)
	}

	// Create content.mdx file
	contentPath := filepath.Join(newFolderPath, "content.mdx")
	if err := os.WriteFile(contentPath, []byte(fmt.Sprintf("# %s\n", title)), 0644); err != nil {
		return nil, fmt.Errorf("failed to create content.mdx: %w", err)
	}

	// Create config.json file
	config := Config{
		Title: title,
		Icon:  icon,
	}
	configJSON, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %w", err)
	}

	configPath := filepath.Join(newFolderPath, "config.json")
	if err := os.WriteFile(configPath, configJSON, 0644); err != nil {
		return nil, fmt.Errorf("failed to create config.json: %w", err)
	}

	// Build the URL path (normalize path separators for URL - use forward slashes)
	var url string
	if filePath != "" {
		url = filePath + "/" + newFolderName
	} else {
		url = newFolderName
	}

	return &CreateDocResponse{
		FilePath: newFolderPath,
		URL:      url,
		Title:    title,
		Icon:     icon,
	}, nil
}

// DeleteDoc deletes a documentation folder recursively
func DeleteDoc(filePath string) error {
	fullPath, err := getDoclificPath(filePath)
	if err != nil {
		return err
	}

	if err := os.RemoveAll(fullPath); err != nil {
		return fmt.Errorf("failed to delete directory: %w", err)
	}

	return nil
}

type UpdateDocOrderRequestPayload struct {
	Name          string `json:"name"`
	UpdatedPath   string `json:"updatedPath"`
	BeforeSibling string `json:"beforeSibling"`
	AfterSibling  string `json:"afterSibling"`
}

// findDocParentPath recursively searches for a doc by name and returns its parent path relative to doclific
// Returns empty string if doc is at root level, or the parent path if nested
func findDocParentPath(dirPath string, name string, relativePath string) (string, bool, error) {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return "", false, fmt.Errorf("failed to read directory %s: %w", dirPath, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			if entry.Name() == name {
				// Found it - return the parent's relative path
				return relativePath, true, nil
			}

			// Recurse into subdirectory
			childRelPath := entry.Name()
			if relativePath != "" {
				childRelPath = filepath.Join(relativePath, entry.Name())
			}
			fullChildPath := filepath.Join(dirPath, entry.Name())
			found, ok, err := findDocParentPath(fullChildPath, name, childRelPath)
			if err != nil {
				return "", false, err
			}
			if ok {
				return found, true, nil
			}
		}
	}

	return "", false, nil // Not found at this level
}

// normalizeOrdersInDir reads all subdirectories, sorts them by current order, and renumbers them 0, 1, 2, ...
func normalizeOrdersInDir(dirPath string) error {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", dirPath, err)
	}

	// Collect all subdirectories with their current order
	type dirOrder struct {
		name  string
		order int
	}
	var dirs []dirOrder

	for _, entry := range entries {
		if entry.IsDir() {
			configPath := filepath.Join(dirPath, entry.Name(), "config.json")
			configFile, err := os.ReadFile(configPath)
			if err != nil {
				continue // Skip if no config
			}
			var config Config
			if err := json.Unmarshal(configFile, &config); err != nil {
				continue
			}
			dirs = append(dirs, dirOrder{name: entry.Name(), order: config.Order})
		}
	}

	// Sort by current order
	sort.Slice(dirs, func(i, j int) bool {
		return dirs[i].order < dirs[j].order
	})

	// Renumber 0, 1, 2, ...
	for i, dir := range dirs {
		configPath := filepath.Join(dirPath, dir.name, "config.json")
		configFile, err := os.ReadFile(configPath)
		if err != nil {
			continue
		}
		var config Config
		if err := json.Unmarshal(configFile, &config); err != nil {
			continue
		}
		config.Order = i
		configJSON, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			continue
		}
		os.WriteFile(configPath, configJSON, 0644)
	}

	return nil
}

// reorderDocInDir positions a doc relative to siblings and renumbers all docs in the directory
func reorderDocInDir(dirPath string, docName string, beforeSibling string, afterSibling string) error {
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		return fmt.Errorf("failed to read directory %s: %w", dirPath, err)
	}

	// Collect all subdirectories with their current order, excluding the doc being moved
	type dirOrder struct {
		name  string
		order int
	}
	var dirs []dirOrder

	for _, entry := range entries {
		if entry.IsDir() && entry.Name() != docName {
			configPath := filepath.Join(dirPath, entry.Name(), "config.json")
			configFile, err := os.ReadFile(configPath)
			if err != nil {
				continue
			}
			var config Config
			if err := json.Unmarshal(configFile, &config); err != nil {
				continue
			}
			dirs = append(dirs, dirOrder{name: entry.Name(), order: config.Order})
		}
	}

	// Sort by current order
	sort.Slice(dirs, func(i, j int) bool {
		return dirs[i].order < dirs[j].order
	})

	// Find insertion position based on siblings
	insertIdx := len(dirs) // Default: append to end

	if afterSibling != "" {
		// Insert after the afterSibling
		for i, dir := range dirs {
			if dir.name == afterSibling {
				insertIdx = i + 1
				break
			}
		}
	} else if beforeSibling != "" {
		// Insert before the beforeSibling
		for i, dir := range dirs {
			if dir.name == beforeSibling {
				insertIdx = i
				break
			}
		}
	}

	// Insert the doc at the correct position
	newDirs := make([]dirOrder, 0, len(dirs)+1)
	newDirs = append(newDirs, dirs[:insertIdx]...)
	newDirs = append(newDirs, dirOrder{name: docName, order: 0})
	newDirs = append(newDirs, dirs[insertIdx:]...)

	// Write new orders to all config files
	for i, dir := range newDirs {
		configPath := filepath.Join(dirPath, dir.name, "config.json")
		configFile, err := os.ReadFile(configPath)
		if err != nil {
			continue
		}
		var config Config
		if err := json.Unmarshal(configFile, &config); err != nil {
			continue
		}
		config.Order = i
		configJSON, err := json.MarshalIndent(config, "", "  ")
		if err != nil {
			continue
		}
		os.WriteFile(configPath, configJSON, 0644)
	}

	return nil
}

// UpdateDocOrder finds the doc by name, moves it if path differs, positions it relative to siblings, and normalizes orders
func UpdateDocOrder(payload UpdateDocOrderRequestPayload) error {
	doclificPath, err := getDoclificPath("")
	if err != nil {
		return err
	}

	// Find the current parent path of the doc by searching recursively
	currentParentPath, found, err := findDocParentPath(doclificPath, payload.Name, "")
	if err != nil {
		return fmt.Errorf("failed to find doc: %w", err)
	}
	if !found {
		return fmt.Errorf("doc with name %s not found", payload.Name)
	}

	currentFullPath := filepath.Join(doclificPath, currentParentPath, payload.Name)

	// Normalize the updated parent path (it may have forward slashes from frontend)
	updatedParentPath := filepath.FromSlash(payload.UpdatedPath)
	updatedFullPath := filepath.Join(doclificPath, updatedParentPath, payload.Name)

	sourceParentFullPath := filepath.Join(doclificPath, currentParentPath)
	destParentFullPath := filepath.Join(doclificPath, updatedParentPath)

	// If path differs, move the folder
	pathChanged := currentParentPath != updatedParentPath
	if pathChanged {
		// Ensure the destination parent directory exists
		if err := os.MkdirAll(destParentFullPath, 0755); err != nil {
			return fmt.Errorf("failed to create parent directory: %w", err)
		}

		// Move the folder
		if err := os.Rename(currentFullPath, updatedFullPath); err != nil {
			return fmt.Errorf("failed to move folder from %s to %s: %w", currentFullPath, updatedFullPath, err)
		}
	}

	// Reorder the doc in the destination directory based on siblings
	if err := reorderDocInDir(destParentFullPath, payload.Name, payload.BeforeSibling, payload.AfterSibling); err != nil {
		return fmt.Errorf("failed to reorder doc: %w", err)
	}

	// If the doc was moved, also normalize orders in the source directory
	if pathChanged && sourceParentFullPath != destParentFullPath {
		if err := normalizeOrdersInDir(sourceParentFullPath); err != nil {
			return fmt.Errorf("failed to normalize orders in source: %w", err)
		}
	}

	return nil
}
