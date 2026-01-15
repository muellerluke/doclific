package core

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCreateDoclificFolder(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Test creating doclific folder
	err = CreateDoclificFolder()
	if err != nil {
		t.Fatalf("CreateDoclificFolder() error = %v", err)
	}

	// Verify folder was created
	doclificPath := filepath.Join(tmpDir, "doclific")
	if _, err := os.Stat(doclificPath); os.IsNotExist(err) {
		t.Errorf("CreateDoclificFolder() did not create folder at %q", doclificPath)
	}

	// Test creating again (should not error)
	err = CreateDoclificFolder()
	if err != nil {
		t.Fatalf("CreateDoclificFolder() error on second call = %v", err)
	}
}

func TestGetFolderContents(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create test files and directories
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("test content"), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	testDir := filepath.Join(tmpDir, "testdir")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		t.Fatalf("failed to create test directory: %v", err)
	}

	nestedFile := filepath.Join(testDir, "nested.txt")
	if err := os.WriteFile(nestedFile, []byte("nested content"), 0644); err != nil {
		t.Fatalf("failed to create nested file: %v", err)
	}

	// Test GetFolderContents with empty path (current directory)
	contents, err := GetFolderContents("")
	if err != nil {
		t.Fatalf("GetFolderContents() error = %v", err)
	}

	if len(contents) < 2 {
		t.Fatalf("GetFolderContents() returned %d items, want at least 2", len(contents))
	}

	// Verify files and directories are present
	foundFile := false
	foundDir := false
	for _, node := range contents {
		if node.Name == "test.txt" && node.Type == "file" {
			foundFile = true
			if !strings.Contains(node.Path, "test.txt") {
				t.Errorf("GetFolderContents() file path = %q, should contain test.txt", node.Path)
			}
		}
		if node.Name == "testdir" && node.Type == "directory" {
			foundDir = true
			if !strings.Contains(node.Path, "testdir") {
				t.Errorf("GetFolderContents() directory path = %q, should contain testdir", node.Path)
			}
		}
	}

	if !foundFile {
		t.Error("GetFolderContents() did not find test.txt file")
	}
	if !foundDir {
		t.Error("GetFolderContents() did not find testdir directory")
	}

	// Test GetFolderContents with specific path
	contents, err = GetFolderContents("testdir")
	if err != nil {
		t.Fatalf("GetFolderContents() error = %v", err)
	}

	if len(contents) != 1 {
		t.Fatalf("GetFolderContents() returned %d items, want 1", len(contents))
	}

	if contents[0].Name != "nested.txt" {
		t.Errorf("GetFolderContents() name = %q, want %q", contents[0].Name, "nested.txt")
	}
	if contents[0].Type != "file" {
		t.Errorf("GetFolderContents() type = %q, want %q", contents[0].Type, "file")
	}
}

func TestGetFileContents(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create test file
	expectedContent := "This is test file content\nLine 2\nLine 3"
	testFile := filepath.Join(tmpDir, "test.txt")
	if err := os.WriteFile(testFile, []byte(expectedContent), 0644); err != nil {
		t.Fatalf("failed to create test file: %v", err)
	}

	// Test GetFileContents
	content, err := GetFileContents("test.txt")
	if err != nil {
		t.Fatalf("GetFileContents() error = %v", err)
	}

	if content != expectedContent {
		t.Errorf("GetFileContents() = %q, want %q", content, expectedContent)
	}

	// Test with nested path
	nestedDir := filepath.Join(tmpDir, "nested")
	if err := os.MkdirAll(nestedDir, 0755); err != nil {
		t.Fatalf("failed to create nested directory: %v", err)
	}

	nestedFile := filepath.Join(nestedDir, "nested.txt")
	nestedContent := "Nested file content"
	if err := os.WriteFile(nestedFile, []byte(nestedContent), 0644); err != nil {
		t.Fatalf("failed to create nested file: %v", err)
	}

	content, err = GetFileContents("nested/nested.txt")
	if err != nil {
		t.Fatalf("GetFileContents() error = %v", err)
	}

	if content != nestedContent {
		t.Errorf("GetFileContents() = %q, want %q", content, nestedContent)
	}

	// Test with non-existent file
	_, err = GetFileContents("nonexistent.txt")
	if err == nil {
		t.Error("GetFileContents() with non-existent file should return error")
	}
}

