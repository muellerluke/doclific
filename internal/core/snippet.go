package core

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// SnippetInfo holds parsed snippet data from MDX
type SnippetInfo struct {
	FilePath    string
	LineStart   int
	LineEnd     int
	BaseCommit  string
	ContentHash string
	NeedsReview bool
	// Position tracking for MDX updates
	StartPos int
	EndPos   int
}

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

// CodebaseSnippet regex pattern to match the component in MDX
// Matches both self-closing and with children forms
var snippetRegex = regexp.MustCompile(`(?s)<CodebaseSnippet\s+([^>]*?)(?:/>|>\s*</CodebaseSnippet>)`)

// Attribute extraction regex
var attrRegex = regexp.MustCompile(`(\w+)=["']([^"']*)["']`)

// ExtractSnippetsFromMDX parses MDX content and returns all CodebaseSnippet elements
func ExtractSnippetsFromMDX(mdxContent string) ([]SnippetInfo, error) {
	var snippets []SnippetInfo

	matches := snippetRegex.FindAllStringSubmatchIndex(mdxContent, -1)
	for _, match := range matches {
		if len(match) < 4 {
			continue
		}

		fullMatchStart := match[0]
		fullMatchEnd := match[1]
		attrsStr := mdxContent[match[2]:match[3]]

		snippet := SnippetInfo{
			StartPos: fullMatchStart,
			EndPos:   fullMatchEnd,
		}

		// Extract attributes
		attrMatches := attrRegex.FindAllStringSubmatch(attrsStr, -1)
		for _, attr := range attrMatches {
			if len(attr) < 3 {
				continue
			}
			key := attr[1]
			value := attr[2]

			switch key {
			case "filePath":
				snippet.FilePath = value
			case "lineStart":
				if v, err := strconv.Atoi(value); err == nil {
					snippet.LineStart = v
				}
			case "lineEnd":
				if v, err := strconv.Atoi(value); err == nil {
					snippet.LineEnd = v
				}
			case "baseCommit":
				snippet.BaseCommit = value
			case "contentHash":
				snippet.ContentHash = value
			case "needsReview":
				snippet.NeedsReview = value == "true"
			}
		}

		snippets = append(snippets, snippet)
	}

	return snippets, nil
}

// UpdateSnippetInMDX updates a single snippet's attributes in MDX content
// Returns the updated MDX content
func UpdateSnippetInMDX(mdxContent string, original SnippetInfo, updated SnippetInfo) string {
	// Get the original snippet text
	originalText := mdxContent[original.StartPos:original.EndPos]

	// Build the updated snippet text
	updatedText := updateSnippetAttributes(originalText, updated)

	// Replace in content
	return mdxContent[:original.StartPos] + updatedText + mdxContent[original.EndPos:]
}

// updateSnippetAttributes updates or adds attributes to a snippet tag
func updateSnippetAttributes(snippetText string, info SnippetInfo) string {
	// Helper to update or add an attribute
	updateAttr := func(text, key, value string) string {
		pattern := regexp.MustCompile(fmt.Sprintf(`%s=["'][^"']*["']`, key))
		newAttr := fmt.Sprintf(`%s="%s"`, key, value)

		if pattern.MatchString(text) {
			return pattern.ReplaceAllString(text, newAttr)
		}

		// Add the attribute before the closing /> or >
		closingPattern := regexp.MustCompile(`(\s*)(/>|>\s*</CodebaseSnippet>)`)
		return closingPattern.ReplaceAllString(text, fmt.Sprintf(` %s$1$2`, newAttr))
	}

	result := snippetText

	// Update lineStart and lineEnd
	if info.LineStart > 0 {
		result = updateAttr(result, "lineStart", strconv.Itoa(info.LineStart))
	}
	if info.LineEnd > 0 {
		result = updateAttr(result, "lineEnd", strconv.Itoa(info.LineEnd))
	}

	// Update baseCommit
	if info.BaseCommit != "" {
		result = updateAttr(result, "baseCommit", info.BaseCommit)
	}

	// Update contentHash
	if info.ContentHash != "" {
		result = updateAttr(result, "contentHash", info.ContentHash)
	}

	// Update needsReview
	needsReviewStr := "false"
	if info.NeedsReview {
		needsReviewStr = "true"
	}
	result = updateAttr(result, "needsReview", needsReviewStr)

	return result
}

// UpdateAllSnippetsInMDX updates multiple snippets in MDX content
// Snippets should be processed in reverse order to maintain correct positions
func UpdateAllSnippetsInMDX(mdxContent string, originals []SnippetInfo, updates []SnippetInfo) string {
	if len(originals) != len(updates) {
		return mdxContent
	}

	// Process in reverse order to maintain positions
	result := mdxContent
	for i := len(originals) - 1; i >= 0; i-- {
		result = UpdateSnippetInMDX(result, originals[i], updates[i])
	}

	return result
}

