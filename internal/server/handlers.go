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

	// Get optional snippet tracking parameters
	lineStartStr := r.URL.Query().Get("lineStart")
	lineEndStr := r.URL.Query().Get("lineEnd")
	baseCommit := r.URL.Query().Get("baseCommit")
	storedHash := r.URL.Query().Get("contentHash")

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

	// If snippet tracking params provided, include tracking info in response
	if lineStartStr != "" && lineEndStr != "" {
		lineStart, _ := strconv.Atoi(lineStartStr)
		lineEnd, _ := strconv.Atoi(lineEndStr)

		snippet := core.SnippetInfo{
			FilePath:    filePath,
			LineStart:   lineStart,
			LineEnd:     lineEnd,
			BaseCommit:  baseCommit,
			ContentHash: storedHash,
		}

		validated, err := core.ValidateSnippet(snippet)
		if err != nil {
			// If validation fails, still return content but without tracking info
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(result)
			return
		}

		// Get the current content hash for the (potentially updated) line range
		snippetContent := extractLinesFromContent(contents, validated.LineStart, validated.LineEnd)
		currentHash := core.HashContent(snippetContent)

		// Determine if review is needed: either ValidateSnippet flagged it (commit changed + hash differs)
		// OR the stored hash doesn't match the current hash (content changed in working directory)
		needsReview := validated.NeedsReview
		if storedHash != "" && storedHash != currentHash {
			needsReview = true
		}

		result["newLineStart"] = validated.LineStart
		result["newLineEnd"] = validated.LineEnd
		result["newBaseCommit"] = validated.BaseCommit
		result["newContentHash"] = currentHash
		result["needsReview"] = needsReview
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
