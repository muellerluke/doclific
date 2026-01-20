package server

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"

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

	// Codebase routes
	mux.HandleFunc("GET /api/codebase/folder", handleCodebaseGetFolderContents)
	mux.HandleFunc("GET /api/codebase/file", handleCodebaseGetFileContents)
	mux.HandleFunc("GET /api/codebase/prefix", handleCodebaseGetPrefix)

	// AI routes
	mux.HandleFunc("POST /api/ai/generate-rich-text", handleAIGenerateRichText)
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
	if filePath == "" {
		filePath = r.URL.Path[len("/api/docs/"):]
	}

	if err := core.DeleteDoc(filePath); err != nil {
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

// AI handlers
func handleAIGenerateRichText(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Prompt string `json:"prompt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	richText, err := core.GenerateRichText(req.Prompt)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(richText)
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
