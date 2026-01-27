package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"doclific/internal/config"
	"doclific/internal/core"
)

// RegisterRoutes registers all API routes using REST conventions
func RegisterRoutes(mux *http.ServeMux) {
	// Health check and update routes
	mux.HandleFunc("GET /api/update/check", handleUpdateCheck)

	// Git routes
	mux.HandleFunc("GET /api/git/repo-info", handleGitGetRepoInfo)

	// Docs routes
	mux.HandleFunc("GET /api/docs", handleDocsGetDocs)
	mux.HandleFunc("GET /api/docs/doc", handleDocsGetDoc)
	mux.HandleFunc("PUT /api/docs/doc", handleDocsUpdateDoc)
	mux.HandleFunc("POST /api/docs", handleDocsCreateDoc)
	mux.HandleFunc("DELETE /api/docs/doc", handleDocsDeleteDoc)
	mux.HandleFunc("PUT /api/docs/order", handleDocsUpdateOrder)

	// Codebase routes
	mux.HandleFunc("GET /api/codebase/folder", handleCodebaseGetFolderContents)
	mux.HandleFunc("GET /api/codebase/file", handleCodebaseGetFileContents)
	mux.HandleFunc("GET /api/codebase/snippet", handleCodebaseGetSnippet)
	mux.HandleFunc("GET /api/codebase/prefix", handleCodebaseGetPrefix)
}

// Git handlers

