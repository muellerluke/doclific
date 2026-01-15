package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetConfigDir(t *testing.T) {
	dir, err := GetConfigDir()
	if err != nil {
		t.Fatalf("GetConfigDir() error = %v", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		t.Fatalf("os.UserHomeDir() error = %v", err)
	}

	expected := filepath.Join(homeDir, ConfigDirName, "doclific")
	if dir != expected {
		t.Errorf("GetConfigDir() = %q, want %q", dir, expected)
	}
}

func TestGetConfigPath(t *testing.T) {
	path, err := GetConfigPath()
	if err != nil {
		t.Fatalf("GetConfigPath() error = %v", err)
	}

	homeDir, err := os.UserHomeDir()
	if err != nil {
		t.Fatalf("os.UserHomeDir() error = %v", err)
	}

	expected := filepath.Join(homeDir, ConfigDirName, "doclific", ConfigFileName)
	if path != expected {
		t.Errorf("GetConfigPath() = %q, want %q", path, expected)
	}
}

func TestGetConfigValue(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	originalHome := os.Getenv("HOME")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		}
	}()

	// Set up a temporary home directory
	testHome := tmpDir
	os.Setenv("HOME", testHome)

	// Test with non-existent config (should return empty string)
	value, err := GetConfigValue("AI_PROVIDER")
	if err != nil {
		t.Fatalf("GetConfigValue() error = %v", err)
	}
	if value != "" {
		t.Errorf("GetConfigValue() = %q, want empty string for non-existent config", value)
	}

	// Test with unknown key
	_, err = GetConfigValue("UNKNOWN_KEY")
	if err == nil {
		t.Error("GetConfigValue() with unknown key should return error")
	}
}

func TestSetConfigValue(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	originalHome := os.Getenv("HOME")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		}
	}()

	// Set up a temporary home directory
	testHome := tmpDir
	os.Setenv("HOME", testHome)

	// Test setting a value
	err := SetConfigValue("AI_PROVIDER", "google")
	if err != nil {
		t.Fatalf("SetConfigValue() error = %v", err)
	}

	// Verify it was set
	value, err := GetConfigValue("AI_PROVIDER")
	if err != nil {
		t.Fatalf("GetConfigValue() error = %v", err)
	}
	if value != "google" {
		t.Errorf("GetConfigValue() = %q, want %q", value, "google")
	}

	// Test setting multiple values
	err = SetConfigValue("GOOGLE_API_KEY", "test-key-123")
	if err != nil {
		t.Fatalf("SetConfigValue() error = %v", err)
	}

	keyValue, err := GetConfigValue("GOOGLE_API_KEY")
	if err != nil {
		t.Fatalf("GetConfigValue() error = %v", err)
	}
	if keyValue != "test-key-123" {
		t.Errorf("GetConfigValue() = %q, want %q", keyValue, "test-key-123")
	}

	// Verify AI_PROVIDER is still set
	value, err = GetConfigValue("AI_PROVIDER")
	if err != nil {
		t.Fatalf("GetConfigValue() error = %v", err)
	}
	if value != "google" {
		t.Errorf("GetConfigValue() = %q, want %q", value, "google")
	}

	// Test with unknown key
	err = SetConfigValue("UNKNOWN_KEY", "value")
	if err == nil {
		t.Error("SetConfigValue() with unknown key should return error")
	}
}

func TestLoadConfig(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	originalHome := os.Getenv("HOME")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		}
	}()

	// Set up a temporary home directory
	testHome := tmpDir
	os.Setenv("HOME", testHome)

	// Test loading non-existent config (should not error, return empty config)
	cfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}
	if cfg == nil {
		t.Fatal("LoadConfig() returned nil config")
	}

	// Test loading after saving
	testCfg := &Config{
		AIProvider:   "google",
		GoogleAPIKey: "test-key",
	}
	err = SaveConfig(testCfg)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	loadedCfg, err := LoadConfig()
	if err != nil {
		t.Fatalf("LoadConfig() error = %v", err)
	}
	if loadedCfg.AIProvider != "google" {
		t.Errorf("LoadConfig() AIProvider = %q, want %q", loadedCfg.AIProvider, "google")
	}
	if loadedCfg.GoogleAPIKey != "test-key" {
		t.Errorf("LoadConfig() GoogleAPIKey = %q, want %q", loadedCfg.GoogleAPIKey, "test-key")
	}
}

func TestSaveConfig(t *testing.T) {
	// Create a temporary config file for testing
	tmpDir := t.TempDir()
	originalHome := os.Getenv("HOME")
	defer func() {
		if originalHome != "" {
			os.Setenv("HOME", originalHome)
		}
	}()

	// Set up a temporary home directory
	testHome := tmpDir
	os.Setenv("HOME", testHome)

	cfg := &Config{
		AIProvider:   "google",
		AIModel:      "gemini-3-flash-preview",
		GoogleAPIKey: "test-api-key",
	}

	err := SaveConfig(cfg)
	if err != nil {
		t.Fatalf("SaveConfig() error = %v", err)
	}

	// Verify file was created
	configPath, err := GetConfigPath()
	if err != nil {
		t.Fatalf("GetConfigPath() error = %v", err)
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		t.Errorf("SaveConfig() did not create config file at %q", configPath)
	}
}