func TestGetFlatFileList(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create test directory structure
	// tmpDir/
	//   file1.txt
	//   file2.go
	//   dir1/
	//     file3.txt
	//     dir2/
	//       file4.txt
	//   .git/
	//     config (should be ignored)

	file1 := filepath.Join(tmpDir, "file1.txt")
	os.WriteFile(file1, []byte("content"), 0644)

	file2 := filepath.Join(tmpDir, "file2.go")
	os.WriteFile(file2, []byte("package main"), 0644)

	dir1 := filepath.Join(tmpDir, "dir1")
	os.MkdirAll(dir1, 0755)

	file3 := filepath.Join(dir1, "file3.txt")
	os.WriteFile(file3, []byte("content"), 0644)

	dir2 := filepath.Join(dir1, "dir2")
	os.MkdirAll(dir2, 0755)

	file4 := filepath.Join(dir2, "file4.txt")
	os.WriteFile(file4, []byte("content"), 0644)

	// Create .git directory (should be ignored)
	gitDir := filepath.Join(tmpDir, ".git")
	os.MkdirAll(gitDir, 0755)
	gitConfig := filepath.Join(gitDir, "config")
	os.WriteFile(gitConfig, []byte("git config"), 0644)

	// Test GetFlatFileList
	fileList, err := GetFlatFileList("", nil, "", nil)
	if err != nil {
		t.Fatalf("GetFlatFileList() error = %v", err)
	}

	// Verify files are in the list
	foundFile1 := false
	foundFile2 := false
	foundFile3 := false
	foundFile4 := false
	foundDir1 := false
	foundDir2 := false
	foundGit := false

	for _, file := range fileList {
		if strings.Contains(file, "file1.txt") {
			foundFile1 = true
		}
		if strings.Contains(file, "file2.go") {
			foundFile2 = true
		}
		if strings.Contains(file, "dir1/file3.txt") {
			foundFile3 = true
		}
		if strings.Contains(file, "dir1/dir2/file4.txt") {
			foundFile4 = true
		}
		if strings.Contains(file, "dir1/") && strings.HasSuffix(file, "/") {
			foundDir1 = true
		}
		if strings.Contains(file, "dir1/dir2/") && strings.HasSuffix(file, "/") {
			foundDir2 = true
		}
		if strings.Contains(file, ".git") {
			foundGit = true
		}
	}

	if !foundFile1 {
		t.Error("GetFlatFileList() did not find file1.txt")
	}
	if !foundFile2 {
		t.Error("GetFlatFileList() did not find file2.go")
	}
	if !foundFile3 {
		t.Error("GetFlatFileList() did not find dir1/file3.txt")
	}
	if !foundFile4 {
		t.Error("GetFlatFileList() did not find dir1/dir2/file4.txt")
	}
	if !foundDir1 {
		t.Error("GetFlatFileList() did not find dir1/ directory")
	}
	if !foundDir2 {
		t.Error("GetFlatFileList() did not find dir1/dir2/ directory")
	}
	if foundGit {
		t.Error("GetFlatFileList() should not include .git directory")
	}
}

func TestGetFlatFileListWithGitignore(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create .gitignore file
	gitignoreContent := "*.log\nnode_modules/\n*.tmp"
	gitignorePath := filepath.Join(tmpDir, ".gitignore")
	if err := os.WriteFile(gitignorePath, []byte(gitignoreContent), 0644); err != nil {
		t.Fatalf("failed to create .gitignore: %v", err)
	}

	// Create files that should be ignored
	logFile := filepath.Join(tmpDir, "app.log")
	os.WriteFile(logFile, []byte("log content"), 0644)

	tmpFile := filepath.Join(tmpDir, "temp.tmp")
	os.WriteFile(tmpFile, []byte("temp content"), 0644)

	nodeModules := filepath.Join(tmpDir, "node_modules")
	os.MkdirAll(nodeModules, 0755)
	nodeFile := filepath.Join(nodeModules, "package.json")
	os.WriteFile(nodeFile, []byte("{}"), 0644)

	// Create files that should NOT be ignored
	normalFile := filepath.Join(tmpDir, "normal.txt")
	os.WriteFile(normalFile, []byte("normal content"), 0644)

	// Test GetFlatFileList with gitignore
	fileList, err := GetFlatFileList("", nil, "", nil)
	if err != nil {
		t.Fatalf("GetFlatFileList() error = %v", err)
	}

	// Verify ignored files are not in the list
	foundLog := false
	foundTmp := false
	foundNodeModules := false
	foundNormal := false

	for _, file := range fileList {
		if strings.Contains(file, "app.log") {
			foundLog = true
		}
		if strings.Contains(file, "temp.tmp") {
			foundTmp = true
		}
		if strings.Contains(file, "node_modules") {
			foundNodeModules = true
		}
		if strings.Contains(file, "normal.txt") {
			foundNormal = true
		}
	}

	if foundLog {
		t.Error("GetFlatFileList() should ignore *.log files")
	}
	if foundTmp {
		t.Error("GetFlatFileList() should ignore *.tmp files")
	}
	if foundNodeModules {
		t.Error("GetFlatFileList() should ignore node_modules/ directory")
	}
	if !foundNormal {
		t.Error("GetFlatFileList() should include normal.txt")
	}
}

func TestGetFlatFileListWithSubdirectory(t *testing.T) {
	originalDir, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get current directory: %v", err)
	}

	tmpDir := t.TempDir()
	if err := os.Chdir(tmpDir); err != nil {
		t.Fatalf("failed to change directory: %v", err)
	}
	defer os.Chdir(originalDir)

	// Create nested structure
	subDir := filepath.Join(tmpDir, "subdir")
	os.MkdirAll(subDir, 0755)

	subFile := filepath.Join(subDir, "subfile.txt")
	os.WriteFile(subFile, []byte("content"), 0644)

	// Test GetFlatFileList with specific directory
	fileList, err := GetFlatFileList(subDir, nil, tmpDir, nil)
	if err != nil {
		t.Fatalf("GetFlatFileList() error = %v", err)
	}

	// Verify subdirectory file is in the list with correct relative path
	foundSubFile := false
	for _, file := range fileList {
		if strings.Contains(file, "subfile.txt") {
			foundSubFile = true
			// Path should be relative to baseDir (tmpDir)
			if !strings.Contains(file, "subdir/subfile.txt") {
				t.Errorf("GetFlatFileList() path = %q, should contain subdir/subfile.txt", file)
			}
		}
	}

	if !foundSubFile {
		t.Error("GetFlatFileList() did not find subfile.txt")
	}
}