func handleGitGetRepoInfo(w http.ResponseWriter, r *http.Request) {
	repoName, err := core.GetRepoName()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	repositoryBranch, err := core.GetCurrentBranch()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	user, err := core.GetGitUsername()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	userEmail, err := core.GetGitEmail()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"repositoryName":   repoName,
		"repositoryBranch": repositoryBranch,
		"user":             user,
		"userEmail":        userEmail,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Docs handlers

func handleDocsGetDocs(w http.ResponseWriter, r *http.Request) {
	docs, err := core.GetDocs()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(docs)
}

func handleDocsGetDoc(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")
	if filePath == "" {
		// Try to get from path
		filePath = r.URL.Path[len("/api/docs/"):]
	}

	content, err := core.GetDoc(filePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(content)
}

func handleDocsUpdateDoc(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")
	if filePath == "" {
		filePath = r.URL.Path[len("/api/docs/"):]
	}

	var req struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := core.UpdateDoc(filePath, req.Content); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nil)
}

func handleDocsCreateDoc(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FilePath string  `json:"filePath"`
		Title    string  `json:"title"`
		Icon     *string `json:"icon,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	result, err := core.CreateDoc(req.FilePath, req.Title, req.Icon)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func handleDocsDeleteDoc(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")

	if err := core.DeleteDoc(filePath); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nil)
}

func handleDocsUpdateOrder(w http.ResponseWriter, r *http.Request) {
	var req core.UpdateDocOrderRequestPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := core.UpdateDocOrder(req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(nil)
}

// Codebase handlers

func handleCodebaseGetFolderContents(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")

	contents, err := core.GetFolderContents(filePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(contents)
}

func handleCodebaseGetFileContents(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")
	if filePath == "" {
		http.Error(w, "filePath query parameter is required", http.StatusBadRequest)
		return
	}

	contents, err := core.GetFileContents(filePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fullPath := filepath.Join(cwd, filePath)

	result := map[string]interface{}{
		"contents": contents,
		"fullPath": fullPath,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// extractLinesFromContent extracts lines from content between start and end (1-indexed, inclusive)
func extractLinesFromContent(content string, start, end int) string {
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

func handleCodebaseGetSnippet(w http.ResponseWriter, r *http.Request) {
	filePath := r.URL.Query().Get("filePath")
	if filePath == "" {
		http.Error(w, "filePath query parameter is required", http.StatusBadRequest)
		return
	}

	lineStartStr := r.URL.Query().Get("lineStart")
	lineEndStr := r.URL.Query().Get("lineEnd")
	if lineStartStr == "" || lineEndStr == "" {
		http.Error(w, "lineStart and lineEnd query parameters are required", http.StatusBadRequest)
		return
	}

	lineStart, err := strconv.Atoi(lineStartStr)
	if err != nil {
		http.Error(w, "lineStart must be a valid integer", http.StatusBadRequest)
		return
	}
	lineEnd, err := strconv.Atoi(lineEndStr)
	if err != nil {
		http.Error(w, "lineEnd must be a valid integer", http.StatusBadRequest)
		return
	}

	storedHash := r.URL.Query().Get("contentHash")

	// Get full file contents
	fullContents, err := core.GetFileContents(filePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cwd, err := os.Getwd()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fullPath := filepath.Join(cwd, filePath)

	// If no stored hash, this is a new/initializing snippet
	// Don't do diff adjustments - user selected these lines in the working directory as-is
	if storedHash == "" {
		snippetContent := extractLinesFromContent(fullContents, lineStart, lineEnd)
		currentHash := core.HashContent(snippetContent)
		currentCommit, _ := core.GetCurrentCommit()

		result := map[string]interface{}{
			"contents":       snippetContent,
			"fullPath":       fullPath,
			"lineStart":      lineStart,
			"lineEnd":        lineEnd,
			"baseCommit":     currentCommit,
			"contentHash":    currentHash,
			"needsReview":    false,
			"linesAdjusted":  false,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// First, check if the content at the ORIGINAL lines matches the stored hash
	originalSnippetContent := extractLinesFromContent(fullContents, lineStart, lineEnd)
	originalHash := core.HashContent(originalSnippetContent)
	snippetLength := lineEnd - lineStart

	if storedHash == originalHash {
		// Content matches at original lines - no adjustment needed
		currentCommit, _ := core.GetCurrentCommit()

		result := map[string]interface{}{
			"contents":      originalSnippetContent,
			"fullPath":      fullPath,
			"lineStart":     lineStart,
			"lineEnd":       lineEnd,
			"baseCommit":    currentCommit,
			"contentHash":   originalHash,
			"needsReview":   false,
			"linesAdjusted": false,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Content doesn't match at original lines - search for where it moved
	// Check line ranges shifted up and down (up to 100 lines in each direction)
	currentCommit, _ := core.GetCurrentCommit()
	maxSearchDistance := 100
	totalLines := len(strings.Split(fullContents, "\n"))

	foundLineStart := 0
	foundLineEnd := 0
	foundContent := ""
	found := false

	for offset := 1; offset <= maxSearchDistance && !found; offset++ {
		// Check shifted down (lines added above)
		downStart := lineStart + offset
		downEnd := downStart + snippetLength
		if downEnd <= totalLines {
			downContent := extractLinesFromContent(fullContents, downStart, downEnd)
			downHash := core.HashContent(downContent)
			if storedHash == downHash {
				foundLineStart = downStart
				foundLineEnd = downEnd
				foundContent = downContent
				found = true
				break
			}
		}

		// Check shifted up (lines removed above)
		upStart := lineStart - offset
		upEnd := upStart + snippetLength
		if upStart >= 1 {
			upContent := extractLinesFromContent(fullContents, upStart, upEnd)
			upHash := core.HashContent(upContent)
			if storedHash == upHash {
				foundLineStart = upStart
				foundLineEnd = upEnd
				foundContent = upContent
				found = true
				break
			}
		}
	}

	if found {
		// Found the content at a different position
		result := map[string]interface{}{
			"contents":      foundContent,
			"fullPath":      fullPath,
			"lineStart":     foundLineStart,
			"lineEnd":       foundLineEnd,
			"baseCommit":    currentCommit,
			"contentHash":   storedHash, // Hash matches, so use stored hash
			"needsReview":   false,
			"linesAdjusted": true,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(result)
		return
	}

	// Content not found at any nearby position - it has been modified
	// Return original lines but flag for review
	result := map[string]interface{}{
		"contents":      originalSnippetContent,
		"fullPath":      fullPath,
		"lineStart":     lineStart,
		"lineEnd":       lineEnd,
		"baseCommit":    currentCommit,
		"contentHash":   originalHash,
		"needsReview":   true,
		"linesAdjusted": false,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func handleCodebaseGetPrefix(w http.ResponseWriter, r *http.Request) {
	prefix, err := config.GetConfigValue("DEEPLINK_PREFIX")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"prefix": prefix,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// Update handlers
func handleUpdateCheck(w http.ResponseWriter, r *http.Request) {
	version, err := core.GetCurrentVersion()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	latestVersion, err := core.GetLatestVersion()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	result := map[string]interface{}{
		"currentVersion": version,
		"latestVersion":  latestVersion,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
