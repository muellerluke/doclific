package core

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetDocs(t *testing.T) {
	// Test with non-existent doclific folder
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	// Create a temporary directory for testing
	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Test with no doclific folder (should return empty array)
	docs, err := GetDocs()
	if err != nil {
		t.Fatalf("GetDocs() error = %v", err)
	}
	if docs == nil {
		t.Error("GetDocs() returned nil, want empty array")
	}
	if len(docs) != 0 {
		t.Errorf("GetDocs() returned %d docs, want 0", len(docs))
	}

	// Create a doclific folder structure
	doclificDir := filepath.Join(tmpDir, "doclific")
	if err := os.MkdirAll(doclificDir, 0755); err != nil {
		t.Fatalf("failed to create doclific directory: %v", err)
	}

	// Create a test folder with config.json
	testFolder := filepath.Join(doclificDir, "test-folder")
	if err := os.MkdirAll(testFolder, 0755); err != nil {
		t.Fatalf("failed to create test folder: %v", err)
	}

	configJSON := `{"title": "Test Title", "icon": "test-icon"}`
	configPath := filepath.Join(testFolder, "config.json")
	if err := os.WriteFile(configPath, []byte(configJSON), 0644); err != nil {
		t.Fatalf("failed to write config.json: %v", err)
	}

	// Test GetDocs with valid structure
	docs, err = GetDocs()
	if err != nil {
		t.Fatalf("GetDocs() error = %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("GetDocs() returned %d docs, want 1", len(docs))
	}
	if docs[0].Name != "test-folder" {
		t.Errorf("GetDocs() folder name = %q, want %q", docs[0].Name, "test-folder")
	}
	if docs[0].Title != "Test Title" {
		t.Errorf("GetDocs() folder title = %q, want %q", docs[0].Title, "Test Title")
	}
	if docs[0].Icon == nil || *docs[0].Icon != "test-icon" {
		t.Errorf("GetDocs() folder icon = %v, want %q", docs[0].Icon, "test-icon")
	}
}

func TestGetDoc(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create doclific structure
	doclificDir := filepath.Join(tmpDir, "doclific")
	testFolder := filepath.Join(doclificDir, "test-doc")
	if err := os.MkdirAll(testFolder, 0755); err != nil {
		t.Fatalf("failed to create test folder: %v", err)
	}

	// Test with non-existent file (should return empty string)
	content, err := GetDoc("test-doc")
	if err != nil {
		t.Fatalf("GetDoc() error = %v", err)
	}
	if content != "" {
		t.Errorf("GetDoc() with non-existent file = %q, want empty string", content)
	}

	// Create content.mdx file
	expectedContent := "# Test Document\n\nThis is test content."
	contentPath := filepath.Join(testFolder, "content.mdx")
	if err := os.WriteFile(contentPath, []byte(expectedContent), 0644); err != nil {
		t.Fatalf("failed to write content.mdx: %v", err)
	}

	// Test GetDoc with existing file
	content, err = GetDoc("test-doc")
	if err != nil {
		t.Fatalf("GetDoc() error = %v", err)
	}
	if content != expectedContent {
		t.Errorf("GetDoc() = %q, want %q", content, expectedContent)
	}
}

func TestUpdateDoc(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create doclific structure
	doclificDir := filepath.Join(tmpDir, "doclific")
	testFolder := filepath.Join(doclificDir, "test-doc")
	if err := os.MkdirAll(testFolder, 0755); err != nil {
		t.Fatalf("failed to create test folder: %v", err)
	}

	// Test UpdateDoc creates file if it doesn't exist
	newContent := "# Updated Document\n\nThis is updated content."
	err = UpdateDoc("test-doc", newContent)
	if err != nil {
		t.Fatalf("UpdateDoc() error = %v", err)
	}

	// Verify content was written
	contentPath := filepath.Join(testFolder, "content.mdx")
	content, err := os.ReadFile(contentPath)
	if err != nil {
		t.Fatalf("failed to read content.mdx: %v", err)
	}
	if string(content) != newContent {
		t.Errorf("UpdateDoc() wrote %q, want %q", string(content), newContent)
	}

	// Test UpdateDoc updates existing file
	updatedContent := "# Updated Again\n\nNew content."
	err = UpdateDoc("test-doc", updatedContent)
	if err != nil {
		t.Fatalf("UpdateDoc() error = %v", err)
	}

	content, err = os.ReadFile(contentPath)
	if err != nil {
		t.Fatalf("failed to read content.mdx: %v", err)
	}
	if string(content) != updatedContent {
		t.Errorf("UpdateDoc() wrote %q, want %q", string(content), updatedContent)
	}
}

func TestCreateDoc(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create doclific base directory
	doclificDir := filepath.Join(tmpDir, "doclific")
	if err := os.MkdirAll(doclificDir, 0755); err != nil {
		t.Fatalf("failed to create doclific directory: %v", err)
	}

	// Test CreateDoc at root level
	icon := "test-icon"
	response, err := CreateDoc("", "Test Document", &icon)
	if err != nil {
		t.Fatalf("CreateDoc() error = %v", err)
	}
	if response == nil {
		t.Fatal("CreateDoc() returned nil response")
	}
	if response.Title != "Test Document" {
		t.Errorf("CreateDoc() title = %q, want %q", response.Title, "Test Document")
	}
	if response.Icon == nil || *response.Icon != icon {
		t.Errorf("CreateDoc() icon = %v, want %q", response.Icon, icon)
	}
	if response.URL == "" {
		t.Error("CreateDoc() URL is empty")
	}

	// Verify files were created
	if _, err := os.Stat(response.FilePath); os.IsNotExist(err) {
		t.Errorf("CreateDoc() did not create directory at %q", response.FilePath)
	}

	contentPath := filepath.Join(response.FilePath, "content.mdx")
	if _, err := os.Stat(contentPath); os.IsNotExist(err) {
		t.Errorf("CreateDoc() did not create content.mdx at %q", contentPath)
	}

	configPath := filepath.Join(response.FilePath, "config.json")
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Errorf("CreateDoc() did not create config.json at %q", configPath)
	}

	// Verify content.mdx has default content
	content, err := os.ReadFile(contentPath)
	if err != nil {
		t.Fatalf("failed to read content.mdx: %v", err)
	}
	expectedContent := "# Test Document\n"
	if string(content) != expectedContent {
		t.Errorf("CreateDoc() content.mdx = %q, want %q", string(content), expectedContent)
	}

	// Test CreateDoc with nested path
	nestedResponse, err := CreateDoc("parent-folder", "Nested Document", nil)
	if err != nil {
		t.Fatalf("CreateDoc() error = %v", err)
	}
	if nestedResponse.URL == "" {
		t.Error("CreateDoc() URL is empty for nested path")
	}
	if nestedResponse.Icon != nil {
		t.Errorf("CreateDoc() icon = %v, want nil", nestedResponse.Icon)
	}
}

