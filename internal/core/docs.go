package core

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

// FolderStructure represents a folder in the documentation structure
type FolderStructure struct {
	Name     string            `json:"name"`
	Title    string            `json:"title"`
	Icon     *string           `json:"icon,omitempty"`
	Children []FolderStructure `json:"children"`
}

// Config represents the config.json file structure
type Config struct {
	Title string  `json:"title"`
	Icon  *string `json:"icon,omitempty"`
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
				Children: children,
			})
		}
	}

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
	if err := os.WriteFile(contentPath, []byte("# Hello World\n"), 0644); err != nil {
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

