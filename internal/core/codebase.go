package core

import (
	"bufio"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	gitignore "github.com/sabhiram/go-gitignore"
)

// NormalizeContent strips all whitespace from content for hash comparison
func NormalizeContent(content string) string {
	// Remove all whitespace characters (spaces, tabs, newlines, carriage returns)
	var result strings.Builder
	for _, r := range content {
		if r != ' ' && r != '\t' && r != '\n' && r != '\r' {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// HashContent returns SHA256 hash of normalized content
func HashContent(content string) string {
	normalized := NormalizeContent(content)
	hash := sha256.Sum256([]byte(normalized))
	return hex.EncodeToString(hash[:])
}

// FileNode represents a file or directory in the file system
type FileNode struct {
	Path     string     `json:"path"`
	Name     string     `json:"name"`
	Type     string     `json:"type"` // "file" or "directory"
	Children []FileNode `json:"children,omitempty"`
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

type FileMetadata struct {
	Path    string   `json:"path"`
	Ext     string   `json:"ext"`
	Symbols []string `json:"symbols"`
	Hints   []string `json:"hints"`
}

var (
	// Universal declaration regex
	declRegex = regexp.MustCompile(`\b(class|struct|interface|enum|type|model|entity)\s+([A-Za-z_][A-Za-z0-9_]*)`)

	// Import-like lines (very loose on purpose)
	importRegex = regexp.MustCompile(`^(import|from|using|require|\#include)\b`)

	// Relationship / ERD signals
	relationshipRegexes = []*regexp.Regexp{
		regexp.MustCompile(`\b[A-Za-z_][A-Za-z0-9_]*(Id|ID|_id)\b`),
		regexp.MustCompile(`\b(hasMany|belongsTo|manyToMany|oneToMany|references|manyToOne)\b`),
		regexp.MustCompile(`\b(List<|Array<|\[\]|Set<)`),
	}

	// ORM / persistence keywords (substring match)
	persistenceKeywords = []string{
		"gorm", "prisma", "sequelize", "typeorm", "sqlalchemy",
		"django", "activerecord", "ent", "knex", "mongoose",
		"model", "entity", "schema", "table", "column", "drizzle",
	}

	// Header comments
	commentRegex = regexp.MustCompile(`^(\/\/|#|\/\*|\*)\s?.+`)
)

// It respects .gitignore patterns and excludes .git directories
func GetFileListAndMetadata(
	dir string,
	fileList []FileMetadata,
	baseDir string,
	ignoreInstance *gitignore.GitIgnore,
) ([]FileMetadata, error) {

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

	// Load .gitignore once
	if ignoreInstance == nil {
		gitignorePath := filepath.Join(baseDir, ".gitignore")
		var gitignoreContent string

		if content, err := os.ReadFile(gitignorePath); err == nil {
			gitignoreContent = string(content)
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

		relativePath = strings.ReplaceAll(relativePath, string(filepath.Separator), "/")

		shouldIgnore := ignoreInstance.MatchesPath(relativePath) ||
			strings.HasPrefix(relativePath, ".git")

		if !shouldIgnore && item.IsDir() {
			shouldIgnore = ignoreInstance.MatchesPath(relativePath + "/")
		}

		if shouldIgnore {
			continue
		}

		if item.IsDir() {
			fileList, err = GetFileListAndMetadata(fullPath, fileList, baseDir, ignoreInstance)
			if err != nil {
				return nil, err
			}
			continue
		}

		ext := filepath.Ext(item.Name())
		if ext == "" {
			continue
		}

		// Skip obvious binary assets
		switch ext {
		case ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
			".pdf", ".zip", ".tar", ".gz", ".exe", ".bin":
			continue
		}

		symbols, hints := extractMetadataFromFile(fullPath)

		fileList = append(fileList, FileMetadata{
			Path:    relativePath,
			Ext:     ext,
			Symbols: symbols,
			Hints:   hints,
		})
	}

	return fileList, nil
}

func extractMetadataFromFile(path string) (symbols []string, hints []string) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)

	const maxLines = 120
	lineCount := 0

	symbolSet := map[string]struct{}{}
	hintSet := map[string]struct{}{}

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		lineCount++

		if line == "" {
			if lineCount > 20 {
				break
			}
			continue
		}

		// Header comments (only at top)
		if lineCount <= 10 && commentRegex.MatchString(line) {
			hintSet[line] = struct{}{}
			continue
		}

		// Declarations → symbols + hints
		if matches := declRegex.FindStringSubmatch(line); len(matches) == 3 {
			symbolSet[matches[2]] = struct{}{}
			hintSet[line] = struct{}{}
		}

		// Imports
		if importRegex.MatchString(line) {
			hintSet[line] = struct{}{}
		}

		// Relationship signals
		for _, re := range relationshipRegexes {
			if re.MatchString(line) {
				hintSet[line] = struct{}{}
				break
			}
		}

		// Persistence keywords
		lower := strings.ToLower(line)
		for _, kw := range persistenceKeywords {
			if strings.Contains(lower, kw) {
				hintSet[line] = struct{}{}
				break
			}
		}

		if lineCount >= maxLines {
			break
		}
	}

	// Convert sets → slices
	for s := range symbolSet {
		symbols = append(symbols, s)
	}
	for h := range hintSet {
		// Cap hint length to avoid token blowups
		if len(h) > 300 {
			h = h[:300]
		}
		hints = append(hints, h)
	}

	// Hard cap hints
	if len(hints) > 20 {
		hints = hints[:20]
	}

	return symbols, hints
}