func TestDeleteDoc(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create doclific structure
	doclificDir := filepath.Join(tmpDir, "doclific")
	testFolder := filepath.Join(doclificDir, "test-doc")
	if err := os.MkdirAll(testFolder, 0755); err != nil {
		t.Fatalf("failed to create test folder: %v", err)
	}

	// Create some files in the folder
	contentPath := filepath.Join(testFolder, "content.mdx")
	if err := os.WriteFile(contentPath, []byte("# Test"), 0644); err != nil {
		t.Fatalf("failed to write content.mdx: %v", err)
	}

	// Verify folder exists before deletion
	if _, err := os.Stat(testFolder); os.IsNotExist(err) {
		t.Fatal("test folder should exist before deletion")
	}

	// Test DeleteDoc
	err = DeleteDoc("test-doc")
	if err != nil {
		t.Fatalf("DeleteDoc() error = %v", err)
	}

	// Verify folder was deleted
	if _, err := os.Stat(testFolder); !os.IsNotExist(err) {
		t.Error("DeleteDoc() did not delete the folder")
	}
}

func TestGetDocsWithNestedFolders(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create nested doclific structure
	doclificDir := filepath.Join(tmpDir, "doclific")
	parentFolder := filepath.Join(doclificDir, "parent")
	childFolder := filepath.Join(parentFolder, "child")

	if err := os.MkdirAll(childFolder, 0755); err != nil {
		t.Fatalf("failed to create nested folders: %v", err)
	}

	// Create config.json for parent
	parentConfig := `{"title": "Parent Folder", "icon": "parent-icon"}`
	parentConfigPath := filepath.Join(parentFolder, "config.json")
	if err := os.WriteFile(parentConfigPath, []byte(parentConfig), 0644); err != nil {
		t.Fatalf("failed to write parent config.json: %v", err)
	}

	// Create config.json for child
	childConfig := `{"title": "Child Folder", "icon": "child-icon"}`
	childConfigPath := filepath.Join(childFolder, "config.json")
	if err := os.WriteFile(childConfigPath, []byte(childConfig), 0644); err != nil {
		t.Fatalf("failed to write child config.json: %v", err)
	}

	// Test GetDocs with nested structure
	docs, err := GetDocs()
	if err != nil {
		t.Fatalf("GetDocs() error = %v", err)
	}
	if len(docs) != 1 {
		t.Fatalf("GetDocs() returned %d docs, want 1", len(docs))
	}
	if docs[0].Name != "parent" {
		t.Errorf("GetDocs() parent name = %q, want %q", docs[0].Name, "parent")
	}
	if len(docs[0].Children) != 1 {
		t.Fatalf("GetDocs() parent has %d children, want 1", len(docs[0].Children))
	}
	if docs[0].Children[0].Name != "child" {
		t.Errorf("GetDocs() child name = %q, want %q", docs[0].Children[0].Name, "child")
	}
	if docs[0].Children[0].Title != "Child Folder" {
		t.Errorf("GetDocs() child title = %q, want %q", docs[0].Children[0].Title, "Child Folder")
	}
}
