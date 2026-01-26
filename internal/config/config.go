package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const (
	ConfigDirName  = ".config"
	ConfigFileName = "config.json"
)

// Config represents the application configuration
type Config struct {
	DeeplinkPrefix string `json:"DEEPLINK_PREFIX,omitempty"`
}

// GetConfigDir returns the configuration directory path (~/.config/doclific)
func GetConfigDir() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}
	return filepath.Join(homeDir, ConfigDirName, "doclific"), nil
}

// GetConfigPath returns the full path to the config file
func GetConfigPath() (string, error) {
	configDir, err := GetConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, ConfigFileName), nil
}

// LoadConfig loads configuration from the config file, merging with environment variables
func LoadConfig() (*Config, error) {
	configPath, err := GetConfigPath()
	if err != nil {
		return nil, err
	}

	cfg := &Config{}

	// Load from file if it exists
	if _, err := os.Stat(configPath); err == nil {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}

		if err := json.Unmarshal(data, cfg); err != nil {
			return nil, fmt.Errorf("failed to parse config file: %w", err)
		}
	}

	// Override with environment variables (env vars take precedence)
	if envVal := os.Getenv("DEEPLINK_PREFIX"); envVal != "" {
		cfg.DeeplinkPrefix = envVal
	}

	return cfg, nil
}

// SaveConfig saves the configuration to the config file
func SaveConfig(cfg *Config) error {
	configPath, err := GetConfigPath()
	if err != nil {
		return err
	}

	// Create config directory if it doesn't exist
	configDir := filepath.Dir(configPath)
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// GetConfigValue returns a configuration value by key
func GetConfigValue(key string) (string, error) {
	cfg, err := LoadConfig()
	if err != nil {
		return "", err
	}

	switch key {
	case "DEEPLINK_PREFIX":
		return cfg.DeeplinkPrefix, nil
	default:
		return "", fmt.Errorf("unknown config key: %s", key)
	}
}

// SetConfigValue sets a configuration value by key and saves it
func SetConfigValue(key, value string) error {
	cfg, err := LoadConfig()
	if err != nil {
		// If config doesn't exist, create a new one
		cfg = &Config{}
	}

	switch key {
	case "DEEPLINK_PREFIX":
		cfg.DeeplinkPrefix = value
	default:
		return fmt.Errorf("unknown config key: %s", key)
	}

	return SaveConfig(cfg)
}