// ValidateSnippet checks a snippet against the current codebase state
// Returns updated snippet info with new lines, commit, hash, and needsReview flag
func ValidateSnippet(snippet SnippetInfo) (SnippetInfo, error) {
	updated := snippet

	// Get current commit
	currentCommit, err := GetCurrentCommit()
	if err != nil {
		return updated, fmt.Errorf("failed to get current commit: %w", err)
	}

	// If baseCommit is empty, this is a new snippet - initialize it
	if snippet.BaseCommit == "" {
		updated.BaseCommit = currentCommit

		// Get file contents and generate hash
		content, err := GetFileContents(snippet.FilePath)
		if err != nil {
			return updated, fmt.Errorf("failed to get file contents: %w", err)
		}

		snippetContent := extractLines(content, snippet.LineStart, snippet.LineEnd)
		updated.ContentHash = HashContent(snippetContent)
		updated.NeedsReview = false

		return updated, nil
	}

	// Calculate new line positions using git diff from baseCommit to working directory
	// This captures both committed changes AND uncommitted working directory changes
	newLineStart, newLineEnd, err := CalculateNewLineRangeToWorkingDir(
		snippet.FilePath,
		snippet.BaseCommit,
		snippet.LineStart,
		snippet.LineEnd,
	)
	if err != nil {
		// If diff fails (e.g., file was renamed), keep original lines
		// but still update commit and check hash
		newLineStart = snippet.LineStart
		newLineEnd = snippet.LineEnd
	}

	updated.LineStart = newLineStart
	updated.LineEnd = newLineEnd
	updated.BaseCommit = currentCommit

	// Get current content and hash
	content, err := GetFileContents(snippet.FilePath)
	if err != nil {
		return updated, fmt.Errorf("failed to get file contents: %w", err)
	}

	snippetContent := extractLines(content, newLineStart, newLineEnd)
	newHash := HashContent(snippetContent)

	// Check if content actually changed (ignoring whitespace)
	if snippet.ContentHash != "" && snippet.ContentHash != newHash {
		updated.NeedsReview = true
	}

	// Don't update hash here - only update when user verifies
	// But we need to return what the new hash would be for the API response

	return updated, nil
}

// extractLines extracts lines from content between start and end (1-indexed, inclusive)
func extractLines(content string, start, end int) string {
	lines := strings.Split(content, "\n")

	if start < 1 {
		start = 1
	}
	if end < 1 || end > len(lines) {
		end = len(lines)
	}
	if start > len(lines) {
		return ""
	}

	// Convert to 0-indexed
	startIdx := start - 1
	endIdx := end

	if endIdx > len(lines) {
		endIdx = len(lines)
	}

	return strings.Join(lines[startIdx:endIdx], "\n")
}

// CheckSnippetsResult holds the results of checking all snippets
type CheckSnippetsResult struct {
	FilesScanned   int
	SnippetsFound  int
	LinesUpdated   int
	NeedsReview    []SnippetReviewInfo
	Errors         []string
}

// SnippetReviewInfo holds info about a snippet that needs review
type SnippetReviewInfo struct {
	DocPath   string
	FilePath  string
	LineStart int
	LineEnd   int
}

// CheckSnippets scans all MDX files in the doclific directory and checks snippets
// If fix is true, it will update the MDX files with corrected line numbers
func CheckSnippets(fix bool) (*CheckSnippetsResult, error) {
	result := &CheckSnippetsResult{
		NeedsReview: []SnippetReviewInfo{},
		Errors:      []string{},
	}

	// Get current working directory
	cwd, err := os.Getwd()
	if err != nil {
		return nil, fmt.Errorf("failed to get current working directory: %w", err)
	}

	doclificDir := filepath.Join(cwd, "doclific")

	// Check if doclific directory exists
	if _, err := os.Stat(doclificDir); os.IsNotExist(err) {
		return nil, fmt.Errorf("doclific directory not found; run 'doclific init' first")
	}

	// Find all content.mdx files
	mdxFiles, err := findMDXFiles(doclificDir)
	if err != nil {
		return nil, fmt.Errorf("failed to find MDX files: %w", err)
	}

	result.FilesScanned = len(mdxFiles)

	for _, mdxPath := range mdxFiles {
		// Read the MDX file
		content, err := os.ReadFile(mdxPath)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("failed to read %s: %v", mdxPath, err))
			continue
		}

		mdxContent := string(content)

		// Extract snippets
		snippets, err := ExtractSnippetsFromMDX(mdxContent)
		if err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("failed to parse %s: %v", mdxPath, err))
			continue
		}

		result.SnippetsFound += len(snippets)

		if len(snippets) == 0 {
			continue
		}

		// Validate each snippet and collect updates
		var updatedSnippets []SnippetInfo
		hasChanges := false

		for _, snippet := range snippets {
			validated, err := ValidateSnippet(snippet)
			if err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("failed to validate snippet in %s: %v", mdxPath, err))
				updatedSnippets = append(updatedSnippets, snippet)
				continue
			}

			// Check if lines changed
			if validated.LineStart != snippet.LineStart || validated.LineEnd != snippet.LineEnd {
				result.LinesUpdated++
				hasChanges = true
			}

			// Check if needs review
			if validated.NeedsReview {
				relPath, _ := filepath.Rel(cwd, mdxPath)
				result.NeedsReview = append(result.NeedsReview, SnippetReviewInfo{
					DocPath:   relPath,
					FilePath:  validated.FilePath,
					LineStart: validated.LineStart,
					LineEnd:   validated.LineEnd,
				})
			}

			updatedSnippets = append(updatedSnippets, validated)
		}

		// If fix mode and there are changes, update the file
		if fix && hasChanges {
			updatedContent := UpdateAllSnippetsInMDX(mdxContent, snippets, updatedSnippets)
			if err := os.WriteFile(mdxPath, []byte(updatedContent), 0644); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("failed to write %s: %v", mdxPath, err))
			}
		}
	}

	return result, nil
}

// findMDXFiles recursively finds all content.mdx files in a directory
func findMDXFiles(dir string) ([]string, error) {
	var files []string

	err := filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && info.Name() == "content.mdx" {
			files = append(files, path)
		}

		return nil
	})

	return files, err
}
